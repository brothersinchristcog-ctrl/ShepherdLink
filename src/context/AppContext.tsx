import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ScreenName,
  TabName,
  Association,
  Pastor,
  AssociationEvent,
  PrayerRequest,
  PrayerComment,
  PrayerTag,
  Notice,
  DonationRecord,
  PastorRole,
  PastorPermissions,
  isPastorAdmin,
  getDefaultPermissionsForRole,
} from '../types';
import { FirestoreService } from '../services/firestoreService';
import { generateMeaningfulCode } from '../utils/codeGenerator';
import { INITIAL_ASSOCIATIONS, INITIAL_PASTORS, INITIAL_PRAYERS } from '../data/mockData';

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
  setCurrentAssociation: (assoc: Association) => void;
  switchAssociation: (associationId: string) => void;
  registerAssociation: (
    data: {
      name: string;
      code?: string;
      country?: string;
      state: string;
      district: string;
      mandal: string;
      village?: string;
      houseNumber?: string;
      logoUrl?: string;
      leaderName: string;
      leaderPhone: string;
      establishedYear?: string;
    },
    autoNavigateToHome?: boolean
  ) => Promise<Association>;
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
  setLoggedPastor: (pastor: Pastor | null) => void;
  isLoggedIn: boolean;
  loginWithPhone: (
    phoneNumber: string,
    targetAssociationId?: string,
    autoNavigate?: boolean
  ) => boolean;
  checkMemberExists: (phoneNumber: string, associationId: string) => Pastor | null;
  registerPastor: (
    data: {
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
      houseNumber?: string;
      gender?: 'Male' | 'Female' | 'Other' | 'Others' | string;
      dateOfBirth?: string;
    },
    autoNavigate?: boolean
  ) => Promise<Pastor>;
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
  forceLogout: (reason?: string) => void;

  // Admin member & role management
  updatePastorRoleAndPermissions: (
    pastorId: string,
    role: PastorRole,
    customPermissions?: Partial<PastorPermissions>
  ) => Promise<boolean>;
  updatePastorProfile: (
    pastorId: string,
    updates: Partial<Pastor>
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
    gender?: 'Male' | 'Female' | 'Other' | 'Others' | string;
    dateOfBirth?: string;
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
  deleteEvent: (eventId: string) => void;

  // Prayers
  prayers: PrayerRequest[];
  togglePrayer: (prayerId: string) => void;
  addPrayer: (
    text: string,
    tag: PrayerTag,
    leadersOnly: boolean,
    isGlobal?: boolean,
    isUrgent?: boolean
  ) => void;
  deletePrayer: (prayerId: string) => void;
  addPrayerComment: (prayerId: string, commentText: string) => void;
  deletePrayerComment: (prayerId: string, commentId: string) => void;

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
  'pastor-detail': 'directory',
  events: 'events',
  create: 'events',
  attendance: 'events',
  prayer: 'prayer',
  donate: 'home',
};

const DEFAULT_ASSOCIATION: Association = {
  id: '',
  name: 'ShepherdLink Association',
  code: '',
  state: '',
  district: '',
  mandal: '',
  memberCount: 0,
  establishedYear: '',
  isVerified: false,
};

export const SESSION_STORAGE_KEY = '@shepherdlink_persistent_user_session_v1';

export interface StoredUserSession {
  pastorId: string;
  pastorPhone: string;
  associationId: string;
  pastorData: Pastor;
  associationData: Association;
  savedAt: string;
}

export const persistUserSession = async (pastor: Pastor, assoc: Association) => {
  try {
    const payload: StoredUserSession = {
      pastorId: pastor.id,
      pastorPhone: pastor.phone,
      associationId: assoc.id,
      pastorData: pastor,
      associationData: assoc,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('⚠️ Failed to save login session to AsyncStorage:', err);
  }
};

export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('⚠️ Failed to clear login session from AsyncStorage:', err);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('login');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showPrototypePicker, setShowPrototypePicker] = useState<boolean>(true);
  const [language, setLanguage] = useState<string>('English');

  // Multi-Association State (Clean dynamic data)
  const [associations, setAssociations] = useState<Association[]>(INITIAL_ASSOCIATIONS);
  const [currentAssociation, setCurrentAssociation] = useState<Association>(
    INITIAL_ASSOCIATIONS[0] || DEFAULT_ASSOCIATION
  );

  const [allPastors, setAllPastors] = useState<Pastor[]>(INITIAL_PASTORS);
  const [loggedPastor, setLoggedPastor] = useState<Pastor | null>(INITIAL_PASTORS[0] || null);
  const [selectedPastor, setSelectedPastor] = useState<Pastor | null>(INITIAL_PASTORS[0] || null);

  const [allEvents, setAllEvents] = useState<AssociationEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AssociationEvent | null>(null);

  const [prayers, setPrayers] = useState<PrayerRequest[]>(INITIAL_PRAYERS);
  const [notices] = useState<Notice[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);

  // Initial attendance
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});

  // Restore persistent login session & load dataset from Firestore
  useEffect(() => {
    async function restoreSessionAndLoadData() {
      let storedSession: StoredUserSession | null = null;

      // 1. Immediately read persistent session from AsyncStorage (zero delay)
      try {
        const rawSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSession) {
          const parsed = JSON.parse(rawSession) as StoredUserSession;
          if (parsed && parsed.pastorData && parsed.associationData) {
            storedSession = parsed;
            setLoggedPastor(parsed.pastorData);
            setSelectedPastor(parsed.pastorData);
            setCurrentAssociation(parsed.associationData);
            setIsLoggedIn(true);
            setCurrentScreen('home');
          }
        }
      } catch (storageErr) {
        console.warn('⚠️ Error reading stored session from AsyncStorage:', storageErr);
      }

      // 2. Fetch fresh data from Firestore in the background
      try {
        const [fetchedAssocs, fetchedPastors] = await Promise.all([
          FirestoreService.getAssociations(),
          FirestoreService.getAllPastors(),
        ]);

        if (fetchedAssocs.length > 0) {
          setAssociations(fetchedAssocs);
          if (!storedSession) {
            setCurrentAssociation(fetchedAssocs[0]);
          }
        }
        if (fetchedPastors.length > 0) {
          setAllPastors(fetchedPastors);
        }

        // 3. Re-verify & sync active session with fresh database data
        if (storedSession?.pastorId) {
          const freshPastor = fetchedPastors.find((p) => p.id === storedSession!.pastorId);
          const assocId = freshPastor?.associationId || storedSession!.associationId;
          const freshAssoc = fetchedAssocs.find((a) => a.id === assocId);

          if (freshPastor) {
            setLoggedPastor(freshPastor);
            setSelectedPastor(freshPastor);
          }
          if (freshAssoc) {
            setCurrentAssociation(freshAssoc);
          }

          if (freshPastor && freshAssoc) {
            persistUserSession(freshPastor, freshAssoc);
          }
        }
      } catch (err) {
        console.warn('Using offline data fallback during session sync:', err);
      }
    }

    restoreSessionAndLoadData();
  }, []);

  // Filter pastors strictly for the active association: "One pastor belongs to one association"
  const activePastors = allPastors.filter((p) => p.associationId === currentAssociation.id);

  // Filter events for this association + public inter-association conventions
  const activeEvents = allEvents.filter(
    (e) => e.associationId === currentAssociation.id || e.scope === 'public'
  );

  // Filter prayers strictly for this association + global requests
  const activePrayers = prayers.filter(
    (p) => !p.associationId || p.associationId === currentAssociation.id || p.isGlobal
  );

  // Filter donations strictly for this association
  const activeDonations = donations.filter(
    (d) => !d.associationId || d.associationId === currentAssociation.id
  );

  // Load association-scoped data (events, prayers, donations) whenever currentAssociation changes
  useEffect(() => {
    if (!currentAssociation.id) return;
    async function loadAssocData() {
      try {
        const [assocEvents, assocPrayers, assocDonations] = await Promise.all([
          FirestoreService.getEventsForAssociation(currentAssociation.id),
          FirestoreService.getPrayers(currentAssociation.id),
          FirestoreService.getDonationsForAssociation(currentAssociation.id),
        ]);
        if (assocEvents && assocEvents.length > 0) {
          setAllEvents((prev) => {
            const others = prev.filter((e) => e.associationId !== currentAssociation.id);
            return [...assocEvents, ...others];
          });
        }
        if (assocPrayers && assocPrayers.length > 0) {
          setPrayers(assocPrayers);
        }
        if (assocDonations && assocDonations.length > 0) {
          setDonations((prev) => {
            const others = prev.filter((d) => d.associationId !== currentAssociation.id);
            return [...assocDonations, ...others];
          });
        }
      } catch (err) {
        console.warn('Could not load association scoped data:', err);
      }
    }
    loadAssocData();
  }, [currentAssociation.id]);


  const currentUserRole: PastorRole = loggedPastor?.role || 'MEMBER';
  const currentUserIsAdmin: boolean = loggedPastor?.isAdmin ?? (loggedPastor ? isPastorAdmin(currentUserRole) : false);
  const currentUserPermissions: PastorPermissions =
    loggedPastor?.permissions || getDefaultPermissionsForRole(currentUserRole);

  const currentUser = {
    name: loggedPastor?.name || (isLoggedIn ? 'Pastor' : ''),
    role: currentUserRole,
    isAdmin: currentUserIsAdmin,
    permissions: currentUserPermissions,
    association: currentAssociation?.name || '',
    associationId: currentAssociation?.id || '',
    district: currentAssociation?.district || '',
    state: currentAssociation?.state || '',
    country: 'India',
    memberCount: activePastors.length,
    phone: loggedPastor?.phone || '',
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

  const loginWithPhone = (
    phoneNumber: string,
    targetAssociationId?: string,
    autoNavigate: boolean = true
  ): boolean => {
    const cleanInput = phoneNumber.replace(/\D/g, '').slice(-10);

    // Look for registered pastor in the dataset
    let matchedPastor = allPastors.find((p) => {
      const cleanPastorPhone = p.phone.replace(/\D/g, '').slice(-10);
      const matchesPhone = cleanPastorPhone === cleanInput;
      if (targetAssociationId) {
        return matchesPhone && p.associationId === targetAssociationId;
      }
      return matchesPhone;
    });

    // If not in allPastors yet, check if matching association leader
    if (!matchedPastor && targetAssociationId) {
      const targetAssoc = associations.find((a) => a.id === targetAssociationId);
      if (targetAssoc) {
        const leaderClean = (targetAssoc.leaderPhone || '').replace(/\D/g, '').slice(-10);
        if (leaderClean === cleanInput) {
          const leaderFormattedName =
            targetAssoc.leaderName?.startsWith('Pastor ') || targetAssoc.leaderName?.startsWith('Rev. ')
              ? targetAssoc.leaderName
              : `Pastor ${targetAssoc.leaderName || 'Leader'}`;
          matchedPastor = {
            id: `p-lead-${targetAssoc.id}`,
            name: leaderFormattedName,
            associationId: targetAssoc.id,
            associationName: targetAssoc.name,
            associationCode: targetAssoc.code,
            isVerified: true,
            isAdmin: true,
            permissions: getDefaultPermissionsForRole('PRESIDENT'),
            churchName: `${targetAssoc.name} Central Fellowship`,
            village: targetAssoc.village || targetAssoc.mandal,
            mandal: targetAssoc.mandal,
            district: targetAssoc.district,
            state: targetAssoc.state,
            houseNumber: targetAssoc.houseNumber || '',
            role: 'PRESIDENT',
            phone: `+91 ${cleanInput}`,
            churchAddress: `${targetAssoc.village || targetAssoc.mandal}, ${targetAssoc.district}`,
            denomination: 'Independent',
            ordainedYear: targetAssoc.establishedYear || '2020',
            ministry: 'Pastoral & Association Leadership',
            languages: ['Telugu', 'English'],
          };
          setAllPastors((prev) => [matchedPastor!, ...prev]);
        }
      }
    }

    if (matchedPastor) {
      setLoggedPastor(matchedPastor);
      const assoc =
        associations.find((a) => a.id === matchedPastor!.associationId) ||
        (targetAssociationId ? associations.find((a) => a.id === targetAssociationId) : null) ||
        currentAssociation;
      if (assoc) {
        setCurrentAssociation(assoc);
      }
      setSelectedPastor(matchedPastor);
      setIsLoggedIn(true);
      if (autoNavigate) {
        setCurrentScreen('home');
      }
      if (assoc && assoc.id) {
        persistUserSession(matchedPastor, assoc);
      }
      return true;
    }

    return false;
  };

  const checkMemberExists = (phoneNumber: string, associationId: string): Pastor | null => {
    const cleanInput = phoneNumber.replace(/\D/g, '').slice(-10);
    const existing = allPastors.find((p) => {
      const cleanPastorPhone = p.phone.replace(/\D/g, '').slice(-10);
      return cleanPastorPhone === cleanInput && p.associationId === associationId;
    });
    if (existing) return existing;

    const targetAssoc = associations.find((a) => a.id === associationId);
    if (targetAssoc) {
      const leaderClean = (targetAssoc.leaderPhone || '').replace(/\D/g, '').slice(-10);
      if (leaderClean === cleanInput) {
        const leaderFormattedName =
          targetAssoc.leaderName?.startsWith('Pastor ') || targetAssoc.leaderName?.startsWith('Rev. ')
            ? targetAssoc.leaderName
            : `Pastor ${targetAssoc.leaderName || 'Leader'}`;
        return {
          id: `p-lead-${targetAssoc.id}`,
          name: leaderFormattedName,
          associationId: targetAssoc.id,
          associationName: targetAssoc.name,
          associationCode: targetAssoc.code,
          isVerified: true,
          isAdmin: true,
          permissions: getDefaultPermissionsForRole('PRESIDENT'),
          churchName: `${targetAssoc.name} Central Fellowship`,
          village: targetAssoc.village || targetAssoc.mandal,
          mandal: targetAssoc.mandal,
          district: targetAssoc.district,
          state: targetAssoc.state,
          houseNumber: targetAssoc.houseNumber || '',
          role: 'PRESIDENT',
          phone: `+91 ${cleanInput}`,
          churchAddress: `${targetAssoc.village || targetAssoc.mandal}, ${targetAssoc.district}`,
          denomination: 'Independent',
          ordainedYear: targetAssoc.establishedYear || '2020',
          ministry: 'Pastoral & Association Leadership',
          languages: ['Telugu', 'English'],
        };
      }
    }
    return null;
  };

  const findAssociationByCode = (code: string): Association | null => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    return associations.find((a) => a.code.toUpperCase() === clean) || null;
  };

  const registerAssociation = async (
    data: {
      name: string;
      code?: string;
      country?: string;
      state: string;
      district: string;
      mandal: string;
      village?: string;
      houseNumber?: string;
      logoUrl?: string;
      leaderName: string;
      leaderPhone: string;
      establishedYear?: string;
    },
    autoNavigateToHome: boolean = false
  ): Promise<Association> => {
    // 1. Generate meaningful uppercase code based on association name (e.g. "UKUPS Pastors Association" -> "UKUPS")
    let finalCode = (data.code || generateMeaningfulCode(data.name) || 'ASSOC').toUpperCase();
    if (!finalCode || finalCode.length < 2) {
      finalCode = `ASSOC${Math.floor(100 + Math.random() * 900)}`;
    }

    // 2. Ensure uniqueness: check if code already exists in local or remote database
    const localMatch = associations.find((a) => a.code.toUpperCase() === finalCode);
    let remoteMatch: Association | null = null;
    if (!localMatch) {
      try {
        remoteMatch = await FirestoreService.getAssociationByCode(finalCode);
      } catch {
        // Safe fallback
      }
    }

    if (localMatch || remoteMatch) {
      // If code already taken, append a 2-digit number suffix to make it unique while preserving meaning
      finalCode = `${finalCode}${Math.floor(10 + Math.random() * 90)}`;
    }

    const cleanLeaderPhone = data.leaderPhone.replace(/\D/g, '').slice(-10);

    const newAssoc: Association = {
      id: `assoc-${finalCode.toLowerCase()}-${Date.now()}`,
      name: data.name.trim(),
      code: finalCode,
      country: data.country?.trim() || 'India',
      state: data.state.trim() || 'Andhra Pradesh',
      district: data.district.trim(),
      mandal: data.mandal.trim(),
      village: data.village?.trim() || '',
      houseNumber: data.houseNumber?.trim() || '',
      logoUrl: data.logoUrl?.trim() || '',
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

    const formattedAddress = [
      data.houseNumber?.trim(),
      newAssoc.village,
      newAssoc.mandal,
      newAssoc.district,
      newAssoc.state,
    ]
      .filter(Boolean)
      .join(', ');

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
      village: newAssoc.village || newAssoc.mandal,
      mandal: newAssoc.mandal,
      district: newAssoc.district,
      state: newAssoc.state,
      houseNumber: data.houseNumber?.trim() || '',
      role: 'PRESIDENT',
      phone: `+91 ${cleanLeaderPhone}`,
      churchAddress: formattedAddress,
      denomination: 'Independent',
      ordainedYear: newAssoc.establishedYear,
      ministry: 'Pastoral & Association Leadership',
      languages: ['Telugu', 'English'],
    };

    // 3. Persist to Cloud Firestore and verify that save succeeds
    const assocSaved = await FirestoreService.saveAssociation(newAssoc);
    const pastorSaved = await FirestoreService.savePastor(leaderPastor);

    if (!assocSaved || !pastorSaved) {
      throw new Error('Database save failed. Please check network connection.');
    }

    // 4. Update state only after successful database save
    setAssociations((prev) => [newAssoc, ...prev]);
    setAllPastors((prev) => [leaderPastor, ...prev]);
    setCurrentAssociation(newAssoc);
    setLoggedPastor(leaderPastor);
    setSelectedPastor(leaderPastor);
    setIsLoggedIn(true);
    persistUserSession(leaderPastor, newAssoc);

    // Only switch to home screen if explicitly requested; otherwise leave current screen
    // so caller (LoginScreen) can display the association code confirmation modal!
    if (autoNavigateToHome) {
      setCurrentScreen('home');
    }

    return newAssoc;
  };

  const registerPastor = async (
    data: {
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
      houseNumber?: string;
      gender?: 'Male' | 'Female' | 'Other' | 'Others' | string;
      dateOfBirth?: string;
    },
    autoNavigate: boolean = true
  ): Promise<Pastor> => {
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

    const formattedAddress = [
      data.houseNumber?.trim(),
      data.village?.trim() || assoc.village,
      data.mandal?.trim() || assoc.mandal,
      data.district?.trim() || assoc.district,
      data.state?.trim() || assoc.state,
    ]
      .filter(Boolean)
      .join(', ');

    const newPastor: Pastor = {
      id: `p-${Date.now()}`,
      name: formattedName,
      gender: data.gender || 'Male',
      dateOfBirth: data.dateOfBirth?.trim() || '',
      associationId: assoc.id,
      associationName: assoc.name,
      associationCode: assoc.code,
      isVerified: true,
      isAdmin: false,
      permissions: getDefaultPermissionsForRole('MEMBER'),
      churchName: data.churchName || 'Faith Fellowship Church',
      village: data.village || assoc.village || assoc.mandal,
      mandal: data.mandal || assoc.mandal,
      district: data.district || assoc.district,
      state: data.state || assoc.state,
      houseNumber: data.houseNumber?.trim() || '',
      role: 'MEMBER',
      phone: `+91 ${cleanPhone}`,
      churchAddress: formattedAddress || `${data.churchName}, ${data.mandal || assoc.mandal}`,
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
    if (autoNavigate) {
      setCurrentScreen('home');
    }
    persistUserSession(newPastor, assoc);

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

  const updatePastorProfile = async (
    pastorId: string,
    updates: Partial<Pastor>
  ): Promise<boolean> => {
    let updatedTarget: Pastor | null = null;

    setAllPastors((prev) =>
      prev.map((p) => {
        if (p.id === pastorId) {
          updatedTarget = {
            ...p,
            ...updates,
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
      persistUserSession(updatedTarget, currentAssociation);
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
    gender?: 'Male' | 'Female' | 'Other' | 'Others' | string;
    dateOfBirth?: string;
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
      gender: data.gender || 'Male',
      dateOfBirth: data.dateOfBirth?.trim() || '',
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
    clearUserSession();
    setLoggedPastor(null);
    setSelectedPastor(null);
    setIsLoggedIn(false);
    setCurrentScreen('login');
  };

  const forceLogout = (reason?: string) => {
    clearUserSession();
    setLoggedPastor(null);
    setSelectedPastor(null);
    setIsLoggedIn(false);
    setCurrentScreen('login');
    if (reason) {
      Alert.alert('Session Terminated', reason);
    }
  };

  const selectPastor = (pastor: Pastor) => {
    setSelectedPastor(pastor);
    setCurrentScreen('pastor-detail');
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
    FirestoreService.saveEvent(newEvent).catch(console.warn);
    setCurrentScreen('events');
  };

  const deleteEvent = (eventId: string) => {
    const target = allEvents.find((e) => e.id === eventId);
    setAllEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(null);
    }
    if (target) {
      FirestoreService.deleteEvent(eventId, target.associationId).catch(console.warn);
    }
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
    tag: PrayerTag,
    leadersOnly: boolean,
    isGlobal: boolean = false,
    isUrgent: boolean = false
  ) => {
    const newPrayer: PrayerRequest = {
      id: `pr-${Date.now()}`,
      associationId: currentAssociation.id,
      pastorName: loggedPastor?.name || currentUser.name || 'Pastor Member',
      mandal: currentAssociation.mandal || currentUser.district || 'Fellowship',
      timeAgo: 'Just now',
      tag,
      text,
      isGlobal,
      leadersOnly,
      prayedByMe: true,
      prayedCount: 1,
      isUrgent,
      comments: [],
    };
    setPrayers((prev) => [newPrayer, ...prev]);
    FirestoreService.savePrayer(newPrayer).catch(console.warn);
  };

  const deletePrayer = (prayerId: string) => {
    const target = prayers.find((p) => p.id === prayerId);
    setPrayers((prev) => prev.filter((p) => p.id !== prayerId));
    if (target) {
      FirestoreService.deletePrayer(prayerId, target.associationId).catch(console.warn);
    }
  };

  const addPrayerComment = (prayerId: string, commentText: string) => {
    const newComment: PrayerComment = {
      id: `pc-${Date.now()}`,
      authorName: loggedPastor?.name || currentUser.name || 'Fellow Pastor',
      text: commentText,
      timeAgo: 'Just now',
    };
    setPrayers((prev) =>
      prev.map((p) => {
        if (p.id === prayerId) {
          const updated: PrayerRequest = {
            ...p,
            comments: [...(p.comments || []), newComment],
          };
          FirestoreService.savePrayer(updated).catch(console.warn);
          return updated;
        }
        return p;
      })
    );
  };

  const deletePrayerComment = (prayerId: string, commentId: string) => {
    setPrayers((prev) =>
      prev.map((p) => {
        if (p.id === prayerId) {
          const updated: PrayerRequest = {
            ...p,
            comments: (p.comments || []).filter((c) => c.id !== commentId),
          };
          FirestoreService.savePrayer(updated).catch(console.warn);
          return updated;
        }
        return p;
      })
    );
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
    FirestoreService.saveDonation(newDonation).catch(console.warn);
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
        setCurrentAssociation,
        switchAssociation,
        registerAssociation,
        findAssociationByCode,
        currentUser,
        loggedPastor,
        setLoggedPastor,
        isLoggedIn,
        loginWithPhone,
        checkMemberExists,
        registerPastor,
        submitJoinRequest,
        logout,
        forceLogout,
        updatePastorRoleAndPermissions,
        updatePastorProfile,
        addMemberByAdmin,
        language,
        setLanguage,
        pastors: activePastors,
        selectedPastor: selectedPastor || loggedPastor || activePastors[0] || ({} as Pastor),
        selectPastor,
        events: activeEvents,
        selectedEvent,
        selectEventForAttendance,
        toggleRSVP,
        addEvent,
        deleteEvent,
        prayers: activePrayers,
        togglePrayer,
        addPrayer,
        deletePrayer,
        addPrayerComment,
        deletePrayerComment,
        attendanceMap,
        toggleAttendance,
        markAllAttendance,
        donations: activeDonations,
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
