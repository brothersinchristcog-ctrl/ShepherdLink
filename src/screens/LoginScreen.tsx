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
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

export const LoginScreen: React.FC = () => {
  const {
    loginWithPhone,
    registerPastor,
    registerAssociation,
    findAssociationByCode,
    submitJoinRequest,
    associations,
    currentAssociation,
    language,
    setLanguage,
  } = useApp();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  // Simple Dropdown State
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // Custom Alert Dialog State
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'error' | 'success' | 'info';
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  // Member Pastor Join Modal State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinForm, setJoinForm] = useState({
    name: '',
    phone: '',
    churchName: '',
    associationCode: '',
    associationId: currentAssociation?.id || (associations[0]?.id ?? 'assoc-gannavaram'),
    mandal: currentAssociation?.mandal || 'Gannavaram',
    district: currentAssociation?.district || 'Krishna',
    denomination: 'Independent',
  });

  // Association Registration Modal State (e.g. UKUPS registration)
  const [showAssocRegModal, setShowAssocRegModal] = useState(false);
  const [assocRegForm, setAssocRegForm] = useState({
    name: '',
    code: '',
    state: 'Andhra Pradesh',
    district: 'Krishna',
    mandal: 'Gannavaram',
    leaderName: '',
    leaderPhone: '',
    establishedYear: new Date().getFullYear().toString(),
  });

  // Success Code Share Dialog State
  const [createdAssocCode, setCreatedAssocCode] = useState<{
    name: string;
    code: string;
  } | null>(null);

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text);
    if (phoneError && text.replace(/\D/g, '').length >= 10) {
      setPhoneError(false);
    }
  };

  const handleSendOtp = () => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setPhoneError(true);
      setCustomAlert({
        visible: true,
        title: 'Invalid Mobile Number',
        message:
          clean.length === 0
            ? 'Please enter your 10-digit mobile number to receive your SMS verification code.'
            : `You entered ${clean.length} digits. A valid Indian mobile number requires exactly 10 digits.`,
        type: 'error',
        actionText: 'Enter 10 Digits',
      });
      return;
    }
    setPhoneError(false);
    setOtpCode('123456');
    setStep('OTP');
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 4) {
      setCustomAlert({
        visible: true,
        title: 'Invalid Verification Code',
        message: 'Please enter the 6-digit code sent to your phone number.',
        type: 'error',
        actionText: 'Check Code',
      });
      return;
    }

    setLoading(true);
    try {
      const isExistingPastor = loginWithPhone(phoneNumber);

      if (!isExistingPastor) {
        setJoinForm((prev) => ({
          ...prev,
          phone: phoneNumber.replace(/\D/g, '').slice(-10),
        }));
        setLoading(false);
        setCustomAlert({
          visible: true,
          title: 'Mobile Verified',
          message: 'Your mobile number is verified. Complete your Pastor Profile to join your Association.',
          type: 'success',
          actionText: 'Complete Profile',
          onAction: () => setShowJoinModal(true),
        });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // Join Pastor using Association Code or Selection
  const handleCompleteRegistration = async (instantEnter: boolean) => {
    if (!joinForm.name.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Name Required',
        message: 'Please enter your full name (e.g. Pastor Rajesh).',
        type: 'error',
        actionText: 'Enter Name',
      });
      return;
    }
    if (!joinForm.churchName.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Church Name Required',
        message: 'Please enter your church or ministry name.',
        type: 'error',
        actionText: 'Enter Church',
      });
      return;
    }

    const targetPhone = joinForm.phone.trim() || phoneNumber.replace(/\D/g, '').slice(-10);
    if (!targetPhone || targetPhone.length < 10) {
      setCustomAlert({
        visible: true,
        title: 'Mobile Required',
        message: 'Please enter a valid 10-digit mobile number.',
        type: 'error',
        actionText: 'Enter Mobile',
      });
      return;
    }

    setLoading(true);
    try {
      if (instantEnter) {
        await registerPastor({
          name: joinForm.name.trim(),
          phone: targetPhone,
          churchName: joinForm.churchName.trim(),
          associationCode: joinForm.associationCode.trim() || undefined,
          associationId: joinForm.associationId,
          mandal: joinForm.mandal.trim(),
          district: joinForm.district.trim(),
          denomination: joinForm.denomination,
        });

        setShowJoinModal(false);
      } else {
        await submitJoinRequest({
          name: joinForm.name.trim(),
          phone: targetPhone,
          churchName: joinForm.churchName.trim(),
          associationId: joinForm.associationId,
          mandal: joinForm.mandal.trim(),
          district: joinForm.district.trim(),
          denomination: joinForm.denomination,
        });

        setShowJoinModal(false);
        setCustomAlert({
          visible: true,
          title: 'Request Submitted',
          message: 'Your membership application has been submitted to association leaders for verification.',
          type: 'success',
          actionText: 'Done',
        });
      }
    } catch {
      setCustomAlert({
        visible: true,
        title: 'Registration Error',
        message: 'Could not complete registration. Please check your connection and try again.',
        type: 'error',
        actionText: 'Retry',
      });
    } finally {
      setLoading(false);
    }
  };

  // Register New Association (e.g. UKUPS)
  const handleRegisterAssociation = async () => {
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
        message: 'Please enter the President or General Secretary name.',
        type: 'error',
        actionText: 'Enter Leader Name',
      });
      return;
    }
    const cleanLeaderPhone = assocRegForm.leaderPhone.replace(/\D/g, '').slice(-10);
    if (cleanLeaderPhone.length < 10) {
      setCustomAlert({
        visible: true,
        title: 'Leader Mobile Required',
        message: 'Please enter a valid 10-digit mobile number for the association leader.',
        type: 'error',
        actionText: 'Enter Mobile',
      });
      return;
    }

    setLoading(true);
    try {
      const created = await registerAssociation({
        name: assocRegForm.name.trim(),
        code: assocRegForm.code.trim() || undefined,
        state: assocRegForm.state.trim() || 'Andhra Pradesh',
        district: assocRegForm.district.trim() || 'Krishna',
        mandal: assocRegForm.mandal.trim() || 'Gannavaram',
        leaderName: assocRegForm.leaderName.trim(),
        leaderPhone: cleanLeaderPhone,
        establishedYear: assocRegForm.establishedYear.trim(),
      });

      setShowAssocRegModal(false);
      setCreatedAssocCode({
        name: created.name,
        code: created.code,
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
      setLoading(false);
    }
  };

  const matchedAssocByCode = joinForm.associationCode.trim()
    ? findAssociationByCode(joinForm.associationCode)
    : null;

  const selectedAssoc =
    matchedAssocByCode ||
    associations.find((a) => a.id === joinForm.associationId) ||
    associations[0];

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
      {/* Top Bar with Simple Dropdown */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft} />
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
                    style={[
                      styles.dropdownRow,
                      isActive && styles.dropdownRowActive,
                    ]}
                    onPress={() => {
                      setLanguage(lang.label);
                      setShowLangDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownLabel,
                        isActive && styles.dropdownLabelActive,
                      ]}
                    >
                      {lang.native}
                    </Text>
                    {isActive && (
                      <Feather name="check" size={14} color={COLORS.brandTeal} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Dismiss dropdown when tapping outside */}
      {showLangDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowLangDropdown(false)}>
          <View style={styles.dropdownBackdropOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Main Body */}
      <View style={styles.mainBody}>
        {/* Brand Logo Presentation */}
        <View style={styles.brandBox}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>One Fold, One Shepherd</Text>
        </View>

        {/* Form Area */}
        <View style={styles.formContainer}>
          {step === 'PHONE' ? (
            /* STEP 1: Phone Number Input */
            <View style={styles.stepBox}>
              <Text style={styles.fieldHeading}>Pastor Mobile Number</Text>

              {/* Unified Phone Input Field with Error Highlight */}
              <View
                style={[
                  styles.unifiedPhoneInput,
                  phoneError && styles.unifiedPhoneInputError,
                ]}
              >
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
                  onChangeText={handlePhoneChange}
                  maxLength={10}
                />
                {phoneNumber.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setPhoneNumber('');
                      setPhoneError(false);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearBtn}
                  >
                    <Feather name="x-circle" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Inline Error Helper */}
              {phoneError && (
                <View style={styles.inlineErrorRow}>
                  <Feather name="alert-circle" size={13} color="#EF4444" />
                  <Text style={styles.inlineErrorText}>
                    {phoneNumber.length === 0
                      ? 'Mobile number is required'
                      : `Please enter all 10 digits (${phoneNumber.replace(/\D/g, '').length}/10)`}
                  </Text>
                </View>
              )}

              {/* Primary Action Button */}
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

              {/* Multi-Association Action Bar */}
              <View style={styles.associationActionsWrap}>
                <TouchableOpacity
                  style={styles.assocActionPill}
                  activeOpacity={0.7}
                  onPress={() => {
                    setJoinForm((prev) => ({
                      ...prev,
                      phone: phoneNumber.replace(/\D/g, '').slice(-10),
                    }));
                    setShowJoinModal(true);
                  }}
                >
                  <Feather name="key" size={14} color={COLORS.brandTeal} />
                  <Text style={styles.assocActionPillText}>Join with Association Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.assocActionPill, styles.assocActionPillLeader]}
                  activeOpacity={0.7}
                  onPress={() => setShowAssocRegModal(true)}
                >
                  <Feather name="plus-circle" size={14} color={COLORS.brandNavy} />
                  <Text style={[styles.assocActionPillText, { color: COLORS.brandNavy }]}>
                    Register New Association
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* STEP 2: OTP Verification */
            <View style={styles.stepBox}>
              <View style={styles.otpHeader}>
                <Text style={styles.fieldHeading}>Verification Code</Text>
                <TouchableOpacity
                  onPress={() => setStep('PHONE')}
                  style={styles.editPhoneBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editPhoneText}>Edit (+91 {phoneNumber})</Text>
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
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Verify OTP & Sign In</Text>
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
                <Text style={styles.resendText}>Resend OTP Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Security Footer Note */}
      <View style={styles.securityFooter}>
        <Feather name="shield" size={13} color="#94A3B8" />
        <Text style={styles.securityText}>Verified Pastors Association Network</Text>
      </View>

      {/* Custom Alert Dialog */}
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
                  customAlert?.type === 'error'
                    ? 'alert-circle'
                    : customAlert?.type === 'success'
                    ? 'check-circle'
                    : 'info'
                }
                size={28}
                color={
                  customAlert?.type === 'error'
                    ? '#EF4444'
                    : customAlert?.type === 'success'
                    ? '#10B981'
                    : COLORS.brandTeal
                }
              />
            </View>

            <Text style={styles.customAlertTitle}>{customAlert?.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert?.message}</Text>

            {customAlert?.type === 'error' && (
              <View style={styles.alertTipBox}>
                <Text style={styles.alertTipText}>
                  💡 Please enter a 10-digit number without +91 or spaces
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.customAlertBtn,
                customAlert?.type === 'error' && styles.customAlertBtnError,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                const action = customAlert?.onAction;
                setCustomAlert(null);
                if (action) {
                  action();
                }
              }}
            >
              <Text style={styles.customAlertBtnText}>
                {customAlert?.actionText || 'Okay, Got It'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 1: Join Association with Code (For Pastors) */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.joinModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Join Association</Text>
                <Text style={styles.modalSub}>
                  Enter association code (e.g. UKUPS) or select from list
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Feather name="x" size={22} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* Unique Association Code Input */}
              <Text style={styles.formLabel}>Association Invitation Code</Text>
              <View style={styles.codeSearchRow}>
                <TextInput
                  style={[styles.formInput, styles.codeSearchInput]}
                  placeholder="e.g. UKUPS"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  value={joinForm.associationCode}
                  onChangeText={(t) =>
                    setJoinForm({ ...joinForm, associationCode: t.toUpperCase() })
                  }
                />
              </View>

              {/* Code Resolution Status Badge */}
              {joinForm.associationCode.trim().length > 0 && (
                <View
                  style={[
                    styles.codeStatusBadge,
                    matchedAssocByCode
                      ? styles.codeStatusBadgeSuccess
                      : styles.codeStatusBadgeWarning,
                  ]}
                >
                  <Feather
                    name={matchedAssocByCode ? 'check-circle' : 'info'}
                    size={15}
                    color={matchedAssocByCode ? '#059669' : '#D97706'}
                  />
                  <Text
                    style={[
                      styles.codeStatusText,
                      matchedAssocByCode
                        ? styles.codeStatusTextSuccess
                        : styles.codeStatusTextWarning,
                    ]}
                  >
                    {matchedAssocByCode
                      ? `Valid: ${matchedAssocByCode.name} (${matchedAssocByCode.mandal}, ${matchedAssocByCode.district})`
                      : 'Association code not found. You can choose from the list below.'}
                  </Text>
                </View>
              )}

              {/* Pastor Full Name */}
              <Text style={styles.formLabel}>Pastor Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Pastor Rajesh Kumar"
                placeholderTextColor="#94A3B8"
                value={joinForm.name}
                onChangeText={(t) => setJoinForm({ ...joinForm, name: t })}
              />

              {/* Mobile Number */}
              <Text style={styles.formLabel}>Mobile Number *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: '#F8FAFC' }]}
                placeholder="10-digit mobile"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={joinForm.phone}
                onChangeText={(t) => setJoinForm({ ...joinForm, phone: t })}
                maxLength={10}
              />

              {/* Church Name */}
              <Text style={styles.formLabel}>Church / Ministry Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Calvary Gospel Church"
                placeholderTextColor="#94A3B8"
                value={joinForm.churchName}
                onChangeText={(t) => setJoinForm({ ...joinForm, churchName: t })}
              />

              {/* Select from Association Directory if no code */}
              {!matchedAssocByCode && (
                <>
                  <Text style={styles.formLabel}>Or Select Existing Association *</Text>
                  <View style={styles.assocPickerContainer}>
                    {associations.map((assoc) => {
                      const isAssocActive = joinForm.associationId === assoc.id;
                      return (
                        <TouchableOpacity
                          key={assoc.id}
                          style={[
                            styles.assocPill,
                            isAssocActive && styles.assocPillActive,
                          ]}
                          onPress={() =>
                            setJoinForm({
                              ...joinForm,
                              associationId: assoc.id,
                              associationCode: assoc.code,
                              mandal: assoc.mandal,
                              district: assoc.district,
                            })
                          }
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.assocPillHeader}>
                              <Text
                                style={[
                                  styles.assocPillTitle,
                                  isAssocActive && styles.assocPillTitleActive,
                                ]}
                              >
                                {assoc.name}
                              </Text>
                              <View style={styles.codeTag}>
                                <Text style={styles.codeTagText}>{assoc.code}</Text>
                              </View>
                            </View>
                            <Text style={styles.assocPillMeta}>
                              {assoc.mandal} • {assoc.district} • {assoc.memberCount} pastors
                            </Text>
                          </View>
                          {isAssocActive && (
                            <Feather name="check-circle" size={18} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Denomination */}
              <Text style={styles.formLabel}>Denomination</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Pentecostal / Baptist / Independent"
                placeholderTextColor="#94A3B8"
                value={joinForm.denomination}
                onChangeText={(t) => setJoinForm({ ...joinForm, denomination: t })}
              />

              {/* Primary Action: Create Account & Enter */}
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => handleCompleteRegistration(true)}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome5 name="check" size={14} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryBtnText}>
                      Join {selectedAssoc?.name || 'Association'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Register New Association (e.g. UKUPS) */}
      <Modal visible={showAssocRegModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.joinModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Register Association</Text>
                <Text style={styles.modalSub}>
                  Onboard your Pastors Association on ShepherdLink
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAssocRegModal(false)}>
                <Feather name="x" size={22} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* Association Full Name */}
              <Text style={styles.formLabel}>Association Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. UKUPS Pastors Association"
                placeholderTextColor="#94A3B8"
                value={assocRegForm.name}
                onChangeText={(t) => {
                  setAssocRegForm({
                    ...assocRegForm,
                    name: t,
                    code: assocRegForm.code || t.replace(/[^A-Za-z]/g, '').slice(0, 6).toUpperCase(),
                  });
                }}
              />

              {/* Preferred Code / Acronym */}
              <Text style={styles.formLabel}>Association Code / Short Acronym *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. UKUPS"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={assocRegForm.code}
                onChangeText={(t) =>
                  setAssocRegForm({ ...assocRegForm, code: t.toUpperCase() })
                }
              />
              <Text style={styles.fieldHint}>
                Members of this association will use this code to join in ShepherdLink.
              </Text>

              {/* President / Secretary Name */}
              <Text style={styles.formLabel}>President / Leader Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Pastor David Wesley"
                placeholderTextColor="#94A3B8"
                value={assocRegForm.leaderName}
                onChangeText={(t) => setAssocRegForm({ ...assocRegForm, leaderName: t })}
              />

              {/* Leader Mobile */}
              <Text style={styles.formLabel}>President Mobile Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="10-digit mobile"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={assocRegForm.leaderPhone}
                onChangeText={(t) => setAssocRegForm({ ...assocRegForm, leaderPhone: t })}
                maxLength={10}
              />

              {/* Mandal & District */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Mandal / City *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Gannavaram"
                    placeholderTextColor="#94A3B8"
                    value={assocRegForm.mandal}
                    onChangeText={(t) => setAssocRegForm({ ...assocRegForm, mandal: t })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.formLabel}>District *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Krishna"
                    placeholderTextColor="#94A3B8"
                    value={assocRegForm.district}
                    onChangeText={(t) => setAssocRegForm({ ...assocRegForm, district: t })}
                  />
                </View>
              </View>

              {/* Established Year */}
              <Text style={styles.formLabel}>Year Established</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2018"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={assocRegForm.establishedYear}
                onChangeText={(t) => setAssocRegForm({ ...assocRegForm, establishedYear: t })}
                maxLength={4}
              />

              {/* Register Association Action */}
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleRegisterAssociation}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome5 name="check" size={14} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryBtnText}>Register Association & Get Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Association Code Created Celebration Dialog */}
      <Modal visible={!!createdAssocCode} transparent animationType="fade">
        <View style={styles.customAlertBackdrop}>
          <View style={styles.customAlertCard}>
            <View style={[styles.alertIconCircle, styles.alertIconCircleSuccess]}>
              <Feather name="award" size={32} color="#10B981" />
            </View>

            <Text style={styles.customAlertTitle}>Association Registered!</Text>
            <Text style={styles.customAlertMessage}>
              {createdAssocCode?.name} is now registered on ShepherdLink.
            </Text>

            {/* Generated Unique Code Box */}
            <View style={styles.uniqueCodeCard}>
              <Text style={styles.uniqueCodeSub}>UNIQUE ASSOCIATION CODE</Text>
              <Text style={styles.uniqueCodeText}>{createdAssocCode?.code}</Text>
              <Text style={styles.uniqueCodeHint}>
                Share this code with your member pastors so they can join {createdAssocCode?.name}.
              </Text>
            </View>

            {/* Share Code Action */}
            <TouchableOpacity
              style={styles.shareCodeBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (createdAssocCode) {
                  handleShareCode(createdAssocCode.code, createdAssocCode.name);
                }
              }}
            >
              <Feather name="share-2" size={16} color="#FFFFFF" />
              <Text style={styles.shareCodeBtnText}>Share Code with Pastors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueToAppBtn}
              activeOpacity={0.7}
              onPress={() => setCreatedAssocCode(null)}
            >
              <Text style={styles.continueToAppBtnText}>Continue to Dashboard &rarr;</Text>
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
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 100,
  },
  topBarLeft: {
    width: 20,
  },
  langAnchor: {
    position: 'relative',
    zIndex: 100,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brandNavy,
  },
  simpleDropdownMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    paddingVertical: 4,
    zIndex: 999,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownRowActive: {
    backgroundColor: '#F0FDFA',
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  dropdownLabelActive: {
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  dropdownBackdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  mainBody: {
    marginTop: 4,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandLogo: {
    width: 190,
    height: 110,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.brandNavy,
    marginTop: -8,
    letterSpacing: 0.3,
  },
  formContainer: {
    paddingHorizontal: 2,
  },
  stepBox: {
    gap: 14,
  },
  fieldHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  unifiedPhoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  unifiedPhoneInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  prefixBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagIcon: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 12,
  },
  phoneTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  clearBtn: {
    padding: 4,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    paddingHorizontal: 4,
  },
  inlineErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  primaryBtn: {
    height: 54,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 6,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  btnArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  associationActionsWrap: {
    gap: 8,
    marginTop: 10,
  },
  assocActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  assocActionPillLeader: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  assocActionPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editPhoneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  editPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  otpInput: {
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.brandTeal,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
    color: '#0F172A',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resendText: {
    fontSize: 13,
    color: COLORS.brandNavy,
    fontWeight: '600',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
    paddingBottom: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  customAlertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  customAlertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  alertIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  alertIconCircleError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  alertIconCircleSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  alertIconCircleInfo: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
  },
  customAlertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  customAlertMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  alertTipBox: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  alertTipText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
  },
  customAlertBtn: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAlertBtnError: {
    backgroundColor: '#0F172A',
  },
  customAlertBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  joinModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  codeSearchRow: {
    marginBottom: 6,
  },
  codeSearchInput: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.brandNavy,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    backgroundColor: '#F0FDFA',
  },
  codeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  codeStatusBadgeSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  codeStatusBadgeWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  codeStatusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  codeStatusTextSuccess: {
    color: '#065F46',
  },
  codeStatusTextWarning: {
    color: '#92400E',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
    marginTop: 10,
    marginBottom: 5,
  },
  fieldHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  formInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.ink,
    backgroundColor: '#FFFFFF',
  },
  formRow: {
    flexDirection: 'row',
  },
  assocPickerContainer: {
    gap: 8,
    marginTop: 4,
  },
  assocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  assocPillActive: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
  },
  assocPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assocPillTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  assocPillTitleActive: {
    color: '#FFFFFF',
  },
  codeTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  assocPillMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalPrimaryBtn: {
    height: 50,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uniqueCodeCard: {
    width: '100%',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#5EEAD4',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uniqueCodeSub: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandTeal,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  uniqueCodeText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    color: COLORS.brandNavy,
  },
  uniqueCodeHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  shareCodeBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#059669',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  shareCodeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueToAppBtn: {
    paddingVertical: 8,
  },
  continueToAppBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
});
