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
  PastorRole,
  PastorPermissions,
  isPastorAdmin,
  getDefaultPermissionsForRole,
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
  registerAssociation: (data: {
    name: string;
    code?: string;
    state: string;
    district: string;
    mandal: string;
    leaderName: string;
    leaderPhone: string;
    establishedYear?: string;
  }) => Promise<Association>;
  findAssociationByCode: (code: string) => Association | null;

  // Current logged in user info
  currentUser: {
    name: string;
    role: PastorRole;
    isAdmin: boolean;
    permissions: PastorPermissions;
    association: string;
    associationId: string;
    district: string;
    state: string;
    country: string;
    memberCount: number;
    phone: string;
  };
  loggedPastor: Pastor | null;
  isLoggedIn: boolean;
  loginWithPhone: (phoneNumber: string) => boolean;
  registerPastor: (data: {
    name: string;
    phone: string;
    churchName: string;
    associationId?: string;
    associationCode?: string;
    village?: string;
    mandal?: string;
    district?: string;
    state?: string;
    denomination?: string;
  }) => Promise<Pastor>;
  submitJoinRequest: (data: {
    name: string;
    phone: string;
    churchName: string;
    associationId: string;
    denomination?: string;
    mandal?: string;
    district?: string;
  }) => Promise<boolean>;
  logout: () => void;

  // Admin member & role management
  updatePastorRoleAndPermissions: (
    pastorId: string,
    role: PastorRole,
    customPermissions?: Partial<PastorPermissions>
  ) => Promise<boolean>;
  addMemberByAdmin: (data: {
    name: string;
    phone: string;
    churchName: string;
    role: PastorRole;
    village?: string;
    mandal?: string;
    district?: string;
    denomination?: string;
    permissions?: Partial<PastorPermissions>;
  }) => Promise<Pastor>;

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
  profile: 'profile',
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

  const [allPastors, setAllPastors] = useState<Pastor[]>(INITIAL_PASTORS);
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
        const fetchedPastors = await FirestoreService.getAllPastors();
        if (fetchedPastors.length > 0) {
          setAllPastors(fetchedPastors);
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

  const [loggedPastor, setLoggedPastor] = useState<Pastor | null>(INITIAL_PASTORS[1]);

  const currentUserRole: PastorRole = loggedPastor?.role || 'MEMBER';
  const currentUserIsAdmin: boolean = loggedPastor?.isAdmin ?? isPastorAdmin(currentUserRole);
  const currentUserPermissions: PastorPermissions =
    loggedPastor?.permissions || getDefaultPermissionsForRole(currentUserRole);

  const currentUser = {
    name: loggedPastor?.name || activePastors[0]?.name || 'Pastor K. David Kumar',
    role: currentUserRole,
    isAdmin: currentUserIsAdmin,
    permissions: currentUserPermissions,
    association: currentAssociation.name,
    associationId: currentAssociation.id,
    district: currentAssociation.district,
    state: currentAssociation.state,
    country: 'India',
    memberCount: activePastors.length,
    phone: loggedPastor?.phone || '+91 94401 67890',
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
    if (screen === 'profile' && loggedPastor) {
      setSelectedPastor(loggedPastor);
    }
    setCurrentScreen(screen);
  };

  const togglePrototypePicker = () => {
    setShowPrototypePicker((prev) => !prev);
  };

  const loginWithPhone = (phoneNumber: string): boolean => {
    const cleanInput = phoneNumber.replace(/\D/g, '').slice(-10);

    // Look for registered pastor in the dataset
    const matchedPastor = allPastors.find((p) => {
      const cleanPastorPhone = p.phone.replace(/\D/g, '').slice(-10);
      return cleanPastorPhone === cleanInput;
    });

    if (matchedPastor) {
      setLoggedPastor(matchedPastor);
      const assoc = associations.find((a) => a.id === matchedPastor.associationId);
      if (assoc) {
        setCurrentAssociation(assoc);
      }
      setSelectedPastor(matchedPastor);
      setIsLoggedIn(true);
      setCurrentScreen('home');
      return true;
    }

    return false;
  };

  const findAssociationByCode = (code: string): Association | null => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    return associations.find((a) => a.code.toUpperCase() === clean) || null;
  };

  const registerAssociation = async (data: {
    name: string;
    code?: string;
    state: string;
    district: string;
    mandal: string;
    leaderName: string;
    leaderPhone: string;
    establishedYear?: string;
  }): Promise<Association> => {
    // Generate clean uppercase code (e.g. UKUPS or prefix of name)
    let finalCode = (data.code || data.name.replace(/[^A-Za-z]/g, '').slice(0, 6)).toUpperCase();
    if (!finalCode || finalCode.length < 3) {
      finalCode = `ASSOC${Math.floor(100 + Math.random() * 900)}`;
    }

    const cleanLeaderPhone = data.leaderPhone.replace(/\D/g, '').slice(-10);

    const newAssoc: Association = {
      id: `assoc-${finalCode.toLowerCase()}-${Date.now()}`,
      name: data.name.trim(),
      code: finalCode,
      state: data.state.trim() || 'Andhra Pradesh',
      district: data.district.trim(),
      mandal: data.mandal.trim(),
      memberCount: 1, // Founding leader counts as first member
      establishedYear: data.establishedYear?.trim() || new Date().getFullYear().toString(),
      isVerified: true,
      leaderName: data.leaderName.trim(),
      leaderPhone: `+91 ${cleanLeaderPhone}`,
      createdAt: new Date().toISOString(),
    };

    // Auto-create founding President pastor profile
    const leaderFormattedName =
      data.leaderName.startsWith('Pastor ') || data.leaderName.startsWith('Rev. ')
        ? data.leaderName
        : `Pastor ${data.leaderName}`;

    const leaderPastor: Pastor = {
      id: `p-lead-${Date.now()}`,
      name: leaderFormattedName,
      associationId: newAssoc.id,
      associationName: newAssoc.name,
      associationCode: newAssoc.code,
      isVerified: true,
      isAdmin: true,
      permissions: getDefaultPermissionsForRole('PRESIDENT'),
      churchName: `${data.name} Central Fellowship`,
      village: newAssoc.mandal,
      mandal: newAssoc.mandal,
      district: newAssoc.district,
      state: newAssoc.state,
      role: 'PRESIDENT',
      phone: `+91 ${cleanLeaderPhone}`,
      churchAddress: `${newAssoc.mandal}, ${newAssoc.district}`,
      denomination: 'Independent',
      ordainedYear: newAssoc.establishedYear,
      ministry: 'Pastoral & Association Leadership',
      languages: ['Telugu', 'English'],
    };

    // Update state
    setAssociations((prev) => [newAssoc, ...prev]);
    setAllPastors((prev) => [leaderPastor, ...prev]);
    setCurrentAssociation(newAssoc);
    setLoggedPastor(leaderPastor);
    setSelectedPastor(leaderPastor);
    setIsLoggedIn(true);
    setCurrentScreen('home');

    // Persist to Cloud Firestore
    FirestoreService.saveAssociation(newAssoc).catch(console.warn);
    FirestoreService.savePastor(leaderPastor).catch(console.warn);

    return newAssoc;
  };

  const registerPastor = async (data: {
    name: string;
    phone: string;
    churchName: string;
    associationId?: string;
    associationCode?: string;
    village?: string;
    mandal?: string;
    district?: string;
    state?: string;
    denomination?: string;
  }): Promise<Pastor> => {
    const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);

    // Resolve association by code if provided, or by ID, or fallback to current
    let assoc = currentAssociation;
    if (data.associationCode) {
      const byCode = findAssociationByCode(data.associationCode);
      if (byCode) {
        assoc = byCode;
      }
    } else if (data.associationId) {
      const byId = associations.find((a) => a.id === data.associationId);
      if (byId) {
        assoc = byId;
      }
    }

    const formattedName =
      data.name.startsWith('Pastor ') || data.name.startsWith('Rev. ')
        ? data.name
        : `Pastor ${data.name}`;

    const newPastor: Pastor = {
      id: `p-${Date.now()}`,
      name: formattedName,
      associationId: assoc.id,
      associationName: assoc.name,
      associationCode: assoc.code,
      isVerified: true,
      isAdmin: false,
      permissions: getDefaultPermissionsForRole('MEMBER'),
      churchName: data.churchName || 'Faith Fellowship Church',
      village: data.village || assoc.mandal,
      mandal: data.mandal || assoc.mandal,
      district: data.district || assoc.district,
      state: data.state || assoc.state,
      role: 'MEMBER',
      phone: `+91 ${cleanPhone}`,
      churchAddress: `${data.churchName}, ${data.mandal || assoc.mandal}`,
      denomination: data.denomination || 'Independent',
      ordainedYear: new Date().getFullYear().toString(),
      ministry: 'Pastoral & Evangelism',
      languages: ['Telugu', 'English'],
    };

    setAllPastors((prev) => [newPastor, ...prev]);
    setCurrentAssociation(assoc);
    setLoggedPastor(newPastor);
    setSelectedPastor(newPastor);
    setIsLoggedIn(true);
    setCurrentScreen('home');

    // Increment member count in association
    setAssociations((prev) =>
      prev.map((a) => (a.id === assoc.id ? { ...a, memberCount: (a.memberCount || 0) + 1 } : a))
    );

    FirestoreService.savePastor(newPastor).catch(console.warn);
    FirestoreService.incrementAssociationMemberCount(assoc.id).catch(console.warn);

    return newPastor;
  };

  const submitJoinRequest = async (data: {
    name: string;
    phone: string;
    churchName: string;
    associationId: string;
    denomination?: string;
    mandal?: string;
    district?: string;
  }): Promise<boolean> => {
    const assoc = associations.find((a) => a.id === data.associationId) || currentAssociation;
    const req = {
      id: `req-${Date.now()}`,
      name: data.name,
      phone: data.phone,
      churchName: data.churchName,
      associationId: assoc.id,
      associationName: assoc.name,
      mandal: data.mandal || assoc.mandal,
      district: data.district || assoc.district,
      denomination: data.denomination || 'Independent',
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    };

    return FirestoreService.saveJoinRequest(req);
  };

  const updatePastorRoleAndPermissions = async (
    pastorId: string,
    role: PastorRole,
    customPermissions?: Partial<PastorPermissions>
  ): Promise<boolean> => {
    // Administrative rights are strictly restricted to only: PRESIDENT, SECRETARY, TREASURER
    const adminStatus = isPastorAdmin(role);
    const basePermissions = getDefaultPermissionsForRole(role);
    const finalPermissions: PastorPermissions = {
      ...basePermissions,
      ...(customPermissions || {}),
    };

    let updatedTarget: Pastor | null = null;

    setAllPastors((prev) =>
      prev.map((p) => {
        if (p.id === pastorId) {
          updatedTarget = {
            ...p,
            role,
            isAdmin: adminStatus,
            permissions: finalPermissions,
          };
          return updatedTarget;
        }
        return p;
      })
    );

    if (selectedPastor?.id === pastorId && updatedTarget) {
      setSelectedPastor(updatedTarget);
    }
    if (loggedPastor?.id === pastorId && updatedTarget) {
      setLoggedPastor(updatedTarget);
    }

    if (updatedTarget) {
      FirestoreService.savePastor(updatedTarget).catch(console.warn);
      return true;
    }
    return false;
  };

  const addMemberByAdmin = async (data: {
    name: string;
    phone: string;
    churchName: string;
    role: PastorRole;
    village?: string;
    mandal?: string;
    district?: string;
    denomination?: string;
    permissions?: Partial<PastorPermissions>;
  }): Promise<Pastor> => {
    const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);
    const formattedName =
      data.name.startsWith('Pastor ') || data.name.startsWith('Rev. ')
        ? data.name
        : `Pastor ${data.name}`;

    // Admin rights are restricted strictly to PRESIDENT, SECRETARY, TREASURER
    const adminStatus = isPastorAdmin(data.role);
    const basePermissions = getDefaultPermissionsForRole(data.role);
    const finalPermissions: PastorPermissions = {
      ...basePermissions,
      ...(data.permissions || {}),
    };

    const newPastor: Pastor = {
      id: `p-${Date.now()}`,
      name: formattedName,
      associationId: currentAssociation.id,
      associationName: currentAssociation.name,
      associationCode: currentAssociation.code,
      isVerified: true,
      isAdmin: adminStatus,
      permissions: finalPermissions,
      churchName: data.churchName.trim() || 'Faith Fellowship Church',
      village: data.village?.trim() || currentAssociation.mandal,
      mandal: data.mandal?.trim() || currentAssociation.mandal,
      district: data.district?.trim() || currentAssociation.district,
      state: currentAssociation.state,
      role: data.role,
      phone: `+91 ${cleanPhone}`,
      churchAddress: `${data.churchName}, ${data.mandal || currentAssociation.mandal}`,
      denomination: data.denomination?.trim() || 'Independent',
      ordainedYear: new Date().getFullYear().toString(),
      ministry: adminStatus ? 'Pastoral & Association Administration' : 'Pastoral & Evangelism',
      languages: ['Telugu', 'English'],
    };

    setAllPastors((prev) => [newPastor, ...prev]);

    // Increment association member count
    setAssociations((prev) =>
      prev.map((a) =>
        a.id === currentAssociation.id ? { ...a, memberCount: (a.memberCount || 0) + 1 } : a
      )
    );

    FirestoreService.savePastor(newPastor).catch(console.warn);
    FirestoreService.incrementAssociationMemberCount(currentAssociation.id).catch(console.warn);

    return newPastor;
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
        registerAssociation,
        findAssociationByCode,
        currentUser,
        loggedPastor,
        isLoggedIn,
        loginWithPhone,
        registerPastor,
        submitJoinRequest,
        logout,
        updatePastorRoleAndPermissions,
        addMemberByAdmin,
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
