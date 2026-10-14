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
};
