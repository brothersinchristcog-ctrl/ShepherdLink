import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Association, Pastor, AssociationEvent, PrayerRequest } from '../types';
import {
  INITIAL_ASSOCIATIONS,
  INITIAL_PASTORS,
  INITIAL_EVENTS,
  INITIAL_PRAYERS,
} from '../data/mockData';

export const FirestoreService = {
  /**
   * Automatically seed multi-association starter data into Cloud Firestore
   */
  async seedMultiAssociationData(): Promise<{ success: boolean; message: string }> {
    if (!db) {
      return { success: false, message: 'Database is not initialized' };
    }

    try {
      console.log('🌱 Starting multi-association Firestore seeding...');

      // 1. Seed Associations
      for (const assoc of INITIAL_ASSOCIATIONS) {
        await setDoc(doc(db, 'associations', assoc.id), assoc, { merge: true });
      }

      // 2. Seed Pastors
      for (const pastor of INITIAL_PASTORS) {
        await setDoc(doc(db, 'pastors', pastor.id), pastor, { merge: true });
      }

      // 3. Seed Events
      for (const event of INITIAL_EVENTS) {
        await setDoc(doc(db, 'events', event.id), event, { merge: true });
      }

      // 4. Seed Prayers
      for (const prayer of INITIAL_PRAYERS) {
        await setDoc(doc(db, 'prayers', prayer.id), prayer, { merge: true });
      }

      console.log('✅ Multi-association Firestore seeding completed successfully!');
      return { success: true, message: 'Seeded initial associations and pastors into Firestore!' };
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('❌ Firestore seeding error:', err);
      return { success: false, message: err.message || 'Seeding failed' };
    }
  },

  /**
   * Fetch all registered Pastors Associations
   */
  async getAssociations(): Promise<Association[]> {
    if (!db) return INITIAL_ASSOCIATIONS;

    try {
      const snap = await getDocs(collection(db, 'associations'));
      if (snap.empty) {
        // Auto-seed if empty
        await this.seedMultiAssociationData();
        return INITIAL_ASSOCIATIONS;
      }
      return snap.docs.map((d) => d.data() as Association);
    } catch (error) {
      console.warn('⚠️ Falling back to local associations:', error);
      return INITIAL_ASSOCIATIONS;
    }
  },

  /**
   * Fetch pastors belonging to a specific association
   * Enforces: "One pastor belongs to one association"
   */
  async getPastorsForAssociation(associationId: string): Promise<Pastor[]> {
    if (!db) {
      return INITIAL_PASTORS.filter((p) => p.associationId === associationId);
    }

    try {
      const q = query(collection(db, 'pastors'), where('associationId', '==', associationId));
      const snap = await getDocs(q);
      if (snap.empty) {
        return INITIAL_PASTORS.filter((p) => p.associationId === associationId);
      }
      return snap.docs.map((d) => d.data() as Pastor);
    } catch (error) {
      console.warn('⚠️ Falling back to local pastors:', error);
      return INITIAL_PASTORS.filter((p) => p.associationId === associationId);
    }
  },

  /**
   * Fetch events: private events for this association + public events from all associations
   */
  async getEventsForAssociation(associationId: string): Promise<AssociationEvent[]> {
    if (!db) {
      return INITIAL_EVENTS.filter(
        (e) => e.associationId === associationId || e.scope === 'public'
      );
    }

    try {
      const snap = await getDocs(collection(db, 'events'));
      if (snap.empty) {
        return INITIAL_EVENTS.filter(
          (e) => e.associationId === associationId || e.scope === 'public'
        );
      }
      const allEvents = snap.docs.map((d) => d.data() as AssociationEvent);
      return allEvents.filter(
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
      const snap = await getDocs(collection(db, 'prayers'));
      if (snap.empty) {
        return INITIAL_PRAYERS.filter(
          (p) => p.associationId === associationId || p.isGlobal
        );
      }
      const allPrayers = snap.docs.map((d) => d.data() as PrayerRequest);
      return allPrayers.filter(
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
   */
  async getAllPastors(): Promise<Pastor[]> {
    if (!db) return INITIAL_PASTORS;
    try {
      const snap = await getDocs(collection(db, 'pastors'));
      if (snap.empty) {
        return INITIAL_PASTORS;
      }
      return snap.docs.map((d) => d.data() as Pastor);
    } catch (error) {
      console.warn('⚠️ Falling back to local pastors list:', error);
      return INITIAL_PASTORS;
    }
  },

  /**
   * Save or register a new pastor into Cloud Firestore
   */
  async savePastor(pastor: Pastor): Promise<boolean> {
    if (!db) return true;
    try {
      await setDoc(doc(db, 'pastors', pastor.id), pastor, { merge: true });
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
      await setDoc(doc(db, 'join_requests', request.id), request, { merge: true });
      return true;
    } catch (error) {
      console.error('❌ Failed to save join request to Firestore:', error);
      return false;
    }
  },
};
