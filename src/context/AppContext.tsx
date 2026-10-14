import React, { createContext, useContext, useState } from 'react';
import {
  ScreenName,
  TabName,
  Pastor,
  AssociationEvent,
  PrayerRequest,
  Notice,
  DonationRecord,
} from '../types';
import {
  INITIAL_PASTORS,
  INITIAL_EVENTS,
  INITIAL_PRAYERS,
  INITIAL_NOTICES,
  INITIAL_DONATIONS,
} from '../data/mockData';

interface AppContextType {
  // Navigation & screens
  currentScreen: ScreenName;
  activeTab: TabName;
  navigateTo: (screen: ScreenName) => void;
  showPrototypePicker: boolean;
  togglePrototypePicker: () => void;

  // Current logged in user info
  currentUser: {
    name: string;
    role: string;
    association: string;
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
  addEvent: (newEvent: Omit<AssociationEvent, 'id' | 'rsvp'>) => void;

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

  const [pastors] = useState<Pastor[]>(INITIAL_PASTORS);
  const [selectedPastor, setSelectedPastor] = useState<Pastor>(INITIAL_PASTORS[1]); // Default to Pastor David (Secretary)

  const [events, setEvents] = useState<AssociationEvent[]>(INITIAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<AssociationEvent | null>(INITIAL_EVENTS[0]);

  const [prayers, setPrayers] = useState<PrayerRequest[]>(INITIAL_PRAYERS);
  const [notices] = useState<Notice[]>(INITIAL_NOTICES);
  const [donations, setDonations] = useState<DonationRecord[]>(INITIAL_DONATIONS);

  // Initial attendance: 0, 1, 3 marked as present in prototype
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({
    p1: true,
    p2: true,
    p4: true,
  });

  const currentUser = {
    name: 'Pastor K. David Kumar',
    role: 'SECRETARY',
    association: 'Gannavaram Pastors Association',
    district: 'Krishna',
    state: 'Andhra Pradesh',
    country: 'India',
    memberCount: INITIAL_PASTORS.length,
  };

  const navigateTo = (screen: ScreenName) => {
    setCurrentScreen(screen);
  };

  const togglePrototypePicker = () => {
    setShowPrototypePicker((prev) => !prev);
  };

  const loginWithPhone = (phoneNumber: string) => {
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
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const nextRsvp = e.rsvp === rsvpType ? null : rsvpType;
          return { ...e, rsvp: nextRsvp };
        }
        return e;
      })
    );
  };

  const addEvent = (newEventData: Omit<AssociationEvent, 'id' | 'rsvp'>) => {
    const newEvent: AssociationEvent = {
      ...newEventData,
      id: `ev-${Date.now()}`,
      rsvp: 'going',
    };
    setEvents((prev) => [newEvent, ...prev]);
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
      pastorName: currentUser.name,
      mandal: 'Gannavaram',
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
    pastors.forEach((p) => {
      nextMap[p.id] = present;
    });
    setAttendanceMap(nextMap);
  };

  const addDonation = (purpose: string, amount: number, anonymous: boolean) => {
    const newDonation: DonationRecord = {
      id: `dn-${Date.now()}`,
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
        currentUser,
        isLoggedIn,
        loginWithPhone,
        logout,
        language,
        setLanguage,
        pastors,
        selectedPastor,
        selectPastor,
        events,
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
