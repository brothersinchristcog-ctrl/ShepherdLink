import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';
import { Association, Pastor } from '../types';
import { FirestoreService } from '../services/firestoreService';
import {
  NATIONALITY_OPTIONS,
  STATE_OPTIONS,
  DISTRICTS_BY_STATE,
  MANDALS_BY_DISTRICT,
  getVillagesForMandal,
} from '../data/locationData';

// Safely load expo-image-picker to avoid fatal crashes in dev clients without recompiled native binary
let SafeImagePicker: typeof import('expo-image-picker') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SafeImagePicker = require('expo-image-picker');
} catch {
  SafeImagePicker = null;
}

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

const DENOMINATIONS = [
  'Independent',
  'Assemblies of God',
  'Baptist Church',
  'Church of South India (CSI)',
  'Pentecostal',
  'Lutheran (AELC)',
];

type FlowStep = 'LANDING' | 'ASSOC_CHOICE' | 'PHONE' | 'OTP' | 'SIGNUP' | 'REGISTER_ASSOC' | 'WELCOME';
type DropdownFieldType = 'country' | 'state' | 'district' | 'mandal' | 'village';

export const DROPDOWN_PLACEHOLDERS: Record<DropdownFieldType, string> = {
  country: 'Select your Nationality / Country',
  state: 'Select your State',
  district: 'Select your District',
  mandal: 'Select your Mandal / Taluk',
  village: 'Select your Village / Town',
};

export const LOGO_PRESETS = [
  {
    id: 'p1',
    name: 'Cross & Bible',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'p2',
    name: 'Holy Scripture',
    url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'p3',
    name: 'Shepherd Staff',
    url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'p4',
    name: 'Fellowship Seal',
    url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=240&auto=format&fit=crop&q=80',
  },
];

const INITIAL_SIGNUP_FORM: {
  name: string;
  gender: 'Male' | 'Female' | 'Others';
  dateOfBirth: string;
  churchName: string;
  houseAddress: string;
  state: string;
  district: string;
  mandal: string;
  village: string;
  denomination: string;
} = {
  name: '',
  gender: 'Male',
  dateOfBirth: '',
  churchName: '',
  houseAddress: '',
  state: '',
  district: '',
  mandal: '',
  village: '',
  denomination: 'Independent',
};

const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const getDaysInMonth = (year: number, monthIndex: number) => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, monthIndex: number) => {
  return new Date(year, monthIndex, 1).getDay();
};

const DOB_YEARS: number[] = [];
for (let y = new Date().getFullYear() - 10; y >= 1940; y--) {
  DOB_YEARS.push(y);
}

export const LoginScreen: React.FC = () => {
  const {
    loginWithPhone,
    registerPastor,
    registerAssociation,
    findAssociationByCode,
    checkMemberExists,
    language,
    setLanguage,
    navigateTo,
    logout,
  } = useApp();

  // Active step in the authentication & registration journey
  const [step, setStep] = useState<FlowStep>('LANDING');

  // Step 1: Association Code input
  const [assocCodeInput, setAssocCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Step 2: The validated Association & Membership Choice (LOGIN vs REGISTER)
  const [validatedAssoc, setValidatedAssoc] = useState<Association | null>(null);
  const [memberMode, setMemberMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Step 3 & 4: Mobile & OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('123456');
  const [phoneError, setPhoneError] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [matchingMember, setMatchingMember] = useState<{
    name: string;
    churchName?: string;
    role?: string;
  } | null>(null);
  const [searchingMember, setSearchingMember] = useState(false);

  // Step 7: Member Sign-Up Form (when phone is not yet an existing member)
  const [signupForm, setSignupForm] = useState(INITIAL_SIGNUP_FORM);
  const [registeringMember, setRegisteringMember] = useState(false);

  // Date of Birth Picker Modal State
  const [showDobPickerModal, setShowDobPickerModal] = useState(false);
  const [pickerYear, setPickerYear] = useState(1985);
  const [pickerMonth, setPickerMonth] = useState(0); // 0 = Jan
  const [pickerDay, setPickerDay] = useState(1);
  const [pickerTab, setPickerTab] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');

  const openDobPicker = () => {
    if (signupForm.dateOfBirth && signupForm.dateOfBirth.includes('/')) {
      const parts = signupForm.dateOfBirth.split('/');
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1940 && y <= new Date().getFullYear()) {
        setPickerDay(Math.min(31, Math.max(1, d)));
        setPickerMonth(Math.min(11, Math.max(0, m)));
        setPickerYear(y);
      }
    }
    setPickerTab('DAY');
    setShowDobPickerModal(true);
  };

  const handleConfirmDob = () => {
    const formatted = `${padZero(pickerDay)}/${padZero(pickerMonth + 1)}/${pickerYear}`;
    setSignupForm((prev) => ({ ...prev, dateOfBirth: formatted }));
    setShowDobPickerModal(false);
  };

  // Custom Denominations State (+New with Firebase sync)
  const [denominationsList, setDenominationsList] = useState<string[]>(DENOMINATIONS);
  const [showNewDenomModal, setShowNewDenomModal] = useState(false);
  const [newDenomInput, setNewDenomInput] = useState('');
  const [savingDenom, setSavingDenom] = useState(false);

  // Member Registration Location Dropdown State
  const [memberActiveDropdown, setMemberActiveDropdown] = useState<
    'state' | 'district' | 'mandal' | 'village' | null
  >(null);
  const [memberDropdownSearch, setMemberDropdownSearch] = useState('');
  const [memberCustomVillageInput, setMemberCustomVillageInput] = useState('');

  // Small Welcome Popup State
  const [welcomePopup, setWelcomePopup] = useState<{
    pastor: Pastor;
    assoc: Association;
  } | null>(null);

  // Load custom denominations on mount
  useEffect(() => {
    async function loadDenominations() {
      try {
        const fetched = await FirestoreService.getDenominations();
        if (fetched && fetched.length > 0) {
          setDenominationsList((prev) => {
            const combined = [...prev];
            fetched.forEach((d) => {
              if (!combined.includes(d)) {
                combined.push(d);
              }
            });
            return combined;
          });
        }
      } catch (err) {
        console.warn('Could not load custom denominations:', err);
      }
    }
    loadDenominations();
  }, []);

  // Register Association Form (Section 3)
  const [assocRegForm, setAssocRegForm] = useState({
    name: '',
    country: '',
    state: '',
    district: '',
    mandal: '',
    village: '',
    houseNumber: '',
    logoUrl: '',
    leaderName: '',
    leaderPhone: '',
    establishedYear: new Date().getFullYear().toString(),
  });
  const [registeringAssoc, setRegisteringAssoc] = useState(false);

  // Location Dropdown State (Inline Accordion Dropdown, No Popups)
  const [activeDropdown, setActiveDropdown] = useState<DropdownFieldType | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [customInputValue, setCustomInputValue] = useState('');

  const handleAssocNameChange = (text: string) => {
    setAssocRegForm((prev) => ({
      ...prev,
      name: text,
    }));
  };

  const [showLogoModal, setShowLogoModal] = useState(false);
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');

  // Logo picker handlers for Association Registration
  const handlePickLogo = async () => {
    if (!SafeImagePicker) {
      setCustomAlert({
        visible: true,
        title: 'Native Module Notice',
        message:
          'Your mobile build requires a new development build to access device photo gallery natively. In the meantime, you can choose one of the preset church emblems or paste an image URL.',
        type: 'info',
        actionText: 'Got It',
      });
      return;
    }

    try {
      const permissionResult = await SafeImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setCustomAlert({
          visible: true,
          title: 'Gallery Permission Needed',
          message: 'Please grant access to your photo gallery to select your association logo.',
          type: 'error',
          actionText: 'OK',
        });
        return;
      }

      const result = await SafeImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const finalUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setAssocRegForm((prev) => ({
          ...prev,
          logoUrl: finalUri,
        }));
        setShowLogoModal(false);
      }
    } catch {
      setCustomAlert({
        visible: true,
        title: 'Gallery Notice',
        message: 'Could not access device gallery in this build. You can select an emblem preset or enter an image link below.',
        type: 'info',
        actionText: 'OK',
      });
    }
  };

  const handlePickFromCamera = async () => {
    if (!SafeImagePicker) {
      setCustomAlert({
        visible: true,
        title: 'Native Module Notice',
        message:
          'Your mobile build requires a new development build to access device camera natively. In the meantime, you can choose one of the preset church emblems or paste an image URL.',
        type: 'info',
        actionText: 'Got It',
      });
      return;
    }

    try {
      const permissionResult = await SafeImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setCustomAlert({
          visible: true,
          title: 'Camera Permission Needed',
          message: 'Please grant camera access to take a picture of your association logo/emblem.',
          type: 'error',
          actionText: 'OK',
        });
        return;
      }

      const result = await SafeImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const finalUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setAssocRegForm((prev) => ({
          ...prev,
          logoUrl: finalUri,
        }));
        setShowLogoModal(false);
      }
    } catch {
      setCustomAlert({
        visible: true,
        title: 'Camera Notice',
        message: 'Could not access camera in this build. You can select an emblem preset or enter an image link below.',
        type: 'info',
        actionText: 'OK',
      });
    }
  };

  const handleSelectPresetLogo = (presetUrl: string) => {
    setAssocRegForm((prev) => ({
      ...prev,
      logoUrl: presetUrl,
    }));
    setShowLogoModal(false);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customLogoUrlInput.trim();
    if (!trimmed) return;
    setAssocRegForm((prev) => ({
      ...prev,
      logoUrl: trimmed,
    }));
    setCustomLogoUrlInput('');
    setShowLogoModal(false);
  };

  const handleRemoveLogo = () => {
    setAssocRegForm((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    setShowLogoModal(false);
  };

  const handleSelectLogoSource = () => {
    setShowLogoModal(true);
  };

  const toggleDropdown = (field: DropdownFieldType) => {
    if (activeDropdown === field) {
      setActiveDropdown(null);
      return;
    }

    if (field === 'state' && !assocRegForm.country) {
      setCustomAlert({
        visible: true,
        title: 'Select Country First',
        message: 'Please select your Nationality / Country before choosing a State.',
        type: 'info',
        actionText: 'OK',
      });
      return;
    }

    if (field === 'district' && !assocRegForm.state) {
      setCustomAlert({
        visible: true,
        title: 'Select State First',
        message: 'Please select your State before choosing a District.',
        type: 'info',
        actionText: 'OK',
      });
      return;
    }
    if (field === 'mandal' && !assocRegForm.district) {
      setCustomAlert({
        visible: true,
        title: 'Select District First',
        message: 'Please select your District before choosing a Mandal / Taluk.',
        type: 'info',
        actionText: 'OK',
      });
      return;
    }
    if (field === 'village' && !assocRegForm.mandal) {
      setCustomAlert({
        visible: true,
        title: 'Select Mandal First',
        message: 'Please select your Mandal / Taluk before choosing a Village / Town.',
        type: 'info',
        actionText: 'OK',
      });
      return;
    }

    setDropdownSearch('');
    setCustomInputValue('');
    setActiveDropdown(field);
  };

  const getDropdownOptions = (field: DropdownFieldType): string[] => {
    switch (field) {
      case 'country':
        return NATIONALITY_OPTIONS;
      case 'state':
        if (!assocRegForm.country || assocRegForm.country === 'India') {
          return STATE_OPTIONS;
        }
        return [
          `${assocRegForm.country} State/Province 1`,
          `${assocRegForm.country} State/Province 2`,
          `${assocRegForm.country} Central`,
          'Other State / Region',
        ];
      case 'district':
        if (!assocRegForm.state) return [];
        return (
          DISTRICTS_BY_STATE[assocRegForm.state] || [
            `${assocRegForm.state} Central`,
            `${assocRegForm.state} North`,
            `${assocRegForm.state} South`,
            `${assocRegForm.state} East`,
            `${assocRegForm.state} West`,
          ]
        );
      case 'mandal':
        if (!assocRegForm.district) return [];
        return (
          MANDALS_BY_DISTRICT[assocRegForm.district] || [
            `${assocRegForm.district} Urban`,
            `${assocRegForm.district} Rural`,
            `${assocRegForm.district} Central`,
            `${assocRegForm.district} Town`,
          ]
        );
      case 'village':
        if (!assocRegForm.mandal) return [];
        return getVillagesForMandal(assocRegForm.mandal);
    }
  };

  const handleSelectDropdownValue = (value: string, fieldOverride?: DropdownFieldType) => {
    const field = fieldOverride || activeDropdown;
    if (!field) return;

    const trimmed = value.trim();
    if (!trimmed) return;

    setAssocRegForm((prev) => {
      switch (field) {
        case 'country':
          return {
            ...prev,
            country: trimmed,
            ...(prev.country !== trimmed
              ? { state: '', district: '', mandal: '', village: '' }
              : {}),
          };
        case 'state':
          return {
            ...prev,
            state: trimmed,
            district: '',
            mandal: '',
            village: '',
          };
        case 'district':
          return {
            ...prev,
            district: trimmed,
            mandal: '',
            village: '',
          };
        case 'mandal':
          return {
            ...prev,
            mandal: trimmed,
            village: '',
          };
        case 'village':
          return {
            ...prev,
            village: trimmed,
          };
      }
    });

    setActiveDropdown(null);
    setDropdownSearch('');
    setCustomInputValue('');
  };

  const renderInlineDropdownMenu = (field: DropdownFieldType) => {
    if (activeDropdown !== field) return null;

    const options = getDropdownOptions(field);
    const filteredOptions = options.filter((opt) =>
      opt.toLowerCase().includes(dropdownSearch.trim().toLowerCase())
    );

    return (
      <View style={styles.inlineDropdownCard}>
        {/* Search Bar for Quick Filtering */}
        {options.length > 5 && (
          <View style={styles.dropdownSearchBar}>
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.dropdownSearchInput}
              placeholder={
                field === 'village' && assocRegForm.mandal
                  ? `Search village in ${assocRegForm.mandal}...`
                  : `Search ${field}...`
              }
              placeholderTextColor="#94A3B8"
              value={dropdownSearch}
              onChangeText={setDropdownSearch}
              autoCorrect={false}
            />
            {dropdownSearch.length > 0 && (
              <TouchableOpacity onPress={() => setDropdownSearch('')}>
                <Feather name="x-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Options List - Clean and identical to Member registration */}
        <ScrollView
          style={styles.inlineDropdownScroll}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {filteredOptions.map((opt) => {
            const isSelected = assocRegForm[field] === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowActive]}
                onPress={() => handleSelectDropdownValue(opt, field)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}
                >
                  {opt}
                </Text>
                {isSelected && <Feather name="check" size={16} color={COLORS.brandTeal} />}
              </TouchableOpacity>
            );
          })}

          {filteredOptions.length === 0 && (
            <View style={styles.dropdownEmptyState}>
              <Text style={styles.dropdownEmptyText}>
                No matching {field} found in database.
              </Text>
            </View>
          )}

          {/* Custom entry row for other values */}
          {(field === 'village' || field === 'mandal' || field === 'district') && (
            <View style={styles.customOptionBox}>
              <Text style={styles.customOptionLabel}>
                {field === 'village' && assocRegForm.mandal
                  ? `Other Village in ${assocRegForm.mandal}:`
                  : `Other ${field.charAt(0).toUpperCase() + field.slice(1)} Name:`}
              </Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder={
                    field === 'village'
                      ? 'Enter village name'
                      : `Enter ${field} name`
                  }
                  placeholderTextColor="#94A3B8"
                  value={customInputValue}
                  onChangeText={setCustomInputValue}
                />
                <TouchableOpacity
                  style={[
                    styles.customApplyBtn,
                    !customInputValue.trim() && styles.customApplyBtnDisabled,
                  ]}
                  disabled={!customInputValue.trim()}
                  onPress={() => handleSelectDropdownValue(customInputValue, field)}
                >
                  <Text style={styles.customApplyBtnText}>Use</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const handleAddNewDenomination = async () => {
    const trimmed = newDenomInput.trim();
    if (!trimmed) {
      setCustomAlert({
        visible: true,
        title: 'Denomination Required',
        message: 'Please enter the denomination name (e.g. Methodist Church).',
        type: 'error',
        actionText: 'Enter Name',
      });
      return;
    }

    setSavingDenom(true);
    try {
      await FirestoreService.saveDenomination(trimmed);
      if (!denominationsList.includes(trimmed)) {
        setDenominationsList((prev) => [...prev, trimmed]);
      }
      setSignupForm((prev) => ({ ...prev, denomination: trimmed }));
      setNewDenomInput('');
      setShowNewDenomModal(false);
      Alert.alert('Denomination Added', `"${trimmed}" has been added and saved in the database.`);
    } catch {
      setCustomAlert({
        visible: true,
        title: 'Save Failed',
        message: 'Could not save denomination to database. Please check connection and try again.',
        type: 'error',
        actionText: 'OK',
      });
    } finally {
      setSavingDenom(false);
    }
  };

  const toggleMemberDropdown = (field: 'state' | 'district' | 'mandal' | 'village') => {
    if (memberActiveDropdown === field) {
      setMemberActiveDropdown(null);
      return;
    }

    if (field === 'district' && !signupForm.state) {
      setCustomAlert({
        visible: true,
        title: 'Select State First',
        message: 'Please select your State before choosing a District.',
        type: 'info',
        actionText: 'OK',
      });
      return;
    }
    if (field === 'mandal' && !signupForm.district) {
      setCustomAlert({
        visible: true,
        title: 'Select District First',
        message: 'Please select your District before choosing a Mandal / Taluk.',
        type: 'info',
        actionText: 'OK',
      });
      return;
    }
    if (field === 'village' && !signupForm.mandal) {
      setCustomAlert({
        visible: true,
        title: 'Select Mandal First',
        message: 'Please select your Mandal / Taluk before choosing a Village / Town.',
        type: 'info',
        actionText: 'OK',
      });
      return;
    }

    setMemberDropdownSearch('');
    setMemberCustomVillageInput('');
    setMemberActiveDropdown(field);
  };

  const getMemberDropdownOptions = (field: 'state' | 'district' | 'mandal' | 'village'): string[] => {
    switch (field) {
      case 'state':
        return STATE_OPTIONS;
      case 'district':
        if (!signupForm.state) return [];
        return (
          DISTRICTS_BY_STATE[signupForm.state] || [
            `${signupForm.state} Central`,
            `${signupForm.state} North`,
            `${signupForm.state} South`,
            `${signupForm.state} East`,
            `${signupForm.state} West`,
          ]
        );
      case 'mandal':
        if (!signupForm.district) return [];
        return (
          MANDALS_BY_DISTRICT[signupForm.district] || [
            `${signupForm.district} Urban`,
            `${signupForm.district} Rural`,
            `${signupForm.district} Central`,
            `${signupForm.district} Town`,
          ]
        );
      case 'village':
        if (!signupForm.mandal) return [];
        return getVillagesForMandal(signupForm.mandal);
    }
  };

  const handleSelectMemberDropdownValue = (
    value: string,
    fieldOverride?: 'state' | 'district' | 'mandal' | 'village'
  ) => {
    const field = fieldOverride || memberActiveDropdown;
    if (!field) return;

    const trimmed = value.trim();
    if (!trimmed) return;

    setSignupForm((prev) => {
      switch (field) {
        case 'state':
          return {
            ...prev,
            state: trimmed,
            district: '',
            mandal: '',
            village: '',
          };
        case 'district':
          return {
            ...prev,
            district: trimmed,
            mandal: '',
            village: '',
          };
        case 'mandal':
          return {
            ...prev,
            mandal: trimmed,
            village: '',
          };
        case 'village':
          return {
            ...prev,
            village: trimmed,
          };
      }
    });

    setMemberActiveDropdown(null);
    setMemberDropdownSearch('');
    setMemberCustomVillageInput('');
  };

  const renderMemberInlineDropdownMenu = (field: 'state' | 'district' | 'mandal' | 'village') => {
    if (memberActiveDropdown !== field) return null;

    const options = getMemberDropdownOptions(field);
    const filteredOptions = options.filter((opt) =>
      opt.toLowerCase().includes(memberDropdownSearch.trim().toLowerCase())
    );

    return (
      <View style={styles.inlineDropdownCard}>
        {options.length > 5 && (
          <View style={styles.dropdownSearchBar}>
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.dropdownSearchInput}
              placeholder={
                field === 'village' && signupForm.mandal
                  ? `Search village in ${signupForm.mandal}...`
                  : `Search ${field}...`
              }
              placeholderTextColor="#94A3B8"
              value={memberDropdownSearch}
              onChangeText={setMemberDropdownSearch}
              autoCorrect={false}
            />
            {memberDropdownSearch.length > 0 && (
              <TouchableOpacity onPress={() => setMemberDropdownSearch('')}>
                <Feather name="x-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView
          style={styles.inlineDropdownScroll}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {filteredOptions.map((opt) => {
            const isSelected = signupForm[field] === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowActive]}
                onPress={() => handleSelectMemberDropdownValue(opt, field)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}
                >
                  {opt}
                </Text>
                {isSelected && <Feather name="check" size={16} color={COLORS.brandTeal} />}
              </TouchableOpacity>
            );
          })}

          {filteredOptions.length === 0 && (
            <View style={styles.dropdownEmptyState}>
              <Text style={styles.dropdownEmptyText}>
                No matching {field} found in database.
              </Text>
            </View>
          )}

          {/* Custom entry for village / town */}
          {field === 'village' && (
            <View style={styles.customOptionBox}>
              <Text style={styles.customOptionLabel}>Other Village / Town Name:</Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Type village name if not in list"
                  placeholderTextColor="#94A3B8"
                  value={memberCustomVillageInput}
                  onChangeText={setMemberCustomVillageInput}
                />
                <TouchableOpacity
                  style={[
                    styles.customApplyBtn,
                    !memberCustomVillageInput.trim() && styles.customApplyBtnDisabled,
                  ]}
                  disabled={!memberCustomVillageInput.trim()}
                  onPress={() =>
                    handleSelectMemberDropdownValue(memberCustomVillageInput, 'village')
                  }
                >
                  <Text style={styles.customApplyBtnText}>Use</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Created association code modal for sharing
  const [createdCodeInfo, setCreatedCodeInfo] = useState<{
    name: string;
    code: string;
    leaderName?: string;
    fullAddress?: string;
    logoUrl?: string;
  } | null>(null);

  // Language Dropdown
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // Custom Alert dialog
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'error' | 'success' | 'info';
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  // =========================================================
  // 1. VALIDATE ASSOCIATION CODE
  // =========================================================
  const handleValidateAssocCode = async () => {
    const clean = assocCodeInput.trim().toUpperCase();
    if (!clean) {
      setCodeError('Please enter an Association Code');
      return;
    }

    setValidatingCode(true);
    setCodeError(null);

    try {
      // 1. Check in local loaded state
      let found = findAssociationByCode(clean);

      // 2. If not in local cache, query Firestore directly
      if (!found) {
        found = await FirestoreService.getAssociationByCode(clean);
      }

      if (found) {
        setValidatedAssoc(found);
        setStep('ASSOC_CHOICE');
        setPhoneNumber('');
        setPhoneError(false);
        setMatchingMember(null);
      } else {
        setCodeError(`Invalid code "${clean}". No matching association found.`);
        setCustomAlert({
          visible: true,
          title: 'Invalid Association Code',
          message: `We could not find any association with code "${clean}". Please verify the code with your association leader, or register your association below.`,
          type: 'error',
          actionText: 'Check Code',
        });
      }
    } catch {
      setCodeError('Error checking association code. Please check connection.');
    } finally {
      setValidatingCode(false);
    }
  };

  // =========================================================
  // 1.5 LOOKUP REGISTERED MEMBER NAME LIVE ON PHONE INPUT
  // =========================================================
  const lookupMemberForPhone = async (rawPhone: string, targetAssoc?: Association | null) => {
    const assoc = targetAssoc || validatedAssoc;
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10 || !assoc) {
      setMatchingMember(null);
      return;
    }

    setSearchingMember(true);
    try {
      // 1. Check local context cache
      const localMatch = checkMemberExists(cleanPhone, assoc.id);
      if (localMatch) {
        setMatchingMember({
          name: localMatch.name,
          churchName: localMatch.churchName,
          role: localMatch.role || (localMatch.isAdmin ? 'President / Leader' : 'Member Pastor'),
        });
        setSearchingMember(false);
        return;
      }

      // 2. Check association leader details
      const leaderClean = (assoc.leaderPhone || '').replace(/\D/g, '').slice(-10);
      if (leaderClean && leaderClean === cleanPhone && assoc.leaderName) {
        setMatchingMember({
          name: assoc.leaderName.startsWith('Pastor') || assoc.leaderName.startsWith('Rev.')
            ? assoc.leaderName
            : `Pastor ${assoc.leaderName}`,
          churchName: `${assoc.village || assoc.mandal} Fellowship`,
          role: 'President & Founder',
        });
        setSearchingMember(false);
        return;
      }

      // 3. Query Firestore for this association's pastors
      const remotePastors = await FirestoreService.getPastorsForAssociation(assoc.id);
      const remoteMatch = remotePastors.find((p) => {
        const pClean = p.phone.replace(/\D/g, '').slice(-10);
        return pClean === cleanPhone;
      });

      if (remoteMatch) {
        setMatchingMember({
          name: remoteMatch.name,
          churchName: remoteMatch.churchName,
          role: remoteMatch.role || (remoteMatch.isAdmin ? 'President / Leader' : 'Member Pastor'),
        });
      } else {
        setMatchingMember(null);
      }
    } catch {
      setMatchingMember(null);
    } finally {
      setSearchingMember(false);
    }
  };

  // =========================================================
  // 2. SEND OTP FOR PHONE NUMBER
  // =========================================================
  const handleSendOtp = () => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setPhoneError(true);
      setCustomAlert({
        visible: true,
        title: 'Invalid Mobile Number',
        message: 'Please enter a valid 10-digit Indian mobile number.',
        type: 'error',
        actionText: 'Got It',
      });
      return;
    }
    setPhoneError(false);
    setOtpCode('123456'); // Default sandbox OTP for smooth demo testing
    setStep('OTP');
  };

  // =========================================================
  // 3. VERIFY OTP & CHECK EXISTING MEMBER STATUS
  // =========================================================
  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 4) {
      setCustomAlert({
        visible: true,
        title: 'Verification Code Required',
        message: 'Please enter the 6-digit OTP code sent to your phone.',
        type: 'error',
        actionText: 'Check Code',
      });
      return;
    }

    if (!validatedAssoc) {
      setStep('LANDING');
      return;
    }

    setVerifyingOtp(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);

      // Step 5: Check whether the verified phone belongs to an existing member of that association
      const existingMember = checkMemberExists(cleanPhone, validatedAssoc.id);

      if (memberMode === 'LOGIN') {
        if (existingMember) {
          loginWithPhone(cleanPhone, validatedAssoc.id, false);
          setWelcomePopup({
            pastor: existingMember,
            assoc: validatedAssoc,
          });
        } else {
          // Mobile not found as member of this association
          setCustomAlert({
            visible: true,
            title: 'Member Not Found',
            message: `Mobile number +91 ${cleanPhone} is not registered in ${validatedAssoc.name}. Would you like to register as a new member now?`,
            type: 'info',
            actionText: 'Register as Member',
            onAction: () => {
              setMemberMode('REGISTER');
              setSignupForm(INITIAL_SIGNUP_FORM);
              setStep('SIGNUP');
            },
          });
        }
      } else {
        // memberMode === 'REGISTER'
        if (existingMember) {
          loginWithPhone(cleanPhone, validatedAssoc.id, false);
          setWelcomePopup({
            pastor: existingMember,
            assoc: validatedAssoc,
          });
        } else {
          setSignupForm(INITIAL_SIGNUP_FORM);
          setStep('SIGNUP');
        }
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  // =========================================================
  // 4. SIGN UP NEW MEMBER INTO VALIDATED ASSOCIATION
  // =========================================================
  const handleCompleteMemberSignup = async () => {
    if (!signupForm.name.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Pastor Name Required',
        message: 'Please enter your full name (e.g. Pastor Rajesh Kumar).',
        type: 'error',
        actionText: 'Enter Name',
      });
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setCustomAlert({
        visible: true,
        title: 'Mobile Number Required',
        message: 'Please enter a valid 10-digit mobile number.',
        type: 'error',
        actionText: 'Enter Mobile',
      });
      return;
    }

    if (!signupForm.churchName.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Church Name Required',
        message: 'Please enter your church or ministry fellowship name.',
        type: 'error',
        actionText: 'Enter Church',
      });
      return;
    }

    if (signupForm.dateOfBirth.trim() && signupForm.dateOfBirth.trim().length < 10) {
      setCustomAlert({
        visible: true,
        title: 'Incomplete Date of Birth',
        message: 'Please enter your complete Date of Birth in DD/MM/YYYY format, or leave it blank.',
        type: 'error',
        actionText: 'Enter Valid Date',
      });
      return;
    }

    if (!validatedAssoc) return;

    // Check if phone number is already registered in this association
    const existing = checkMemberExists(cleanPhone, validatedAssoc.id);
    if (existing) {
      loginWithPhone(cleanPhone, validatedAssoc.id, false);
      setWelcomePopup({
        pastor: existing,
        assoc: validatedAssoc,
      });
      return;
    }

    setRegisteringMember(true);
    try {
      const formattedName =
        signupForm.name.trim().startsWith('Pastor') || signupForm.name.trim().startsWith('Rev.')
          ? signupForm.name.trim()
          : `Pastor ${signupForm.name.trim()}`;

      const newPastor = await registerPastor(
        {
          name: formattedName,
          gender: signupForm.gender,
          dateOfBirth: signupForm.dateOfBirth.trim(),
          phone: cleanPhone,
          churchName: signupForm.churchName.trim(),
          houseNumber: signupForm.houseAddress.trim(),
          village: signupForm.village.trim() || validatedAssoc.village || validatedAssoc.mandal,
          associationId: validatedAssoc.id,
          associationCode: validatedAssoc.code,
          mandal: signupForm.mandal.trim() || validatedAssoc.mandal,
          district: signupForm.district.trim() || validatedAssoc.district,
          state: signupForm.state.trim() || validatedAssoc.state,
          denomination: signupForm.denomination,
        },
        false
      );

      loginWithPhone(cleanPhone, validatedAssoc.id, false);
      setWelcomePopup({
        pastor: newPastor,
        assoc: validatedAssoc,
      });
    } catch {
      setCustomAlert({
        visible: true,
        title: 'Registration Error',
        message: 'Could not complete registration. Please check your connection and try again.',
        type: 'error',
        actionText: 'Retry',
      });
    } finally {
      setRegisteringMember(false);
    }
  };

  // =========================================================
  // 5. REGISTER NEW ASSOCIATION (e.g. UKUPS)
  // =========================================================
  const handleRegisterNewAssociation = async () => {
    if (!assocRegForm.name.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Association Name Required',
        message: 'Please enter the association name (e.g. UKUPS Pastors Association).',
        type: 'error',
        actionText: 'Enter Name',
      });
      return;
    }

    if (!assocRegForm.leaderName.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Leader Name Required',
        message: 'Please enter founding President / Leader name.',
        type: 'error',
        actionText: 'Enter Leader',
      });
      return;
    }

    const cleanLeaderPhone = assocRegForm.leaderPhone.replace(/\D/g, '');
    if (cleanLeaderPhone.length < 10) {
      setCustomAlert({
        visible: true,
        title: 'Mobile Number Required',
        message: 'Please enter a valid 10-digit mobile number for the founding President.',
        type: 'error',
        actionText: 'Enter Mobile',
      });
      return;
    }

    if (!assocRegForm.country.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Country Required',
        message: 'Please select the nationality / country of your association.',
        type: 'error',
        actionText: 'Select Country',
      });
      return;
    }

    if (!assocRegForm.state.trim()) {
      setCustomAlert({
        visible: true,
        title: 'State Required',
        message: 'Please select the state of your association.',
        type: 'error',
        actionText: 'Select State',
      });
      return;
    }

    if (!assocRegForm.district.trim()) {
      setCustomAlert({
        visible: true,
        title: 'District Required',
        message: 'Please select the district of your association.',
        type: 'error',
        actionText: 'Select District',
      });
      return;
    }

    if (!assocRegForm.mandal.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Mandal Required',
        message: 'Please select the mandal / taluk of your association.',
        type: 'error',
        actionText: 'Select Mandal',
      });
      return;
    }

    setRegisteringAssoc(true);
    try {
      const newAssoc = await registerAssociation(
        {
          name: assocRegForm.name.trim(),
          country: assocRegForm.country.trim() || 'India',
          state: assocRegForm.state.trim(),
          district: assocRegForm.district.trim(),
          mandal: assocRegForm.mandal.trim() || assocRegForm.district.trim(),
          village: assocRegForm.village.trim() || '',
          houseNumber: assocRegForm.houseNumber.trim(),
          logoUrl: assocRegForm.logoUrl.trim(),
          leaderName: assocRegForm.leaderName.trim(),
          leaderPhone: cleanLeaderPhone.slice(-10),
          establishedYear: assocRegForm.establishedYear.trim(),
        },
        false // Do not auto-navigate immediately so user can see their registered code modal!
      );

      const addressParts = [
        newAssoc.houseNumber,
        newAssoc.village,
        newAssoc.mandal,
        newAssoc.district,
        newAssoc.state,
      ].filter(Boolean);

      // Display the code ONLY after receiving confirmation that registration was successful!
      setCreatedCodeInfo({
        name: newAssoc.name,
        code: newAssoc.code,
        leaderName: newAssoc.leaderName || assocRegForm.leaderName,
        fullAddress: addressParts.join(', '),
        logoUrl: newAssoc.logoUrl || assocRegForm.logoUrl,
      });
    } catch {
      // If registration fails, do not generate or display the code. Show an appropriate error message instead.
      setCustomAlert({
        visible: true,
        title: 'Registration Failed',
        message: 'Could not complete registration or save association details to the database. Please check your internet connection and try again.',
        type: 'error',
        actionText: 'Retry',
      });
    } finally {
      setRegisteringAssoc(false);
    }
  };

  const handleShareCode = async (code: string, assocName: string) => {
    try {
      await Share.share({
        message: `Join ${assocName} on ShepherdLink app! Download the app and enter Association Code: *${code}* to connect with all member pastors.`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.contentContainer,
          step === 'REGISTER_ASSOC' && styles.registerAssocContentContainer,
        ]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bounces={true}
        overScrollMode="always"
        nestedScrollEnabled={true}
      >
      {/* Top Bar with Language Dropdown */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {step !== 'LANDING' && (
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => {
                if (step === 'OTP') setStep('PHONE');
                else if (step === 'SIGNUP') setStep(memberMode === 'REGISTER' ? 'ASSOC_CHOICE' : 'OTP');
                else if (step === 'PHONE') setStep('ASSOC_CHOICE');
                else if (step === 'ASSOC_CHOICE') setStep('LANDING');
                else setStep('LANDING');
              }}
            >
              <View style={styles.backButtonIconCircle}>
                <Ionicons name="arrow-back" size={15} color={COLORS.brandNavy} />
              </View>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        {step === 'LANDING' && (
          <View style={styles.langAnchor}>
            <TouchableOpacity
              style={styles.langPill}
              activeOpacity={0.7}
              onPress={() => setShowLangDropdown((prev) => !prev)}
            >
              <Feather name="globe" size={13} color={COLORS.brandTeal} />
              <Text style={styles.langPillText}>{language}</Text>
              <Feather
                name={showLangDropdown ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#94A3B8"
              />
            </TouchableOpacity>

            {/* Simple Dropdown Menu */}
            {showLangDropdown && (
              <View style={styles.simpleDropdownMenu}>
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isActive = language === lang.label;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[styles.dropdownRow, isActive && styles.dropdownRowActive]}
                      onPress={() => {
                        setLanguage(lang.label);
                        setShowLangDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dropdownLabel, isActive && styles.dropdownLabelActive]}>
                        {lang.native}
                      </Text>
                      {isActive && <Feather name="check" size={14} color={COLORS.brandTeal} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Dismiss dropdown when clicking backdrop */}
      {step === 'LANDING' && showLangDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowLangDropdown(false)}>
          <View style={styles.dropdownBackdropOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Brand Logo Presentation - Shown on LANDING only */}
      {step === 'LANDING' && (
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.tagline}>One Fold, One Shepherd</Text>
        </View>
      )}

      {/* ========================================================= */}
      {/* 1. LANDING: JOIN ASSOCIATION OR REGISTER ASSOCIATION       */}
      {/* ========================================================= */}
      {step === 'LANDING' && (
        <View style={styles.landingContainer}>
          {/* OPTION 1: JOIN YOUR ASSOCIATION */}
          <View style={[styles.actionCard, styles.joinCard]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadgeTeal}>
                <Ionicons name="key" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>Join Your Association</Text>
                <Text style={styles.cardSubtitle}>
                  Enter the code provided by your fellowship leadership.
                </Text>
              </View>
            </View>

            {/* Association Code Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputFieldLabel}>ASSOCIATION ACCESS CODE</Text>
              <View style={[styles.codeInputWrap, codeError && styles.codeInputWrapError]}>
                <View style={styles.inputPrefixIcon}>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.brandTeal} />
                </View>
                <TextInput
                  style={styles.codeTextInput}
                  placeholder="e.g. UKUPS"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={assocCodeInput}
                  onChangeText={(text) => {
                    setAssocCodeInput(text);
                    if (codeError) setCodeError(null);
                  }}
                />
                {assocCodeInput.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setAssocCodeInput('');
                      setCodeError(null);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearBtn}
                  >
                    <Feather name="x-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Error Message */}
            {codeError && (
              <View style={styles.inlineErrorRow}>
                <Feather name="alert-circle" size={13} color="#EF4444" />
                <Text style={styles.inlineErrorText}>{codeError}</Text>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleValidateAssocCode}
              disabled={validatingCode}
            >
              {validatingCode ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Continue to Join</Text>
                  <View style={styles.btnArrowCircle}>
                    <Feather name="arrow-right" size={15} color="#FFFFFF" />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* DIVIDER */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OPTION 2: REGISTER YOUR ASSOCIATION */}
          <View style={[styles.actionCard, styles.registerCard]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadgeNavy}>
                <Ionicons name="business" size={24} color="#FBBF24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>Register Your Association</Text>
                <Text style={styles.cardSubtitle}>
                  Create a new association for your pastors fellowship.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => {
                setAssocRegForm({
                  name: '',
                  country: '',
                  state: '',
                  district: '',
                  mandal: '',
                  village: '',
                  houseNumber: '',
                  logoUrl: '',
                  leaderName: '',
                  leaderPhone: '',
                  establishedYear: new Date().getFullYear().toString(),
                });
                setActiveDropdown(null);
                setStep('REGISTER_ASSOC');
              }}
            >
              <Text style={styles.secondaryBtnText}>Register New Association</Text>
              <View style={styles.secondaryBtnArrowCircle}>
                <Feather name="arrow-right" size={15} color={COLORS.brandNavy} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 2. ASSOC_CHOICE: CONFIRM ASSOC & CHOOSE LOGIN OR REGISTER */}
      {/* ========================================================= */}
      {step === 'ASSOC_CHOICE' && validatedAssoc && (
        <View style={styles.landingContainer}>
          {/* Association Confirmed Header Card */}
          <View style={styles.assocContextBannerLarge}>
            {validatedAssoc.logoUrl ? (
              <Image
                source={{ uri: validatedAssoc.logoUrl }}
                style={styles.assocBannerLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.assocBannerLogoPlaceholder}>
                <Ionicons name="business" size={28} color={COLORS.brandTeal} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.codePillRow}>
                <View style={styles.verifiedAssocBadge}>
                  <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
                  <Text style={styles.verifiedAssocText}>CODE: {validatedAssoc.code}</Text>
                </View>
              </View>
              <Text style={styles.assocContextNameLarge} numberOfLines={2}>
                {validatedAssoc.name}
              </Text>
              <Text style={styles.assocContextLocation}>
                {[validatedAssoc.village, validatedAssoc.mandal, validatedAssoc.district, validatedAssoc.state]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          </View>

          <Text style={styles.choiceSectionHeading}>
            Please select your membership option:
          </Text>

          {/* OPTION A: ALREADY A MEMBER? LOGIN */}
          <View style={[styles.actionCard, styles.choiceCardTeal]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadgeTeal}>
                <Ionicons name="log-in" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>Already a Member?</Text>
                <Text style={styles.cardSubtitle}>
                  Login with your registered phone number to access association dashboard, notices, and pastors directory.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => {
                setMemberMode('LOGIN');
                setStep('PHONE');
              }}
            >
              <Text style={styles.primaryBtnText}>Login as Member</Text>
              <View style={styles.btnArrowCircle}>
                <Feather name="arrow-right" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* DIVIDER */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OPTION B: NOT A MEMBER? REGISTER AS MEMBER */}
          <View style={[styles.actionCard, styles.choiceCardGold]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadgeGold}>
                <Ionicons name="person-add" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>Not a Member Yet?</Text>
                <Text style={styles.cardSubtitle}>
                  Register your church and become a certified member pastor in {validatedAssoc.name}.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.goldActionBtn}
              activeOpacity={0.85}
              onPress={() => {
                setMemberMode('REGISTER');
                setSignupForm(INITIAL_SIGNUP_FORM);
                setStep('SIGNUP');
              }}
            >
              <Text style={styles.goldActionBtnText}>Fill Member Registration Form</Text>
              <View style={styles.goldBtnArrowCircle}>
                <Feather name="arrow-right" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 3. PHONE LOGIN SCREEN (FOR VALIDATED ASSOCIATION)          */}
      {/* ========================================================= */}
      {step === 'PHONE' && validatedAssoc && (
        <View style={styles.formContainer}>
          <View style={styles.stepBox}>
            {/* Clean Integrated Association Header */}
            <View style={styles.assocIntegratedHeader}>
              {validatedAssoc.logoUrl ? (
                <Image
                  source={{ uri: validatedAssoc.logoUrl }}
                  style={styles.assocHeaderLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.assocHeaderLogoFallback}>
                  <Ionicons name="business" size={20} color={COLORS.brandTeal} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.assocHeaderName} numberOfLines={2}>
                  {validatedAssoc.name}
                </Text>
                <Text style={styles.assocHeaderLocation}>
                  {[validatedAssoc.village, validatedAssoc.mandal, validatedAssoc.district]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
              <View style={styles.assocHeaderCodePill}>
                <Text style={styles.assocHeaderCodeText}>{validatedAssoc.code}</Text>
              </View>
            </View>

            <View style={styles.screenTitleDivider} />

            <View style={styles.loginTitleRow}>
              <View style={styles.loginTitleIconBadge}>
                <Ionicons name="log-in" size={20} color={COLORS.brandTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldHeading}>Member Phone Login</Text>
                <Text style={styles.fieldSubheading}>
                  Enter your registered mobile number
                </Text>
              </View>
            </View>

            <View style={[styles.unifiedPhoneInput, phoneError && styles.unifiedPhoneInputError]}>
              <View style={styles.prefixBlock}>
                <Text style={styles.flagIcon}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={styles.verticalDivider} />
              <TextInput
                style={styles.phoneTextInput}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (phoneError && text.replace(/\D/g, '').length >= 10) {
                    setPhoneError(false);
                  }
                  const clean = text.replace(/\D/g, '').slice(-10);
                  if (clean.length === 10) {
                    lookupMemberForPhone(clean);
                  } else {
                    setMatchingMember(null);
                  }
                }}
                maxLength={10}
                autoFocus
              />
              {phoneNumber.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setPhoneNumber('');
                    setPhoneError(false);
                    setMatchingMember(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Live Search Indicator */}
            {searchingMember && (
              <View style={styles.memberSearchingBox}>
                <ActivityIndicator size="small" color={COLORS.brandTeal} />
                <Text style={styles.memberSearchingText}>Verifying registered member...</Text>
              </View>
            )}

            {/* Live Verified Member Display - Clean & Simple */}
            {matchingMember && (
              <View style={styles.verifiedMemberRow}>
                <View style={styles.verifiedCheckCircle}>
                  <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />
                </View>
                <Text style={styles.verifiedNameText}>
                  Verified: <Text style={styles.verifiedNameBold}>{matchingMember.name}</Text>
                </Text>
              </View>
            )}

            {/* If 10 digits entered and not found in members */}
            {!searchingMember && !matchingMember && phoneNumber.replace(/\D/g, '').length === 10 && (
              <View style={styles.memberNotFoundCard}>
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberNotFoundText}>
                    Mobile number is not registered in this association.
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 4 }}
                    onPress={() => {
                      setMemberMode('REGISTER');
                      setSignupForm(INITIAL_SIGNUP_FORM);
                      setStep('SIGNUP');
                    }}
                  >
                    <Text style={styles.registerHereLinkText}>
                      Tap here to Fill Registration Form →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {phoneError && (
              <View style={styles.inlineErrorRow}>
                <Feather name="alert-circle" size={13} color="#EF4444" />
                <Text style={styles.inlineErrorText}>
                  Please enter all 10 digits ({phoneNumber.replace(/\D/g, '').length}/10)
                </Text>
              </View>
            )}

            {/* Action Submit Button */}
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleSendOtp}
            >
              <Text style={styles.primaryBtnText}>
                {matchingMember ? `Continue as ${matchingMember.name}` : 'Verify & Login'}
              </Text>
              <View style={styles.btnArrowCircle}>
                <Feather name="arrow-right" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Seamless Switch to Register Member Form */}
            <TouchableOpacity
              style={styles.switchLinkWrap}
              activeOpacity={0.7}
              onPress={() => {
                setMemberMode('REGISTER');
                setSignupForm(INITIAL_SIGNUP_FORM);
                setStep('SIGNUP');
              }}
            >
              <Text style={styles.switchLinkMuted}>Not a member yet? </Text>
              <Text style={styles.switchLinkBold}>Register in this association →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 4. OTP VERIFICATION SCREEN                                 */}
      {/* ========================================================= */}
      {step === 'OTP' && validatedAssoc && (
        <View style={styles.formContainer}>
          <View style={styles.otpStepBox}>

            {/* Association Integrated Header */}
            <View style={styles.assocIntegratedHeader}>
              {validatedAssoc.logoUrl ? (
                <Image
                  source={{ uri: validatedAssoc.logoUrl }}
                  style={styles.assocHeaderLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.assocHeaderLogoFallback}>
                  <Ionicons name="business" size={20} color={COLORS.brandTeal} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.assocHeaderName} numberOfLines={2}>
                  {validatedAssoc.name}
                </Text>
                <Text style={styles.assocHeaderLocation}>
                  {[validatedAssoc.village, validatedAssoc.mandal, validatedAssoc.district]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
              <View style={styles.assocHeaderCodePill}>
                <Text style={styles.assocHeaderCodeText}>{validatedAssoc.code}</Text>
              </View>
            </View>

            {/* Shield Icon + Title */}
            <View style={styles.otpTitleRow}>
              <View style={styles.otpShieldBadge}>
                <Ionicons name="shield-checkmark" size={26} color={COLORS.brandTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.otpTitleText}>SMS Verification</Text>
                <Text style={styles.otpSubtitleText}>
                  Code sent to +91 {phoneNumber}
                  {matchingMember ? ` · ${matchingMember.name}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setStep('PHONE')}
                style={styles.editPhoneBtn}
                activeOpacity={0.7}
              >
                <Feather name="edit-2" size={12} color={COLORS.brandTeal} />
                <Text style={styles.editPhoneText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* 6-Box PIN Display */}
            <View style={styles.otpBoxesRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.otpDigitBox,
                    otpCode.length === i && styles.otpDigitBoxActive,
                    otpCode.length > i && styles.otpDigitBoxFilled,
                  ]}
                >
                  <Text style={styles.otpDigitText}>
                    {otpCode[i] ? otpCode[i] : ''}
                  </Text>
                  {otpCode.length === i && (
                    <View style={styles.otpCursor} />
                  )}
                </View>
              ))}
            </View>

            {/* Hidden real input capturing keystrokes */}
            <TextInput
              style={styles.otpHiddenInput}
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={6}
              autoFocus
              caretHidden
            />

            {/* Demo Hint Notice */}
            <View style={styles.otpDemoHint}>
              <Ionicons name="information-circle" size={14} color="#7C3AED" />
              <Text style={styles.otpDemoHintText}>
                Demo code: <Text style={{ fontWeight: '800' }}>123456</Text> (pre-filled for testing)
              </Text>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, otpCode.length < 6 && styles.primaryBtnDimmed]}
              activeOpacity={0.85}
              onPress={handleVerifyOtp}
              disabled={verifyingOtp}
            >
              {verifyingOtp ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={17} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend Code */}
            <TouchableOpacity
              onPress={() =>
                setCustomAlert({
                  visible: true,
                  title: 'OTP Resent',
                  message: `A fresh 6-digit verification code has been dispatched to +91 ${phoneNumber}.`,
                  type: 'info',
                  actionText: 'Got It',
                })
              }
              style={styles.resendBtn}
            >
              <Ionicons name="refresh" size={14} color={COLORS.brandTeal} />
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 5. REGISTER ASSOCIATION MEMBER FORM                       */}
      {/* ========================================================= */}
      {step === 'SIGNUP' && validatedAssoc && (
        <View style={styles.formContainer}>
          <View style={styles.memberFormCard}>
            {/* Association Verified Header Banner */}
            <View style={styles.memberAssocBanner}>
              {validatedAssoc.logoUrl ? (
                <Image
                  source={{ uri: validatedAssoc.logoUrl }}
                  style={styles.memberAssocLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.memberAssocLogoFallback}>
                  <Ionicons name="business" size={24} color={COLORS.brandTeal} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.memberAssocTopRow}>
                  <View style={styles.memberAssocVerifiedBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#059669" />
                    <Text style={styles.memberAssocVerifiedText}>VERIFIED FELLOWSHIP</Text>
                  </View>
                  <View style={styles.memberAssocCodeBadge}>
                    <Text style={styles.memberAssocCodeText}>{validatedAssoc.code}</Text>
                  </View>
                </View>
                <Text style={styles.memberAssocName} numberOfLines={2}>
                  {validatedAssoc.name}
                </Text>
                <View style={styles.memberAssocLocationRow}>
                  <Ionicons name="location-sharp" size={12} color="#64748B" />
                  <Text style={styles.memberAssocLocationText} numberOfLines={1}>
                    {[validatedAssoc.village, validatedAssoc.mandal, validatedAssoc.district, validatedAssoc.state]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Form Title Row */}
            <View style={styles.memberTitleRow}>
              <View style={styles.memberTitleIconBadge}>
                <Ionicons name="person-add" size={20} color={COLORS.brandTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberTitleHeading}>Register Association Member</Text>
                <Text style={styles.memberTitleSubheading}>
                  Fill pastoral details to connect with all member pastors
                </Text>
              </View>
            </View>

            {/* SECTION 1: PASTORAL & MINISTRY INFO */}
            <View style={styles.memberSectionHeader}>
              <View style={styles.memberSectionIconCircle}>
                <Ionicons name="person" size={12} color={COLORS.brandTeal} />
              </View>
              <Text style={styles.memberSectionHeaderText}>PASTORAL & MINISTRY INFO</Text>
              <View style={styles.memberSectionLine} />
            </View>

            {/* Pastor Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pastor Full Name *</Text>
              <View style={styles.inputWithIconWrap}>
                <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                <TextInput
                  style={styles.inputWithIconField}
                  placeholder="e.g. Pastor Rajesh Kumar"
                  placeholderTextColor="#94A3B8"
                  value={signupForm.name}
                  onChangeText={(text) => setSignupForm((prev) => ({ ...prev, name: text }))}
                />
              </View>
            </View>

            {/* Gender Selection: Male, Female, Others */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender *</Text>
              <View style={styles.genderRow}>
                {(
                  [
                    { key: 'Male', label: 'Male', icon: 'male' },
                    { key: 'Female', label: 'Female', icon: 'female' },
                    { key: 'Others', label: 'Others', icon: 'person' },
                  ] as const
                ).map((item) => {
                  const isSelected = signupForm.gender === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.genderPill, isSelected && styles.genderPillActive]}
                      onPress={() => setSignupForm((prev) => ({ ...prev, gender: item.key }))}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.genderPillText,
                          isSelected && styles.genderPillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date of Birth (Interactive Date Picker) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelBadgeRow}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TouchableOpacity
                  onPress={openDobPicker}
                  activeOpacity={0.7}
                  style={styles.openPickerBadge}
                >
                  <Ionicons name="calendar" size={11} color={COLORS.brandTeal} />
                  <Text style={styles.openPickerBadgeText}>Choose Date</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.inputWithIconWrap,
                  signupForm.dateOfBirth ? styles.inputWithIconWrapActive : null,
                ]}
                activeOpacity={0.75}
                onPress={openDobPicker}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={signupForm.dateOfBirth ? COLORS.brandTeal : '#94A3B8'}
                  style={styles.inputLeftIcon}
                />
                <Text
                  style={[
                    styles.dobPickerFieldText,
                    !signupForm.dateOfBirth && styles.dobPickerFieldPlaceholder,
                  ]}
                >
                  {signupForm.dateOfBirth || 'Select Date of Birth (DD/MM/YYYY)'}
                </Text>
                {signupForm.dateOfBirth ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSignupForm((prev) => ({ ...prev, dateOfBirth: '' }));
                    }}
                    style={{ padding: 4 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                )}
              </TouchableOpacity>
            </View>

            {/* Pastor Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pastor Mobile Number *</Text>
              <View style={styles.unifiedPhoneInput}>
                <View style={styles.prefixBlock}>
                  <Text style={styles.flagIcon}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={styles.verticalDivider} />
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Church / Ministry Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Church / Ministry Name *</Text>
              <View style={styles.inputWithIconWrap}>
                <Ionicons name="business-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                <TextInput
                  style={styles.inputWithIconField}
                  placeholder="e.g. Grace Prayer House"
                  placeholderTextColor="#94A3B8"
                  value={signupForm.churchName}
                  onChangeText={(text) => setSignupForm((prev) => ({ ...prev, churchName: text }))}
                />
              </View>
            </View>

            {/* Denomination with SINGLE +New Button */}
            <View style={styles.inputGroup}>
              <View style={styles.labelBadgeRow}>
                <Text style={styles.inputLabel}>Denomination</Text>
                <TouchableOpacity
                  style={styles.addDenomBadgeBtn}
                  activeOpacity={0.7}
                  onPress={() => setShowNewDenomModal(true)}
                >
                  <Feather name="plus" size={13} color={COLORS.brandTeal} />
                  <Text style={styles.addDenomBadgeText}>Add New</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsRow}
              >
                {denominationsList.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.denomPill,
                      signupForm.denomination === d && styles.denomPillActive,
                    ]}
                    onPress={() => setSignupForm((prev) => ({ ...prev, denomination: d }))}
                  >
                    <Text
                      style={[
                        styles.denomPillText,
                        signupForm.denomination === d && styles.denomPillTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* SECTION 2: CHURCH LOCATION & ADDRESS */}
            <View style={[styles.memberSectionHeader, { marginTop: 8 }]}>
              <View style={styles.memberSectionIconCircle}>
                <Ionicons name="location" size={12} color={COLORS.brandTeal} />
              </View>
              <Text style={styles.memberSectionHeaderText}>CHURCH & RESIDENTIAL LOCATION</Text>
              <View style={styles.memberSectionLine} />
            </View>

            {/* House Address / Door No */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>House Address / Door No.</Text>
              <View style={styles.inputWithIconWrap}>
                <Ionicons name="home-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                <TextInput
                  style={styles.inputWithIconField}
                  placeholder="e.g. D.No 4-12/A, Main Road"
                  placeholderTextColor="#94A3B8"
                  value={signupForm.houseAddress}
                  onChangeText={(text) =>
                    setSignupForm((prev) => ({ ...prev, houseAddress: text }))
                  }
                />
              </View>
            </View>

            {/* State Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>State *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  memberActiveDropdown === 'state' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleMemberDropdown('state')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="map-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !signupForm.state && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {signupForm.state || 'Select State'}
                </Text>
                <Feather
                  name={memberActiveDropdown === 'state' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderMemberInlineDropdownMenu('state')}
            </View>

            {/* District Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>District *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  memberActiveDropdown === 'district' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleMemberDropdown('district')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="location-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !signupForm.district && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {signupForm.district || 'Select District'}
                </Text>
                <Feather
                  name={memberActiveDropdown === 'district' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderMemberInlineDropdownMenu('district')}
            </View>

            {/* Mandal / Taluk Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mandal / Taluk *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  memberActiveDropdown === 'mandal' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleMemberDropdown('mandal')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="trail-sign-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !signupForm.mandal && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {signupForm.mandal || 'Select Mandal / Taluk'}
                </Text>
                <Feather
                  name={memberActiveDropdown === 'mandal' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderMemberInlineDropdownMenu('mandal')}
            </View>

            {/* Village / Town Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Village / Town</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  memberActiveDropdown === 'village' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleMemberDropdown('village')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="home-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !signupForm.village && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {signupForm.village ||
                    (signupForm.mandal
                      ? `Select Village in ${signupForm.mandal}`
                      : 'Select Village / Town')}
                </Text>
                <Feather
                  name={memberActiveDropdown === 'village' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderMemberInlineDropdownMenu('village')}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.memberSubmitBtn}
              activeOpacity={0.88}
              onPress={handleCompleteMemberSignup}
              disabled={registeringMember}
            >
              {registeringMember ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.memberSubmitBtnText}>Register as Member</Text>
                  <View style={styles.memberSubmitBtnIconCircle}>
                    <Feather name="check" size={16} color={COLORS.brandNavy} />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Back to Login Link */}
            <TouchableOpacity
              style={styles.switchLinkWrap}
              activeOpacity={0.7}
              onPress={() => {
                setMemberMode('LOGIN');
                setStep('PHONE');
              }}
            >
              <Text style={styles.switchLinkMuted}>Already registered? </Text>
              <Text style={styles.switchLinkBold}>Login with Phone →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


      {/* ========================================================= */}
      {/* 5. REGISTER YOUR ASSOCIATION FLOW                          */}
      {/* ========================================================= */}
      {step === 'REGISTER_ASSOC' && (
        <View style={styles.formContainer}>
          <View style={styles.adminRuleBanner}>
            <Ionicons name="shield-checkmark" size={20} color="#92400E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.adminRuleTitle}>Founding Admin Rule</Text>
              <Text style={styles.adminRuleDesc}>
                Whoever registers the association becomes the President & Admin. Administrative rights are strictly restricted to President, Secretary, and Treasurer.
              </Text>
            </View>
          </View>

          <View style={styles.stepBox}>
            {/* Form Title Row */}
            <View style={styles.memberTitleRow}>
              <View style={styles.memberTitleIconBadge}>
                <Ionicons name="business" size={20} color={COLORS.brandTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberTitleHeading}>Register New Association</Text>
                <Text style={styles.memberTitleSubheading}>
                  Create a verified fellowship network for member pastors
                </Text>
              </View>
            </View>

            {/* SECTION 1: ASSOCIATION & LEADERSHIP INFO */}
            <View style={styles.memberSectionHeader}>
              <View style={styles.memberSectionIconCircle}>
                <Ionicons name="business" size={12} color={COLORS.brandTeal} />
              </View>
              <Text style={styles.memberSectionHeaderText}>ASSOCIATION & LEADERSHIP INFO</Text>
              <View style={styles.memberSectionLine} />
            </View>

            {/* Association Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Association Name *</Text>
              <View style={styles.inputWithIconWrap}>
                <Ionicons name="business-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                <TextInput
                  style={styles.inputWithIconField}
                  placeholder="e.g. UKUPS Pastors Association"
                  placeholderTextColor="#94A3B8"
                  value={assocRegForm.name}
                  onChangeText={handleAssocNameChange}
                />
              </View>
            </View>

            {/* Association Logo Upload (Emblem / Seal) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelBadgeRow}>
                <Text style={styles.inputLabel}>Association Logo / Official Emblem</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>RECOMMENDED</Text>
                </View>
              </View>

              {assocRegForm.logoUrl ? (
                <View style={styles.logoPreviewCard}>
                  <Image
                    source={{ uri: assocRegForm.logoUrl }}
                    style={styles.logoPreviewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.logoPreviewInfo}>
                    <View style={styles.logoSuccessBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.logoSuccessText}>Logo Selected</Text>
                    </View>
                    <Text style={styles.logoPreviewHint}>
                      Appears on your association banner, certificates & pastor directory.
                    </Text>
                    <View style={styles.logoActionRow}>
                      <TouchableOpacity
                        style={styles.logoChangeBtn}
                        activeOpacity={0.7}
                        onPress={handleSelectLogoSource}
                      >
                        <Feather name="refresh-cw" size={12} color={COLORS.brandNavy} />
                        <Text style={styles.logoChangeBtnText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.logoRemoveBtn}
                        activeOpacity={0.7}
                        onPress={handleRemoveLogo}
                      >
                        <Feather name="trash-2" size={12} color="#DC2626" />
                        <Text style={styles.logoRemoveBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.logoUploadBox}
                  activeOpacity={0.7}
                  onPress={handleSelectLogoSource}
                >
                  <View style={styles.logoUploadIconWrap}>
                    <Ionicons name="cloud-upload-outline" size={24} color={COLORS.brandTeal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logoUploadTitle}>Upload Association Logo</Text>
                    <Text style={styles.logoUploadSub}>
                      Select official seal or emblem from gallery or camera
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Founding President Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>President / Leader Full Name *</Text>
              <View style={styles.inputWithIconWrap}>
                <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                <TextInput
                  style={styles.inputWithIconField}
                  placeholder="e.g. Pastor M. Samuel"
                  placeholderTextColor="#94A3B8"
                  value={assocRegForm.leaderName}
                  onChangeText={(text) =>
                    setAssocRegForm((prev) => ({ ...prev, leaderName: text }))
                  }
                />
              </View>
            </View>

            {/* President Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>President Mobile Number *</Text>
              <View style={styles.unifiedPhoneInput}>
                <View style={styles.prefixBlock}>
                  <Text style={styles.flagIcon}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={styles.verticalDivider} />
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={assocRegForm.leaderPhone}
                  onChangeText={(text) =>
                    setAssocRegForm((prev) => ({ ...prev, leaderPhone: text }))
                  }
                />
              </View>
            </View>

            {/* SECTION 2: HEADQUARTERS & JURISDICTION LOCATION */}
            <View style={[styles.memberSectionHeader, { marginTop: 8 }]}>
              <View style={styles.memberSectionIconCircle}>
                <Ionicons name="location" size={12} color={COLORS.brandTeal} />
              </View>
              <Text style={styles.memberSectionHeaderText}>HEADQUARTERS & JURISDICTION LOCATION</Text>
              <View style={styles.memberSectionLine} />
            </View>

            {/* 1. Nationality Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nationality / Country *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  activeDropdown === 'country' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleDropdown('country')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="flag-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !assocRegForm.country && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {assocRegForm.country || 'Select Nationality / Country'}
                </Text>
                <Feather
                  name={activeDropdown === 'country' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderInlineDropdownMenu('country')}
            </View>

            {/* 2. State Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>State *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  activeDropdown === 'state' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleDropdown('state')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="map-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !assocRegForm.state && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {assocRegForm.state || 'Select State'}
                </Text>
                <Feather
                  name={activeDropdown === 'state' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderInlineDropdownMenu('state')}
            </View>

            {/* 3. District Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>District *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  activeDropdown === 'district' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleDropdown('district')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="location-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !assocRegForm.district && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {assocRegForm.district || 'Select District'}
                </Text>
                <Feather
                  name={activeDropdown === 'district' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderInlineDropdownMenu('district')}
            </View>

            {/* 4. Mandal / Taluk Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mandal / Taluk *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  activeDropdown === 'mandal' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleDropdown('mandal')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="trail-sign-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !assocRegForm.mandal && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {assocRegForm.mandal || 'Select Mandal / Taluk'}
                </Text>
                <Feather
                  name={activeDropdown === 'mandal' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderInlineDropdownMenu('mandal')}
            </View>

            {/* 5. Village / Town Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Village / Town {assocRegForm.mandal ? `(${assocRegForm.mandal})` : ''}
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  activeDropdown === 'village' && styles.dropdownTriggerActive,
                ]}
                onPress={() => toggleDropdown('village')}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="home-outline" size={15} color={COLORS.brandTeal} />
                </View>
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !assocRegForm.village && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {assocRegForm.village ||
                    (assocRegForm.mandal
                      ? `Select Village in ${assocRegForm.mandal}`
                      : 'Select Village / Town')}
                </Text>
                <Feather
                  name={activeDropdown === 'village' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              {renderInlineDropdownMenu('village')}
            </View>

            {/* 6. House Number / Door Number & Street */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>House Address / Door No. & Street</Text>
              <View style={styles.inputWithIconWrap}>
                <Ionicons name="home-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                <TextInput
                  style={styles.inputWithIconField}
                  placeholder="e.g. D.No. 4-12/1, Main Church Road"
                  placeholderTextColor="#94A3B8"
                  value={assocRegForm.houseNumber}
                  onChangeText={(text) =>
                    setAssocRegForm((prev) => ({ ...prev, houseNumber: text }))
                  }
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.memberSubmitBtn}
              activeOpacity={0.88}
              onPress={handleRegisterNewAssociation}
              disabled={registeringAssoc}
            >
              {registeringAssoc ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.memberSubmitBtnText}>
                  Register Association & Become Admin
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.bottomScrollPadding} />
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* MODAL: ASSOCIATION CREATED CODE POPUP                      */}
      {/* ========================================================= */}
      <Modal visible={!!createdCodeInfo} transparent animationType="slide">
        <View style={styles.customAlertBackdrop}>
          <View style={styles.codeSuccessCard}>
            {createdCodeInfo?.logoUrl ? (
              <View style={styles.modalLogoBadgeContainer}>
                <Image
                  source={{ uri: createdCodeInfo.logoUrl }}
                  style={styles.modalLogoBadge}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={styles.codeSuccessIconCircle}>
                <Ionicons name="ribbon" size={28} color="#B45309" />
              </View>
            )}

            <Text style={styles.codeSuccessTitle}>Association Registered!</Text>
            <Text style={styles.codeSuccessSubtitle}>{createdCodeInfo?.name}</Text>

            {/* Glowing Big Code Box */}
            <View style={styles.codeDisplayBox}>
              <Text style={styles.codeDisplayLabel}>ASSOCIATION ACCESS CODE</Text>
              <Text style={styles.codeDisplayText}>{createdCodeInfo?.code}</Text>
              <Text style={styles.codeDisplaySubtext}>
                Members will enter this exact code to join your association
              </Text>
            </View>

            {/* Address Details */}
            {createdCodeInfo?.fullAddress && (
              <View style={styles.addressPreviewBox}>
                <Ionicons name="location-sharp" size={14} color={COLORS.brandTeal} />
                <Text style={styles.addressPreviewText} numberOfLines={2}>
                  {createdCodeInfo.fullAddress}
                </Text>
              </View>
            )}

            <Text style={styles.codeExplanation}>
              As founding President, you have complete administrative control. Share this meaningful code with your fellow pastors now!
            </Text>

            <TouchableOpacity
              style={styles.shareCodeBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (createdCodeInfo) {
                  handleShareCode(createdCodeInfo.code, createdCodeInfo.name);
                }
              }}
            >
              <Feather name="share-2" size={16} color="#FFFFFF" />
              <Text style={styles.shareCodeBtnText}>Share Code with Pastors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneEnterBtn}
              activeOpacity={0.8}
              onPress={() => {
                setCreatedCodeInfo(null);
                navigateTo('home');
              }}
            >
              <Text style={styles.doneEnterBtnText}>Go to Association Dashboard ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: ASSOCIATION LOGO PICKER MODAL                      */}
      {/* ========================================================= */}
      <Modal visible={showLogoModal} transparent animationType="slide">
        <View style={styles.dropdownModalBackdrop}>
          <View style={styles.logoModalContent}>
            <View style={styles.dropdownModalHeader}>
              <View>
                <Text style={styles.dropdownModalTitle}>Association Logo / Emblem</Text>
                <Text style={styles.dropdownModalSubtitle}>
                  Select your official association emblem or symbol
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLogoModal(false)}
                style={styles.dropdownCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Native Gallery & Camera Buttons */}
              <View style={styles.logoActionOptionsRow}>
                <TouchableOpacity
                  style={styles.logoSourceOptionBtn}
                  activeOpacity={0.8}
                  onPress={handlePickLogo}
                >
                  <View style={styles.logoSourceIconBox}>
                    <Ionicons name="images" size={22} color={COLORS.brandTeal} />
                  </View>
                  <Text style={styles.logoSourceOptionLabel}>Phone Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoSourceOptionBtn}
                  activeOpacity={0.8}
                  onPress={handlePickFromCamera}
                >
                  <View style={styles.logoSourceIconBox}>
                    <Ionicons name="camera" size={22} color={COLORS.brandTeal} />
                  </View>
                  <Text style={styles.logoSourceOptionLabel}>Take Photo</Text>
                </TouchableOpacity>
              </View>

              {/* Presets Section */}
              <Text style={styles.logoSectionLabel}>OR SELECT AN EMBLEM PRESET</Text>
              <View style={styles.presetsGrid}>
                {LOGO_PRESETS.map((preset) => {
                  const isSelected = assocRegForm.logoUrl === preset.url;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.presetCard,
                        isSelected && styles.presetCardSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectPresetLogo(preset.url)}
                    >
                      <Image
                        source={{ uri: preset.url }}
                        style={styles.presetImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.presetName} numberOfLines={1}>
                        {preset.name}
                      </Text>
                      {isSelected && (
                        <View style={styles.presetCheckmark}>
                          <Feather name="check" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Image URL Section */}
              <Text style={styles.logoSectionLabel}>OR PASTE IMAGE WEB LINK / URL</Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="https://example.com/logo.png"
                  placeholderTextColor="#94A3B8"
                  value={customLogoUrlInput}
                  onChangeText={setCustomLogoUrlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.customApplyBtn,
                    !customLogoUrlInput.trim() && styles.customApplyBtnDisabled,
                  ]}
                  onPress={handleApplyCustomUrl}
                  disabled={!customLogoUrlInput.trim()}
                >
                  <Text style={styles.customApplyBtnText}>Use URL</Text>
                </TouchableOpacity>
              </View>

              {/* Remove Current Logo Button if selected */}
              {assocRegForm.logoUrl ? (
                <TouchableOpacity
                  style={styles.logoRemoveCurrentBtn}
                  activeOpacity={0.8}
                  onPress={handleRemoveLogo}
                >
                  <Feather name="trash-2" size={14} color="#DC2626" />
                  <Text style={styles.logoRemoveCurrentText}>Remove Current Logo</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: DATE OF BIRTH PICKER MODAL                         */}
      {/* ========================================================= */}
      <Modal visible={showDobPickerModal} transparent animationType="slide">
        <View style={styles.dropdownModalBackdrop}>
          <View style={styles.dobModalContent}>
            {/* Header */}
            <View style={styles.dropdownModalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar" size={18} color={COLORS.brandTeal} />
                  <Text style={styles.dropdownModalTitle}>Select Date of Birth</Text>
                </View>
                <Text style={styles.dropdownModalSubtitle}>
                  Choose your birth date from the calendar
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDobPickerModal(false)}
                style={styles.dropdownCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Selected Date Preview Bar */}
            <View style={styles.dobPreviewBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dobPreviewLabel}>SELECTED DATE OF BIRTH</Text>
                <Text style={styles.dobPreviewValue}>
                  {pickerDay} {MONTH_NAMES[pickerMonth]} {pickerYear}
                </Text>
              </View>
              <View style={styles.dobFormatPill}>
                <Text style={styles.dobFormatPillText}>
                  {padZero(pickerDay)}/{padZero(pickerMonth + 1)}/{pickerYear}
                </Text>
              </View>
            </View>

            {/* Mode Tabs: DAY, MONTH, YEAR */}
            <View style={styles.dobTabRow}>
              <TouchableOpacity
                style={[styles.dobTabBtn, pickerTab === 'DAY' && styles.dobTabBtnActive]}
                onPress={() => setPickerTab('DAY')}
                activeOpacity={0.75}
              >
                <Text style={[styles.dobTabBtnText, pickerTab === 'DAY' && styles.dobTabBtnTextActive]}>
                  Day: {pickerDay}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dobTabBtn, pickerTab === 'MONTH' && styles.dobTabBtnActive]}
                onPress={() => setPickerTab('MONTH')}
                activeOpacity={0.75}
              >
                <Text style={[styles.dobTabBtnText, pickerTab === 'MONTH' && styles.dobTabBtnTextActive]}>
                  Month: {MONTH_SHORT[pickerMonth]}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dobTabBtn, pickerTab === 'YEAR' && styles.dobTabBtnActive]}
                onPress={() => setPickerTab('YEAR')}
                activeOpacity={0.75}
              >
                <Text style={[styles.dobTabBtnText, pickerTab === 'YEAR' && styles.dobTabBtnTextActive]}>
                  Year: {pickerYear}
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT */}
            {pickerTab === 'DAY' && (
              <View style={styles.dobDayContainer}>
                {/* Month/Year Stepper Row */}
                <View style={styles.dobMonthNavRow}>
                  <TouchableOpacity
                    style={styles.dobNavArrowBtn}
                    onPress={() => {
                      if (pickerMonth === 0) {
                        setPickerYear((y) => Math.max(1940, y - 1));
                        setPickerMonth(11);
                      } else {
                        setPickerMonth((m) => m - 1);
                      }
                    }}
                  >
                    <Ionicons name="chevron-back" size={18} color={COLORS.brandNavy} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPickerTab('MONTH')}
                    style={styles.dobMonthTitleBtn}
                  >
                    <Text style={styles.dobMonthTitleText}>
                      {MONTH_NAMES[pickerMonth]} {pickerYear}
                    </Text>
                    <Ionicons name="caret-down" size={12} color="#64748B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dobNavArrowBtn}
                    onPress={() => {
                      if (pickerMonth === 11) {
                        setPickerYear((y) => y + 1);
                        setPickerMonth(0);
                      } else {
                        setPickerMonth((m) => m + 1);
                      }
                    }}
                  >
                    <Ionicons name="chevron-forward" size={18} color={COLORS.brandNavy} />
                  </TouchableOpacity>
                </View>

                {/* Day of Week Headers */}
                <View style={styles.dobWeekdaysRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                    <Text key={i} style={styles.dobWeekdayText}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.dobDaysGrid}>
                  {Array.from({ length: getFirstDayOfMonth(pickerYear, pickerMonth) }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dobDayCellEmpty} />
                  ))}
                  {Array.from({ length: getDaysInMonth(pickerYear, pickerMonth) }).map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected = pickerDay === dayNum;
                    return (
                      <TouchableOpacity
                        key={dayNum}
                        style={[styles.dobDayCell, isSelected && styles.dobDayCellSelected]}
                        onPress={() => setPickerDay(dayNum)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dobDayCellText,
                            isSelected && styles.dobDayCellTextSelected,
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {pickerTab === 'MONTH' && (
              <View style={styles.dobMonthsGrid}>
                {MONTH_NAMES.map((mName, idx) => {
                  const isSelected = pickerMonth === idx;
                  return (
                    <TouchableOpacity
                      key={mName}
                      style={[styles.dobMonthCard, isSelected && styles.dobMonthCardSelected]}
                      onPress={() => {
                        setPickerMonth(idx);
                        const maxD = getDaysInMonth(pickerYear, idx);
                        if (pickerDay > maxD) setPickerDay(maxD);
                        setPickerTab('DAY');
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.dobMonthCardText,
                          isSelected && styles.dobMonthCardTextSelected,
                        ]}
                      >
                        {mName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {pickerTab === 'YEAR' && (
              <ScrollView
                style={styles.dobYearsScroll}
                contentContainerStyle={styles.dobYearsGrid}
                showsVerticalScrollIndicator={true}
              >
                {DOB_YEARS.map((y) => {
                  const isSelected = pickerYear === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[styles.dobYearCard, isSelected && styles.dobYearCardSelected]}
                      onPress={() => {
                        setPickerYear(y);
                        const maxD = getDaysInMonth(y, pickerMonth);
                        if (pickerDay > maxD) setPickerDay(maxD);
                        setPickerTab('MONTH');
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.dobYearCardText,
                          isSelected && styles.dobYearCardTextSelected,
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Bottom Actions */}
            <View style={styles.dobBottomActionsRow}>
              <TouchableOpacity
                style={styles.dobCancelBtn}
                onPress={() => setShowDobPickerModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.dobCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dobConfirmBtn}
                onPress={handleConfirmDob}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.dobConfirmBtnText}>Set Date of Birth</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* ========================================================= */}
      {/* MODAL: CUSTOM ALERT DIALOG                                 */}
      {/* ========================================================= */}
      <Modal visible={!!customAlert?.visible} transparent animationType="fade">
        <View style={styles.customAlertBackdrop}>
          <View style={styles.customAlertCard}>
            <View
              style={[
                styles.alertIconCircle,
                customAlert?.type === 'error' && styles.alertIconCircleError,
                customAlert?.type === 'success' && styles.alertIconCircleSuccess,
                customAlert?.type === 'info' && styles.alertIconCircleInfo,
              ]}
            >
              <Feather
                name={
                  customAlert?.type === 'success'
                    ? 'check-circle'
                    : customAlert?.type === 'info'
                    ? 'info'
                    : 'alert-triangle'
                }
                size={26}
                color={
                  customAlert?.type === 'success'
                    ? '#059669'
                    : customAlert?.type === 'info'
                    ? COLORS.brandTeal
                    : '#DC2626'
                }
              />
            </View>

            <Text style={styles.alertTitle}>{customAlert?.title}</Text>
            <Text style={styles.alertMessage}>{customAlert?.message}</Text>

            <TouchableOpacity
              style={[
                styles.alertActionBtn,
                customAlert?.type === 'error' && styles.alertActionBtnError,
                customAlert?.type === 'success' && styles.alertActionBtnSuccess,
              ]}
              onPress={() => {
                const action = customAlert?.onAction;
                setCustomAlert(null);
                if (action) action();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.alertActionBtnText}>
                {customAlert?.actionText || 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: ADD NEW CUSTOM DENOMINATION                        */}
      {/* ========================================================= */}
      <Modal
        visible={showNewDenomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewDenomModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNewDenomModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.denomModalCard}>
                <View style={styles.denomModalHeader}>
                  <View style={styles.denomModalIcon}>
                    <Feather name="bookmark" size={20} color={COLORS.brandTeal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.denomModalTitle}>Add New Denomination</Text>
                    <Text style={styles.denomModalSubtitle}>
                      Enter name to save in database
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowNewDenomModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.denomModalInputWrap}>
                  <TextInput
                    style={styles.standardInput}
                    placeholder="e.g. Methodist Church, Salvation Army"
                    placeholderTextColor="#94A3B8"
                    value={newDenomInput}
                    onChangeText={setNewDenomInput}
                    autoFocus
                  />
                </View>

                <View style={styles.denomModalActionsRow}>
                  <TouchableOpacity
                    style={styles.denomModalCancelBtn}
                    onPress={() => {
                      setNewDenomInput('');
                      setShowNewDenomModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.denomModalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.denomModalSaveBtn,
                      (!newDenomInput.trim() || savingDenom) && styles.denomModalSaveBtnDisabled,
                    ]}
                    onPress={handleAddNewDenomination}
                    disabled={savingDenom || !newDenomInput.trim()}
                    activeOpacity={0.85}
                  >
                    {savingDenom ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Feather
                          name="check"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.denomModalSaveText}>Add & Select</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ========================================================= */}
      {/* SMALL WELCOME POPUP MODAL                                  */}
      {/* ========================================================= */}
      <Modal
        visible={!!welcomePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setWelcomePopup(null)}
      >
        <View style={styles.popupBackdrop}>
          <View style={styles.smallWelcomePopupCard}>
            <View style={styles.popupCheckCircle}>
              <Ionicons name="checkmark-done" size={26} color="#059669" />
            </View>

            <Text style={styles.popupGreetingText}>Welcome Back!</Text>

            <Text style={styles.popupPastorName} numberOfLines={2}>
              {welcomePopup?.pastor.name}
            </Text>

            <View style={styles.popupRoleBadge}>
              <Ionicons
                name={welcomePopup?.pastor.isAdmin ? 'ribbon' : 'person'}
                size={12}
                color={COLORS.brandTeal}
              />
              <Text style={styles.popupRoleText} numberOfLines={1}>
                {welcomePopup?.pastor.role === 'PRESIDENT'
                  ? 'Founding President'
                  : welcomePopup?.pastor.role === 'SECRETARY'
                  ? 'General Secretary'
                  : welcomePopup?.pastor.role === 'TREASURER'
                  ? 'Treasurer'
                  : 'Member Pastor'}{' '}
                • {welcomePopup?.assoc.name}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.popupContinueBtn}
              activeOpacity={0.88}
              onPress={() => {
                const pastor = welcomePopup?.pastor;
                const assoc = welcomePopup?.assoc;
                setWelcomePopup(null);
                if (pastor && assoc) {
                  const cleanP = pastor.phone
                    ? pastor.phone.replace(/\D/g, '').slice(-10)
                    : phoneNumber.replace(/\D/g, '').slice(-10);
                  loginWithPhone(cleanP, assoc.id, true);
                }
              }}
            >
              <Text style={styles.popupContinueBtnText}>Continue to Dashboard</Text>
              <Feather name="arrow-right" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupSwitchBtn}
              onPress={() => {
                setWelcomePopup(null);
                logout();
                setStep('LANDING');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.popupSwitchText}>Switch account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingWrap: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  registerAssocContentContainer: {
    paddingBottom: 160,
  },
  bottomScrollPadding: {
    height: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    zIndex: 100,
  },
  topBarLeft: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  backButtonIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
    paddingRight: 2,
  },
  langAnchor: {
    position: 'relative',
    zIndex: 101,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  simpleDropdownMenu: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  dropdownRowActive: {
    backgroundColor: COLORS.brandTealSoft,
  },
  dropdownLabel: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '500',
  },
  dropdownLabelActive: {
    color: COLORS.brandTeal,
    fontWeight: '700',
  },
  dropdownBackdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  brandBox: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 16,
  },
  logoBadge: {
    width: 94,
    height: 94,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  landingContainer: {
    gap: 16,
    marginTop: 4,
    width: '100%',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#009B9E',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    gap: 14,
  },
  joinCard: {
    borderWidth: 2,
    borderColor: '#009B9E',
    shadowColor: '#009B9E',
    shadowOpacity: 0.12,
  },
  registerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D97706',
    shadowColor: '#D97706',
    shadowOpacity: 0.15,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconBadgeTeal: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#009B9E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#009B9E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  iconBadgeNavy: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  pillMembers: {
    backgroundColor: '#E0F7F6',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  pillMembersText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007A7C',
    letterSpacing: 0.5,
  },
  pillLeaders: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  pillLeadersText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 17,
  },
  inputSection: {
    gap: 6,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  codeInputWrap: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  codeInputWrapError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputPrefixIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: 1.5,
  },
  clearBtn: {
    padding: 4,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
  },
  inlineErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  primaryBtn: {
    height: 52,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  registerSubmitBtn: {
    height: 56,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  registerSubmitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  btnArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  secondaryBtn: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.brandNavy,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.brandNavy,
    letterSpacing: 0.2,
  },
  secondaryBtnArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 43, 92, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    gap: 12,
    width: '100%',
  },
  assocContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    padding: 14,
    borderRadius: 18,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  assocContextLogoImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  assocContextLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  assocContextBadgeRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  assocContextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.brandTeal,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  assocContextBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  assocContextCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandTeal,
  },
  assocContextName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brandNavy,
    lineHeight: 19,
  },
  assocContextLocation: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stepBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    gap: 14,
    width: '100%',
  },
  otpStepBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
    gap: 16,
    width: '100%',
  },
  stepBoxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  stepBoxIconBadgeTeal: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBoxIconBadgeGold: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  fieldSubheading: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 2,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
  },
  unifiedPhoneInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  unifiedPhoneInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  prefixBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  flagIcon: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginRight: 10,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.ink,
    fontWeight: '600',
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#E0F7F6',
    borderWidth: 1,
    borderColor: '#99E6E8',
  },
  editPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  otpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  otpShieldBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#99E6E8',
  },
  otpTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  otpSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 4,
  },
  otpDigitBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  otpDigitBoxActive: {
    borderColor: COLORS.brandTeal,
    backgroundColor: '#F0FDFA',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  otpDigitBoxFilled: {
    borderColor: COLORS.brandNavy,
    backgroundColor: COLORS.brandNavySoft,
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  otpCursor: {
    position: 'absolute',
    bottom: 10,
    width: 18,
    height: 2,
    backgroundColor: COLORS.brandTeal,
    borderRadius: 1,
  },
  otpHiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  otpDemoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  otpDemoHintText: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '500',
    flex: 1,
  },
  primaryBtnDimmed: {
    opacity: 0.55,
  },
  otpInput: {
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.brandNavy,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.brandNavy,
    backgroundColor: COLORS.brandNavySoft,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  noticeVerifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
  },
  noticeVerifiedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  noticeVerifiedSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  adminRuleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
  },
  adminRuleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  adminRuleDesc: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 15,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  standardInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: '#FAFAFA',
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  denomPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.ground,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  denomPillActive: {
    backgroundColor: COLORS.brandTealSoft,
    borderColor: COLORS.brandTeal,
  },
  denomPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  denomPillTextActive: {
    color: COLORS.brandTeal,
    fontWeight: '700',
  },
  poweredByFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  poweredBySingleLine: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },

  /* Modals */
  customAlertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customAlertCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconCircleError: {
    backgroundColor: '#FEE2E2',
  },
  alertIconCircleSuccess: {
    backgroundColor: '#D1FAE5',
  },
  alertIconCircleInfo: {
    backgroundColor: COLORS.brandTealSoft,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  alertActionBtn: {
    width: '100%',
    height: 46,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  alertActionBtnError: {
    backgroundColor: '#DC2626',
  },
  alertActionBtnSuccess: {
    backgroundColor: '#059669',
  },
  alertActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  codeSuccessCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  codeSuccessIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSuccessTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.ink,
  },
  codeSuccessSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },
  codeDisplayBox: {
    width: '100%',
    backgroundColor: COLORS.brandNavySoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.brandNavy,
    gap: 4,
  },
  codeDisplayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandNavy,
    letterSpacing: 0.5,
  },
  codeDisplayText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.brandNavy,
    letterSpacing: 2,
  },
  codeExplanation: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  shareCodeBtn: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareCodeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneEnterBtn: {
    paddingVertical: 8,
  },
  doneEnterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  // Auto-Generated Code Badge Styles
  labelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  systemGenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  systemGenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.3,
  },
  generatedCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  codeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatedCodeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.brandNavy,
    letterSpacing: 1.5,
  },
  generatedCodeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  regenerateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  // Location Dropdown Triggers
  dropdownTrigger: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dropdownTriggerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  dropdownTriggerActive: {
    borderColor: '#009B9E',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#F0FDFA',
  },
  inlineDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#009B9E',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    marginTop: -2,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inlineDropdownScroll: {
    maxHeight: 280,
  },
  dropdownEmptyState: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  dropdownPlaceholderOptionRow: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginBottom: 6,
  },
  dropdownPlaceholderOptionText: {
    color: '#64748B',
    fontStyle: 'italic',
    fontWeight: '500',
    flex: 1,
  },
  // Dropdown Modal
  dropdownModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
  },
  dropdownModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  dropdownCloseBtn: {
    padding: 4,
  },
  dropdownSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
  },
  dropdownScrollList: {
    maxHeight: 320,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownOptionRowActive: {
    backgroundColor: '#E0F7F6',
  },
  dropdownOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dropdownOptionTextActive: {
    fontWeight: '800',
    color: '#007A7C',
  },
  customOptionBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: 16,
  },
  customOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: '#F8FAFC',
  },
  customApplyBtn: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customApplyBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  customApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // House Number Input Wrap
  houseNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  houseNumberInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.ink,
  },
  // Created Code Details
  codeDisplaySubtext: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  addressPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    width: '100%',
  },
  addressPreviewText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  // Logo Upload & Preview Styles
  optionalBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  logoUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  logoUploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoUploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  logoUploadSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#007A7C',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    shadowColor: '#007A7C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  logoPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoPreviewInfo: {
    flex: 1,
  },
  logoSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  logoSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  logoPreviewHint: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  logoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  logoChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logoChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  logoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logoRemoveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalLogoBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalLogoBadge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#007A7C',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  logoActionOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  logoSourceOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
  },
  logoSourceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSourceOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  logoSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
  },
  presetCardSelected: {
    borderColor: '#007A7C',
    backgroundColor: '#E0F7F6',
  },
  presetImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    textAlign: 'center',
  },
  presetCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007A7C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRemoveCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 18,
    marginBottom: 8,
  },
  logoRemoveCurrentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  assocContextBannerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 6,
    gap: 14,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  assocBannerLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assocBannerLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codePillRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  verifiedAssocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brandNavy,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedAssocText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  assocContextNameLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.brandNavy,
    marginBottom: 2,
  },
  choiceSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginVertical: 4,
    textAlign: 'center',
  },
  choiceCardTeal: {
    borderWidth: 2,
    borderColor: '#009B9E',
    shadowColor: '#009B9E',
    shadowOpacity: 0.12,
  },
  choiceCardGold: {
    borderWidth: 2,
    borderColor: '#D97706',
    shadowColor: '#D97706',
    shadowOpacity: 0.15,
  },
  iconBadgeGold: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  goldActionBtn: {
    height: 52,
    backgroundColor: '#D97706',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  goldActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goldBtnArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberSearchingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  memberSearchingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  memberFoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  memberFoundIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberFoundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  memberFoundBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  memberRoleTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  memberRoleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.3,
  },
  memberFoundName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  memberFoundChurch: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    marginTop: 1,
  },
  memberNotFoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
  },
  memberNotFoundText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 16,
  },
  switchModeSection: {
    marginTop: 4,
    gap: 10,
  },
  switchModeDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  switchModeDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  switchModeDividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  switchModeElevatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  switchModeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchModeIconWrapGold: {
    backgroundColor: '#FEF3C7',
  },
  switchModeIconWrapTeal: {
    backgroundColor: '#E0F7F6',
  },
  switchModeElevatedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  switchModeElevatedSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  switchModeArrowPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchModeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  switchModeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  assocIntegratedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 14,
  },
  assocHeaderLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assocHeaderLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assocHeaderName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandNavy,
    lineHeight: 18,
  },
  assocHeaderLocation: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  assocHeaderCodePill: {
    backgroundColor: COLORS.brandNavy,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assocHeaderCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  verifiedMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  verifiedCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedNameText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
  },
  verifiedNameBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  screenTitleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  loginTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginTitleIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerTitleIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerHereLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  switchLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  switchLinkMuted: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  switchLinkBold: {
    fontSize: 13,
    color: COLORS.brandTeal,
    fontWeight: '700',
  },

  // Denomination Badges & Modal
  addDenomBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  addDenomBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  denomPillAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderStyle: 'dashed',
    borderColor: COLORS.brandTeal,
    backgroundColor: '#F0FDFA',
  },
  denomPillAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  denomModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  denomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  denomModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  denomModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  denomModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  denomModalInputWrap: {
    marginBottom: 20,
  },
  denomModalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  denomModalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  denomModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  denomModalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandTeal,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  denomModalSaveBtnDisabled: {
    opacity: 0.5,
  },
  denomModalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Welcome Card Styles
  welcomeContainer: {
    width: '100%',
    paddingVertical: 10,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  welcomeGlowIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 4,
    borderColor: '#F0FDF4',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  welcomeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 10,
  },
  welcomeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  welcomeGreetingText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  welcomePastorName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.brandNavy,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeFellowshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F7F6',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99E6E8',
    marginBottom: 12,
  },
  welcomeFellowshipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007A7C',
    letterSpacing: 0.2,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  welcomeRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 18,
  },
  welcomeRoleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  welcomeDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  welcomeAssocBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  welcomeAssocLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  welcomeAssocLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeAssocCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  welcomeAssocCodePill: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandTeal,
    backgroundColor: '#CCFBF1',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  welcomeLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  welcomeLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  welcomeLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  welcomeAssocName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brandNavy,
    marginBottom: 2,
  },
  welcomeAssocRegion: {
    fontSize: 12,
    color: '#64748B',
  },
  welcomeDetailsCard: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  welcomeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    minWidth: 60,
  },
  welcomeDetailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  welcomeProceedBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.brandNavy,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  welcomeProceedBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  welcomeProceedBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSwitchLink: {
    paddingVertical: 8,
  },
  welcomeSwitchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Member Registration Card Styles
  memberFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 14,
    width: '100%',
  },
  memberAssocBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  memberAssocLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  memberAssocLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  memberAssocTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  memberAssocVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memberAssocVerifiedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  memberAssocCodeBadge: {
    backgroundColor: COLORS.brandNavy,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  memberAssocCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  memberAssocName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandNavy,
    lineHeight: 18,
  },
  memberAssocLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberAssocLocationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  memberTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  memberTitleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#99E6E8',
  },
  memberTitleHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  memberTitleSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  memberSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  memberSectionIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberSectionHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandTeal,
    letterSpacing: 0.6,
  },
  memberSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  inputWithIconWrap: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  inputLeftIcon: {
    marginRight: 2,
  },
  inputWithIconField: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dropdownIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  memberSubmitBtn: {
    backgroundColor: COLORS.brandNavy,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  memberSubmitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  memberSubmitBtnIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  smallWelcomePopupCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  popupCheckCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  popupGreetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  popupPastorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },
  popupRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 8,
    maxWidth: '100%',
    gap: 5,
  },
  popupRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
    flexShrink: 1,
  },
  popupContinueBtn: {
    backgroundColor: COLORS.brandTeal,
    width: '100%',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  popupContinueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  popupSwitchBtn: {
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  popupSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  genderPillActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  genderPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dobFormatHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  openPickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F7F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  openPickerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  dobPickerFieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dobPickerFieldPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  inputWithIconWrapActive: {
    borderColor: COLORS.brandTeal,
    backgroundColor: '#F0FDFA',
  },
  dobModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dobPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    marginTop: 12,
  },
  dobPreviewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  dobPreviewValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.brandNavy,
    marginTop: 2,
  },
  dobFormatPill: {
    backgroundColor: COLORS.brandTeal,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  dobFormatPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dobTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  dobTabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dobTabBtnActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  dobTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dobTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dobDayContainer: {
    paddingVertical: 4,
  },
  dobMonthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  dobNavArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobMonthTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  dobMonthTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  dobWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dobWeekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dobDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 6,
  },
  dobDayCellEmpty: {
    width: `${100 / 7}%`,
    height: 36,
  },
  dobDayCell: {
    width: `${100 / 7}%`,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobDayCellSelected: {
    backgroundColor: COLORS.brandTeal,
    borderRadius: 18,
  },
  dobDayCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dobDayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dobMonthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  dobMonthCard: {
    width: '31%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dobMonthCardSelected: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  dobMonthCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  dobMonthCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dobYearsScroll: {
    maxHeight: 250,
    marginVertical: 6,
  },
  dobYearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dobYearCard: {
    width: '23%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dobYearCardSelected: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  dobYearCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  dobYearCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dobBottomActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dobCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  dobConfirmBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.brandTeal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dobConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
