import React, { useState } from 'react';
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
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';
import { Association } from '../types';
import { FirestoreService } from '../services/firestoreService';

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

type FlowStep = 'LANDING' | 'PHONE' | 'OTP' | 'SIGNUP' | 'REGISTER_ASSOC';

export const LoginScreen: React.FC = () => {
  const {
    loginWithPhone,
    registerPastor,
    registerAssociation,
    findAssociationByCode,
    checkMemberExists,
    language,
    setLanguage,
  } = useApp();

  // Active step in the authentication & registration journey
  const [step, setStep] = useState<FlowStep>('LANDING');

  // Step 1: Association Code input
  const [assocCodeInput, setAssocCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Step 2: The validated Association
  const [validatedAssoc, setValidatedAssoc] = useState<Association | null>(null);

  // Step 3 & 4: Mobile & OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('123456');
  const [phoneError, setPhoneError] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Step 7: Member Sign-Up Form (when phone is not yet an existing member)
  const [signupForm, setSignupForm] = useState({
    name: '',
    churchName: '',
    village: '',
    denomination: 'Independent',
  });
  const [registeringMember, setRegisteringMember] = useState(false);

  // Register Association Form (Section 3)
  const [assocRegForm, setAssocRegForm] = useState({
    name: '',
    code: '',
    state: 'Andhra Pradesh',
    district: '',
    mandal: '',
    leaderName: '',
    leaderPhone: '',
    establishedYear: new Date().getFullYear().toString(),
  });
  const [registeringAssoc, setRegisteringAssoc] = useState(false);

  // Created association code modal for sharing
  const [createdCodeInfo, setCreatedCodeInfo] = useState<{
    name: string;
    code: string;
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
        setStep('PHONE');
        setPhoneNumber('');
        setPhoneError(false);
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

      if (existingMember) {
        // Step 6: If user is an existing member, log them in and grant access!
        const success = loginWithPhone(cleanPhone, validatedAssoc.id);
        if (success) {
          Alert.alert(
            'Welcome Back',
            `Welcome back, ${existingMember.name}! You are logged into ${validatedAssoc.name}.`
          );
        }
      } else {
        // Step 7: Not an existing member -> redirect to member registration sign-up process!
        setSignupForm({
          name: '',
          churchName: '',
          village: validatedAssoc.mandal || '',
          denomination: 'Independent',
        });
        setStep('SIGNUP');
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
        title: 'Name Required',
        message: 'Please enter your full name (e.g. Pastor Rajesh Kumar).',
        type: 'error',
        actionText: 'Enter Name',
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

    if (!validatedAssoc) return;

    setRegisteringMember(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);

      await registerPastor({
        name: signupForm.name.trim(),
        phone: cleanPhone,
        churchName: signupForm.churchName.trim(),
        village: signupForm.village.trim() || validatedAssoc.mandal,
        associationId: validatedAssoc.id,
        associationCode: validatedAssoc.code,
        mandal: validatedAssoc.mandal,
        district: validatedAssoc.district,
        state: validatedAssoc.state,
        denomination: signupForm.denomination,
      });

      Alert.alert(
        'Registration Complete',
        `Welcome to ${validatedAssoc.name}, ${signupForm.name}! Your membership is active.`
      );
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

    if (!assocRegForm.district.trim()) {
      setCustomAlert({
        visible: true,
        title: 'District Required',
        message: 'Please enter the district of your association.',
        type: 'error',
        actionText: 'Enter District',
      });
      return;
    }

    setRegisteringAssoc(true);
    try {
      const newAssoc = await registerAssociation({
        name: assocRegForm.name.trim(),
        code: assocRegForm.code.trim() || undefined,
        state: assocRegForm.state.trim() || 'Andhra Pradesh',
        district: assocRegForm.district.trim(),
        mandal: assocRegForm.mandal.trim() || assocRegForm.district.trim(),
        leaderName: assocRegForm.leaderName.trim(),
        leaderPhone: cleanLeaderPhone.slice(-10),
        establishedYear: assocRegForm.establishedYear.trim(),
      });

      // Show share modal with the generated code
      setCreatedCodeInfo({
        name: newAssoc.name,
        code: newAssoc.code,
      });
    } catch {
      setCustomAlert({
        visible: true,
        title: 'Error',
        message: 'Could not register association. Please try again.',
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
                else if (step === 'SIGNUP') setStep('OTP');
                else setStep('LANDING');
              }}
            >
              <Feather name="arrow-left" size={18} color={COLORS.ink} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

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
      </View>

      {/* Dismiss dropdown when clicking backdrop */}
      {showLangDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowLangDropdown(false)}>
          <View style={styles.dropdownBackdropOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Brand Logo Presentation */}
      <View style={styles.brandBox}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>ShepherdLink</Text>
        <Text style={styles.tagline}>One Fold, One Shepherd</Text>
      </View>

      {/* ========================================================= */}
      {/* 1. LANDING: JOIN ASSOCIATION OR REGISTER ASSOCIATION       */}
      {/* ========================================================= */}
      {step === 'LANDING' && (
        <View style={styles.landingContainer}>
          {/* OPTION 1: JOIN YOUR ASSOCIATION */}
          <View style={styles.actionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCircleTeal}>
                <Feather name="key" size={20} color={COLORS.brandTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>Join Your Association</Text>
                <Text style={styles.cardSubtitle}>
                  Enter the unique Association Code provided by your Pastors Association leadership.
                </Text>
              </View>
            </View>

            {/* Association Code Input */}
            <View style={[styles.codeInputWrap, codeError && styles.codeInputWrapError]}>
              <TextInput
                style={styles.codeTextInput}
                placeholder="Enter Association Code (e.g. UKUPS)"
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
                >
                  <Feather name="x-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
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
              <View style={styles.iconCircleNavy}>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.brandNavy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>Register Your Association</Text>
                <Text style={styles.cardSubtitle}>
                  Want to bring your fellowship or mandal pastors on ShepherdLink? Register a new association and become the Admin.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              onPress={() => setStep('REGISTER_ASSOC')}
            >
              <Feather name="plus-circle" size={16} color={COLORS.brandNavy} />
              <Text style={styles.secondaryBtnText}>Register New Association</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 2. PHONE LOGIN SCREEN (FOR VALIDATED ASSOCIATION)          */}
      {/* ========================================================= */}
      {step === 'PHONE' && validatedAssoc && (
        <View style={styles.formContainer}>
          {/* Association Identifier Badge */}
          <View style={styles.assocContextBanner}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.brandTeal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.assocContextCode}>CODE: {validatedAssoc.code}</Text>
              <Text style={styles.assocContextName}>{validatedAssoc.name}</Text>
              <Text style={styles.assocContextLocation}>
                {validatedAssoc.district}, {validatedAssoc.state}
              </Text>
            </View>
          </View>

          <View style={styles.stepBox}>
            <Text style={styles.fieldHeading}>Pastor Mobile Number</Text>
            <Text style={styles.fieldSubheading}>
              Enter your mobile number to verify membership in {validatedAssoc.name}.
            </Text>

            <View style={[styles.unifiedPhoneInput, phoneError && styles.unifiedPhoneInputError]}>
              <View style={styles.prefixBlock}>
                <Text style={styles.flagIcon}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={styles.verticalDivider} />
              <TextInput
                style={styles.phoneTextInput}
                placeholder="10-digit number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (phoneError && text.replace(/\D/g, '').length >= 10) {
                    setPhoneError(false);
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
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {phoneError && (
              <View style={styles.inlineErrorRow}>
                <Feather name="alert-circle" size={13} color="#EF4444" />
                <Text style={styles.inlineErrorText}>
                  Please enter all 10 digits ({phoneNumber.replace(/\D/g, '').length}/10)
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleSendOtp}
            >
              <Text style={styles.primaryBtnText}>Get OTP Verification</Text>
              <View style={styles.btnArrowCircle}>
                <Feather name="arrow-right" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 3. OTP VERIFICATION SCREEN                                 */}
      {/* ========================================================= */}
      {step === 'OTP' && validatedAssoc && (
        <View style={styles.formContainer}>
          <View style={styles.stepBox}>
            <View style={styles.otpHeader}>
              <View>
                <Text style={styles.fieldHeading}>Verification Code</Text>
                <Text style={styles.fieldSubheading}>
                  Sent to +91 {phoneNumber} for {validatedAssoc.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setStep('PHONE')}
                style={styles.editPhoneBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.editPhoneText}>Change</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.otpInput}
              placeholder="123456"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleVerifyOtp}
              disabled={verifyingOtp}
            >
              {verifyingOtp ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Verify OTP & Continue</Text>
                  <View style={styles.btnArrowCircle}>
                    <Feather name="check" size={15} color="#FFFFFF" />
                  </View>
                </>
              )}
            </TouchableOpacity>

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
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 4. SIGN-UP PROCESS (FOR NEW MEMBER)                        */}
      {/* ========================================================= */}
      {step === 'SIGNUP' && validatedAssoc && (
        <View style={styles.formContainer}>
          <View style={styles.noticeVerifiedBox}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.brandTeal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeVerifiedTitle}>
                Mobile Number +91 {phoneNumber} Verified!
              </Text>
              <Text style={styles.noticeVerifiedSub}>
                You are not yet registered with {validatedAssoc.name}. Fill in your church details to join.
              </Text>
            </View>
          </View>

          <View style={styles.stepBox}>
            <Text style={styles.formSectionTitle}>Complete Member Registration</Text>

            {/* Pastor Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pastor Full Name *</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. Pastor Rajesh Kumar"
                placeholderTextColor="#94A3B8"
                value={signupForm.name}
                onChangeText={(text) => setSignupForm((prev) => ({ ...prev, name: text }))}
              />
            </View>

            {/* Church Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Church / Ministry Name *</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. Grace Prayer House"
                placeholderTextColor="#94A3B8"
                value={signupForm.churchName}
                onChangeText={(text) => setSignupForm((prev) => ({ ...prev, churchName: text }))}
              />
            </View>

            {/* Village / Town */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Village / Town</Text>
              <TextInput
                style={styles.standardInput}
                placeholder={`e.g. ${validatedAssoc.mandal}`}
                placeholderTextColor="#94A3B8"
                value={signupForm.village}
                onChangeText={(text) => setSignupForm((prev) => ({ ...prev, village: text }))}
              />
            </View>

            {/* Denomination Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Denomination</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {DENOMINATIONS.map((d) => (
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

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleCompleteMemberSignup}
              disabled={registeringMember}
            >
              {registeringMember ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Complete & Join Association</Text>
                  <View style={styles.btnArrowCircle}>
                    <Feather name="check" size={15} color="#FFFFFF" />
                  </View>
                </>
              )}
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
            <Text style={styles.formSectionTitle}>Register New Association</Text>

            {/* Association Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Association Name *</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. UKUPS Pastors Association"
                placeholderTextColor="#94A3B8"
                value={assocRegForm.name}
                onChangeText={(text) => {
                  setAssocRegForm((prev) => ({
                    ...prev,
                    name: text,
                    code: prev.code ? prev.code : text.replace(/[^A-Za-z]/g, '').slice(0, 6).toUpperCase(),
                  }));
                }}
              />
            </View>

            {/* Preferred Association Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Association Code (Members will use this to join) *</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. UKUPS"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={assocRegForm.code}
                onChangeText={(text) =>
                  setAssocRegForm((prev) => ({ ...prev, code: text.toUpperCase() }))
                }
              />
            </View>

            {/* Founding President Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>President / Leader Full Name *</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. Pastor M. Samuel"
                placeholderTextColor="#94A3B8"
                value={assocRegForm.leaderName}
                onChangeText={(text) =>
                  setAssocRegForm((prev) => ({ ...prev, leaderName: text }))
                }
              />
            </View>

            {/* President Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>President Mobile Number (10 digits) *</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="98480 12345"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={assocRegForm.leaderPhone}
                onChangeText={(text) =>
                  setAssocRegForm((prev) => ({ ...prev, leaderPhone: text }))
                }
              />
            </View>

            {/* District */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>District *</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. Belagavi / Krishna"
                placeholderTextColor="#94A3B8"
                value={assocRegForm.district}
                onChangeText={(text) =>
                  setAssocRegForm((prev) => ({ ...prev, district: text }))
                }
              />
            </View>

            {/* Mandal / Taluk */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mandal / Taluk / City</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. Gokak / Gannavaram"
                placeholderTextColor="#94A3B8"
                value={assocRegForm.mandal}
                onChangeText={(text) =>
                  setAssocRegForm((prev) => ({ ...prev, mandal: text }))
                }
              />
            </View>

            {/* State */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="e.g. Karnataka / Andhra Pradesh"
                placeholderTextColor="#94A3B8"
                value={assocRegForm.state}
                onChangeText={(text) =>
                  setAssocRegForm((prev) => ({ ...prev, state: text }))
                }
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleRegisterNewAssociation}
              disabled={registeringAssoc}
            >
              {registeringAssoc ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Register Association & Become Admin</Text>
                  <View style={styles.btnArrowCircle}>
                    <Feather name="shield" size={15} color="#FFFFFF" />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Powered by Footer */}
      <View style={styles.poweredByFooter}>
        <Text style={styles.poweredBySingleLine}>Powered by Covenant Synergy Pvt Ltd</Text>
      </View>

      {/* ========================================================= */}
      {/* MODAL: ASSOCIATION CREATED CODE POPUP                      */}
      {/* ========================================================= */}
      <Modal visible={!!createdCodeInfo} transparent animationType="slide">
        <View style={styles.customAlertBackdrop}>
          <View style={styles.codeSuccessCard}>
            <View style={styles.codeSuccessIconCircle}>
              <Ionicons name="ribbon" size={28} color="#B45309" />
            </View>

            <Text style={styles.codeSuccessTitle}>Association Registered!</Text>
            <Text style={styles.codeSuccessSubtitle}>{createdCodeInfo?.name}</Text>

            <View style={styles.codeDisplayBox}>
              <Text style={styles.codeDisplayLabel}>SHARE THIS CODE WITH PASTORS</Text>
              <Text style={styles.codeDisplayText}>{createdCodeInfo?.code}</Text>
            </View>

            <Text style={styles.codeExplanation}>
              Pastors can enter this code in ShepherdLink to join {createdCodeInfo?.name}. As President, you have full admin rights.
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
              onPress={() => setCreatedCodeInfo(null)}
            >
              <Text style={styles.doneEnterBtnText}>Go to Association Dashboard</Text>
            </TouchableOpacity>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
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
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
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
    paddingTop: 4,
    paddingBottom: 16,
  },
  brandLogo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.brandNavy,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  landingContainer: {
    gap: 16,
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  registerCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircleTeal: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.brandTealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleNavy: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.brandNavySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
    lineHeight: 17,
  },
  codeInputWrap: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  codeInputWrapError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  codeTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: 1,
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
    height: 50,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.brandNavy,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  formContainer: {
    gap: 12,
  },
  assocContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.brandTealSoft,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    padding: 12,
    borderRadius: 14,
  },
  assocContextCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandTeal,
  },
  assocContextName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 1,
  },
  assocContextLocation: {
    fontSize: 11,
    color: COLORS.muted,
  },
  stepBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  fieldHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  fieldSubheading: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.ground,
  },
  editPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
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
    alignItems: 'center',
    paddingVertical: 6,
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
});
