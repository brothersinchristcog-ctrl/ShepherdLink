import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ScreenName,
  TabName,
  Association,
  Pastor,
  AssociationEvent,
  PrayerRequest,
  Notice,
  DonationRecord,
} from '../types';
import {
  INITIAL_ASSOCIATIONS,
  INITIAL_PASTORS,
  INITIAL_EVENTS,
  INITIAL_PRAYERS,
  INITIAL_NOTICES,
  INITIAL_DONATIONS,
} from '../data/mockData';
import { FirestoreService } from '../services/firestoreService';

interface AppContextType {
  // Navigation & screens
  currentScreen: ScreenName;
  activeTab: TabName;
  navigateTo: (screen: ScreenName) => void;
  showPrototypePicker: boolean;
  togglePrototypePicker: () => void;

  // Multi-Association support
  associations: Association[];
  currentAssociation: Association;
  switchAssociation: (associationId: string) => void;

  // Current logged in user info
  currentUser: {
    name: string;
    role: string;
    association: string;
    associationId: string;
    district: string;
    state: string;
    country: string;
    memberCount: number;
  };
  isLoggedIn: boolean;
  loginWithPhone: (phoneNumber: string) => void;
  logout: () => void;

  // Language
  language: string;
  setLanguage: (lang: string) => void;

  // Directory & Profile
  pastors: Pastor[];
  selectedPastor: Pastor;
  selectPastor: (pastor: Pastor) => void;

  // Events & RSVP
  events: AssociationEvent[];
  selectedEvent: AssociationEvent | null;
  selectEventForAttendance: (event: AssociationEvent) => void;
  toggleRSVP: (eventId: string, rsvpType: 'going' | 'maybe') => void;
  addEvent: (newEvent: Omit<AssociationEvent, 'id' | 'rsvp' | 'associationId'>) => void;

  // Prayers
  prayers: PrayerRequest[];
  togglePrayer: (prayerId: string) => void;
  addPrayer: (text: string, tag: 'HEALTH' | 'MINISTRY' | 'FAMILY' | 'CHURCH', leadersOnly: boolean) => void;

  // Attendance
  attendanceMap: Record<string, boolean>;
  toggleAttendance: (pastorId: string) => void;
  markAllAttendance: (present: boolean) => void;

  // Donations
  donations: DonationRecord[];
  addDonation: (purpose: string, amount: number, anonymous: boolean) => void;

  // Notices
  notices: Notice[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TAB_MAP: Record<ScreenName, TabName> = {
  login: 'home',
  home: 'home',
  directory: 'directory',
  profile: 'directory',
  events: 'events',
  create: 'events',
  attendance: 'events',
  prayer: 'prayer',
  donate: 'home',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('login');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showPrototypePicker, setShowPrototypePicker] = useState<boolean>(true);
  const [language, setLanguage] = useState<string>('English');

  // Multi-Association State
  const [associations, setAssociations] = useState<Association[]>(INITIAL_ASSOCIATIONS);
  const [currentAssociation, setCurrentAssociation] = useState<Association>(INITIAL_ASSOCIATIONS[0]);

  const [allPastors] = useState<Pastor[]>(INITIAL_PASTORS);
  const [selectedPastor, setSelectedPastor] = useState<Pastor>(INITIAL_PASTORS[1]);

  const [allEvents, setAllEvents] = useState<AssociationEvent[]>(INITIAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<AssociationEvent | null>(INITIAL_EVENTS[0]);

  const [prayers, setPrayers] = useState<PrayerRequest[]>(INITIAL_PRAYERS);
  const [notices] = useState<Notice[]>(INITIAL_NOTICES);
  const [donations, setDonations] = useState<DonationRecord[]>(INITIAL_DONATIONS);

  // Initial attendance
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({
    p1: true,
    p2: true,
    p4: true,
  });

  // Load from Firestore on mount
  useEffect(() => {
    async function loadData() {
      try {
        const fetchedAssocs = await FirestoreService.getAssociations();
        if (fetchedAssocs.length > 0) {
          setAssociations(fetchedAssocs);
          setCurrentAssociation(fetchedAssocs[0]);
        }
      } catch (err) {
        console.warn('Using offline data fallback:', err);
      }
    }
    loadData();
  }, []);

  // Filter pastors strictly for the active association: "One pastor belongs to one association"
  const activePastors = allPastors.filter((p) => p.associationId === currentAssociation.id);

  // Filter events for this association + public inter-association conventions
  const activeEvents = allEvents.filter(
    (e) => e.associationId === currentAssociation.id || e.scope === 'public'
  );

  const currentUser = {
    name: activePastors[0]?.name || 'Pastor K. David Kumar',
    role: activePastors[0]?.role || 'SECRETARY',
    association: currentAssociation.name,
    associationId: currentAssociation.id,
    district: currentAssociation.district,
    state: currentAssociation.state,
    country: 'India',
    memberCount: activePastors.length,
  };

  const switchAssociation = (associationId: string) => {
    const found = associations.find((a) => a.id === associationId);
    if (found) {
      setCurrentAssociation(found);
      const pastorsInAssoc = allPastors.filter((p) => p.associationId === found.id);
      if (pastorsInAssoc.length > 0) {
        setSelectedPastor(pastorsInAssoc[0]);
      }
    }
  };

  const navigateTo = (screen: ScreenName) => {
    setCurrentScreen(screen);
  };

  const togglePrototypePicker = () => {
    setShowPrototypePicker((prev) => !prev);
  };

  const loginWithPhone = (_phoneNumber: string) => {
    setIsLoggedIn(true);
    setCurrentScreen('home');
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('login');
  };

  const selectPastor = (pastor: Pastor) => {
    setSelectedPastor(pastor);
    setCurrentScreen('profile');
  };

  const selectEventForAttendance = (event: AssociationEvent) => {
    setSelectedEvent(event);
    setCurrentScreen('attendance');
  };

  const toggleRSVP = (eventId: string, rsvpType: 'going' | 'maybe') => {
    setAllEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const nextRsvp = e.rsvp === rsvpType ? null : rsvpType;
          return { ...e, rsvp: nextRsvp };
        }
        return e;
      })
    );
  };

  const addEvent = (newEventData: Omit<AssociationEvent, 'id' | 'rsvp' | 'associationId'>) => {
    const newEvent: AssociationEvent = {
      ...newEventData,
      id: `ev-${Date.now()}`,
      associationId: currentAssociation.id,
      rsvp: 'going',
    };
    setAllEvents((prev) => [newEvent, ...prev]);
    setCurrentScreen('events');
  };

  const togglePrayer = (prayerId: string) => {
    setPrayers((prev) =>
      prev.map((p) => {
        if (p.id === prayerId) {
          const nextPrayed = !p.prayedByMe;
          return {
            ...p,
            prayedByMe: nextPrayed,
            prayedCount: nextPrayed ? p.prayedCount + 1 : Math.max(0, p.prayedCount - 1),
          };
        }
        return p;
      })
    );
  };

  const addPrayer = (
    text: string,
    tag: 'HEALTH' | 'MINISTRY' | 'FAMILY' | 'CHURCH',
    leadersOnly: boolean
  ) => {
    const newPrayer: PrayerRequest = {
      id: `pr-${Date.now()}`,
      associationId: currentAssociation.id,
      pastorName: currentUser.name,
      mandal: currentAssociation.mandal,
      timeAgo: 'Just now',
      tag,
      text,
      isGlobal: false,
      leadersOnly,
      prayedByMe: true,
      prayedCount: 1,
    };
    setPrayers((prev) => [newPrayer, ...prev]);
  };

  const toggleAttendance = (pastorId: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [pastorId]: !prev[pastorId],
    }));
  };

  const markAllAttendance = (present: boolean) => {
    const nextMap: Record<string, boolean> = {};
    activePastors.forEach((p) => {
      nextMap[p.id] = present;
    });
    setAttendanceMap(nextMap);
  };

  const addDonation = (purpose: string, amount: number, _anonymous: boolean) => {
    const newDonation: DonationRecord = {
      id: `dn-${Date.now()}`,
      associationId: currentAssociation.id,
      date: 'Today',
      purpose,
      amount,
      status: 'success',
      referenceId: `UPI-${Math.floor(10000000 + Math.random() * 90000000)}`,
    };
    setDonations((prev) => [newDonation, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        activeTab: TAB_MAP[currentScreen] || 'home',
        navigateTo,
        showPrototypePicker,
        togglePrototypePicker,
        associations,
        currentAssociation,
        switchAssociation,
        currentUser,
        isLoggedIn,
        loginWithPhone,
        logout,
        language,
        setLanguage,
        pastors: activePastors,
        selectedPastor,
        selectPastor,
        events: activeEvents,
        selectedEvent,
        selectEventForAttendance,
        toggleRSVP,
        addEvent,
        prayers,
        togglePrayer,
        addPrayer,
        attendanceMap,
        toggleAttendance,
        markAllAttendance,
        donations,
        addDonation,
        notices,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
