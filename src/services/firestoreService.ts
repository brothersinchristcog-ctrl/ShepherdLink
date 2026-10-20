import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Association, Pastor, AssociationEvent, PrayerRequest, DonationRecord } from '../types';
import {
  INITIAL_ASSOCIATIONS,
  INITIAL_PASTORS,
  INITIAL_EVENTS,
  INITIAL_PRAYERS,
} from '../data/mockData';

export const FirestoreService = {
  /**
   * Fetch all registered Pastors Associations
   */
  async getAssociations(): Promise<Association[]> {
    if (!db) return [];

    try {
      const snap = await getDocs(collection(db, 'associations'));
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Association);
    } catch (error) {
      console.warn('⚠️ Falling back to empty associations:', error);
      return [];
    }
  },

  /**
   * Fetch pastors belonging to a specific association
   * Priority: /associations/{associationId}/pastors subcollection
   * Fallback: root /pastors collection
   */
  async getPastorsForAssociation(associationId: string): Promise<Pastor[]> {
    if (!db) {
      return INITIAL_PASTORS.filter((p) => p.associationId === associationId);
    }

    try {
      const pastorMap = new Map<string, Pastor>();

      // 1. Check association subcollection: /associations/{associationId}/pastors
      try {
        const subSnap = await getDocs(collection(db, 'associations', associationId, 'pastors'));
        subSnap.docs.forEach((d) => {
          const p = d.data() as Pastor;
          if (p && p.id) pastorMap.set(p.id, p);
        });
      } catch (err) {
        console.warn('Could not read association pastors subcollection:', err);
      }

      // 2. Fallback: check root pastors collection
      try {
        const q = query(collection(db, 'pastors'), where('associationId', '==', associationId));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          const p = d.data() as Pastor;
          if (p && p.id && !pastorMap.has(p.id)) {
            pastorMap.set(p.id, p);
          }
        });
      } catch (err) {
        console.warn('Could not query root pastors:', err);
      }

      if (pastorMap.size > 0) {
        return Array.from(pastorMap.values());
      }

      return INITIAL_PASTORS.filter((p) => p.associationId === associationId);
    } catch (error) {
      console.warn('⚠️ Falling back to local pastors:', error);
      return INITIAL_PASTORS.filter((p) => p.associationId === associationId);
    }
  },

  /**
   * Fetch events: association subcollection + root public events
   */
  async getEventsForAssociation(associationId: string): Promise<AssociationEvent[]> {
    if (!db) {
      return INITIAL_EVENTS.filter(
        (e) => e.associationId === associationId || e.scope === 'public'
      );
    }

    try {
      const eventMap = new Map<string, AssociationEvent>();

      // 1. Check association subcollection: /associations/{associationId}/events
      try {
        const subSnap = await getDocs(collection(db, 'associations', associationId, 'events'));
        subSnap.docs.forEach((d) => {
          const ev = d.data() as AssociationEvent;
          if (ev && ev.id) eventMap.set(ev.id, ev);
        });
      } catch (err) {
        console.warn('Could not fetch events subcollection:', err);
      }

      // 2. Check root events collection for public or matching events
      try {
        const snap = await getDocs(collection(db, 'events'));
        snap.docs.forEach((d) => {
          const ev = d.data() as AssociationEvent;
          if (ev && ev.id && (ev.associationId === associationId || ev.scope === 'public')) {
            if (!eventMap.has(ev.id)) eventMap.set(ev.id, ev);
          }
        });
      } catch (err) {
        console.warn('Could not fetch root events:', err);
      }

      if (eventMap.size > 0) {
        return Array.from(eventMap.values());
      }

      return INITIAL_EVENTS.filter(
        (e) => e.associationId === associationId || e.scope === 'public'
      );
    } catch (error) {
      console.warn('⚠️ Falling back to local events:', error);
      return INITIAL_EVENTS.filter(
        (e) => e.associationId === associationId || e.scope === 'public'
      );
    }
  },

  /**
   * Fetch prayers: internal association prayers + global prayer requests
   */
  async getPrayers(associationId: string): Promise<PrayerRequest[]> {
    if (!db) {
      return INITIAL_PRAYERS.filter(
        (p) => p.associationId === associationId || p.isGlobal
      );
    }

    try {
      const prayerMap = new Map<string, PrayerRequest>();

      // 1. Check association subcollection: /associations/{associationId}/prayers
      try {
        const subSnap = await getDocs(collection(db, 'associations', associationId, 'prayers'));
        subSnap.docs.forEach((d) => {
          const pr = d.data() as PrayerRequest;
          if (pr && pr.id) prayerMap.set(pr.id, pr);
        });
      } catch (err) {
        console.warn('Could not fetch prayers subcollection:', err);
      }

      // 2. Check root prayers collection
      try {
        const snap = await getDocs(collection(db, 'prayers'));
        snap.docs.forEach((d) => {
          const pr = d.data() as PrayerRequest;
          if (pr && pr.id && (pr.associationId === associationId || pr.isGlobal)) {
            if (!prayerMap.has(pr.id)) prayerMap.set(pr.id, pr);
          }
        });
      } catch (err) {
        console.warn('Could not fetch root prayers:', err);
      }

      if (prayerMap.size > 0) {
        return Array.from(prayerMap.values());
      }

      return INITIAL_PRAYERS.filter(
        (p) => p.associationId === associationId || p.isGlobal
      );
    } catch (error) {
      console.warn('⚠️ Falling back to local prayers:', error);
      return INITIAL_PRAYERS.filter(
        (p) => p.associationId === associationId || p.isGlobal
      );
    }
  },

  /**
   * Fetch all registered pastors across all associations
   * Checks all association subcollections /associations/{assocId}/pastors and root pastors
   */
  async getAllPastors(): Promise<Pastor[]> {
    if (!db) return INITIAL_PASTORS;
    const firestoreDb = db;
    try {
      const pastorMap = new Map<string, Pastor>();

      // 1. Fetch from root pastors collection
      try {
        const snap = await getDocs(collection(firestoreDb, 'pastors'));
        snap.docs.forEach((d) => {
          const p = d.data() as Pastor;
          if (p && p.id) pastorMap.set(p.id, p);
        });
      } catch (err) {
        console.warn('Could not read root pastors:', err);
      }

      // 2. Fetch from all associations' /pastors subcollections
      try {
        const assocSnap = await getDocs(collection(firestoreDb, 'associations'));
        const subPromises = assocSnap.docs.map(async (assocDoc) => {
          try {
            const subSnap = await getDocs(collection(firestoreDb, 'associations', assocDoc.id, 'pastors'));
            subSnap.docs.forEach((d) => {
              const p = d.data() as Pastor;
              if (p && p.id) pastorMap.set(p.id, p);
            });
          } catch (subErr) {
            console.warn(`Could not read pastors for assoc ${assocDoc.id}:`, subErr);
          }
        });
        await Promise.all(subPromises);
      } catch (err) {
        console.warn('Could not enumerate associations for pastors:', err);
      }

      if (pastorMap.size > 0) {
        return Array.from(pastorMap.values());
      }

      return INITIAL_PASTORS;
    } catch (error) {
      console.warn('⚠️ Falling back to local pastors list:', error);
      return INITIAL_PASTORS;
    }
  },

  /**
   * Save or register a new pastor into Cloud Firestore
   * Saves directly under the association subcollection: /associations/{associationId}/pastors/{pastorId}
   * and also synchronizes to root /pastors/{pastorId}
   */
  async savePastor(pastor: Pastor): Promise<boolean> {
    if (!db) return true;
    try {
      const promises: Promise<void>[] = [];

      // 1. Store directly under the association document subcollection
      if (pastor.associationId) {
        promises.push(
          setDoc(doc(db, 'associations', pastor.associationId, 'pastors', pastor.id), pastor, {
            merge: true,
          })
        );
      }

      // 2. Synchronize to root /pastors collection
      promises.push(
        setDoc(doc(db, 'pastors', pastor.id), pastor, { merge: true })
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to save pastor to Firestore:', error);
      return false;
    }
  },

  /**
   * Save or register a new association into Cloud Firestore
   */
  async saveAssociation(assoc: Association): Promise<boolean> {
    if (!db) return true;
    try {
      await setDoc(doc(db, 'associations', assoc.id), assoc, { merge: true });
      return true;
    } catch (error) {
      console.error('❌ Failed to save association to Firestore:', error);
      return false;
    }
  },

  /**
   * Lookup association by its unique code (case-insensitive)
   */
  async getAssociationByCode(code: string): Promise<Association | null> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return null;

    if (!db) {
      const found = INITIAL_ASSOCIATIONS.find((a) => a.code.toUpperCase() === cleanCode);
      return found || null;
    }

    try {
      const q = query(collection(db, 'associations'), where('code', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as Association;
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Error searching association by code:', error);
      return null;
    }
  },

  /**
   * Increment member count of an association
   */
  async incrementAssociationMemberCount(associationId: string): Promise<void> {
    if (!db) return;
    try {
      const assocRef = doc(db, 'associations', associationId);
      const snap = await getDocs(query(collection(db, 'associations'), where('id', '==', associationId)));
      if (!snap.empty) {
        const curData = snap.docs[0].data() as Association;
        await setDoc(assocRef, { memberCount: (curData.memberCount || 0) + 1 }, { merge: true });
      }
    } catch (error) {
      console.warn('Could not increment member count:', error);
    }
  },

  /**
   * Save a request to join an association
   * Stored under the association subcollection: /associations/{associationId}/join_requests/{requestId}
   */
  async saveJoinRequest(request: {
    id: string;
    name: string;
    phone: string;
    churchName: string;
    associationId: string;
    associationName: string;
    mandal: string;
    district: string;
    denomination: string;
    status: 'PENDING' | 'APPROVED';
    createdAt: string;
  }): Promise<boolean> {
    if (!db) return true;
    try {
      const promises: Promise<void>[] = [];
      if (request.associationId) {
        promises.push(
          setDoc(doc(db, 'associations', request.associationId, 'join_requests', request.id), request, { merge: true })
        );
      }
      promises.push(
        setDoc(doc(db, 'join_requests', request.id), request, { merge: true })
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to save join request to Firestore:', error);
      return false;
    }
  },

  /**
   * Save an association event to Firestore
   * Stored under the association subcollection: /associations/{associationId}/events/{eventId}
   */
  async saveEvent(event: AssociationEvent): Promise<boolean> {
    if (!db) return true;
    try {
      const promises: Promise<void>[] = [];
      if (event.associationId) {
        promises.push(
          setDoc(doc(db, 'associations', event.associationId, 'events', event.id), event, { merge: true })
        );
      }
      promises.push(
        setDoc(doc(db, 'events', event.id), event, { merge: true })
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to save event to Firestore:', error);
      return false;
    }
  },

  /**
   * Delete an association event from Firestore
   */
  async deleteEvent(eventId: string, associationId?: string): Promise<boolean> {
    if (!db) return true;
    try {
      const promises: Promise<void>[] = [];
      if (associationId) {
        promises.push(deleteDoc(doc(db, 'associations', associationId, 'events', eventId)));
      }
      promises.push(deleteDoc(doc(db, 'events', eventId)));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete event from Firestore:', error);
      return false;
    }
  },

  /**
   * Save a prayer request to Firestore
   * Stored under the association subcollection: /associations/{associationId}/prayers/{prayerId}
   */
  async savePrayer(prayer: PrayerRequest): Promise<boolean> {
    if (!db) return true;
    try {
      const promises: Promise<void>[] = [];
      if (prayer.associationId) {
        promises.push(
          setDoc(doc(db, 'associations', prayer.associationId, 'prayers', prayer.id), prayer, { merge: true })
        );
      }
      promises.push(
        setDoc(doc(db, 'prayers', prayer.id), prayer, { merge: true })
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to save prayer to Firestore:', error);
      return false;
    }
  },

  /**
   * Delete a prayer request from Firestore
   */
  async deletePrayer(prayerId: string, associationId?: string): Promise<boolean> {
    if (!db) return true;
    try {
      const promises: Promise<void>[] = [];
      if (associationId) {
        promises.push(deleteDoc(doc(db, 'associations', associationId, 'prayers', prayerId)));
      }
      promises.push(deleteDoc(doc(db, 'prayers', prayerId)));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete prayer from Firestore:', error);
      return false;
    }
  },

  /**
   * Save a donation record to Firestore
   * Stored under the association subcollection: /associations/{associationId}/donations/{donationId}
   */
  async saveDonation(donation: DonationRecord): Promise<boolean> {
    if (!db) return true;
    try {
      const promises: Promise<void>[] = [];
      if (donation.associationId) {
        promises.push(
          setDoc(doc(db, 'associations', donation.associationId, 'donations', donation.id), donation, { merge: true })
        );
      }
      promises.push(
        setDoc(doc(db, 'donations', donation.id), donation, { merge: true })
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to save donation to Firestore:', error);
      return false;
    }
  },

  /**
   * Fetch donations belonging to a specific association
   * Priority: /associations/{associationId}/donations subcollection
   */
  async getDonationsForAssociation(associationId: string): Promise<DonationRecord[]> {
    if (!db) return [];
    try {
      const donationMap = new Map<string, DonationRecord>();

      // 1. Check association subcollection: /associations/{associationId}/donations
      try {
        const subSnap = await getDocs(collection(db, 'associations', associationId, 'donations'));
        subSnap.docs.forEach((d) => {
          const dn = d.data() as DonationRecord;
          if (dn && dn.id) donationMap.set(dn.id, dn);
        });
      } catch (err) {
        console.warn('Could not fetch donations subcollection:', err);
      }

      // 2. Check root donations
      try {
        const q = query(collection(db, 'donations'), where('associationId', '==', associationId));
        const rootSnap = await getDocs(q);
        rootSnap.docs.forEach((d) => {
          const dn = d.data() as DonationRecord;
          if (dn && dn.id && !donationMap.has(dn.id)) {
            donationMap.set(dn.id, dn);
          }
        });
      } catch (err) {
        console.warn('Could not fetch root donations:', err);
      }

      return Array.from(donationMap.values());
    } catch (error) {
      console.warn('⚠️ Could not fetch donations from Firestore:', error);
      return [];
    }
  },

  /**
   * Fetch custom denominations added across associations
   */
  async getDenominations(): Promise<string[]> {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'denominations'));
      if (snap.empty) return [];
      return snap.docs.map((d) => (d.data() as { name: string }).name).filter(Boolean);
    } catch (error) {
      console.warn('⚠️ Could not fetch denominations from Firestore:', error);
      return [];
    }
  },

  /**
   * Save a new denomination to Firestore
   */
  async saveDenomination(name: string): Promise<boolean> {
    if (!db) return true;
    try {
      const cleanId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await setDoc(
        doc(db, 'denominations', cleanId),
        {
          name: name.trim(),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to save denomination to Firestore:', error);
      return false;
    }
  },
};
