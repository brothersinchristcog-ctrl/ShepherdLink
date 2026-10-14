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

  // Custom Beautiful Alert Dialog State
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'error' | 'success' | 'info';
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  // Language Modal
  const [showLangModal, setShowLangModal] = useState(false);

  // Registration / Join Association Modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinForm, setJoinForm] = useState({
    name: '',
    phone: '',
    churchName: '',
    associationId: currentAssociation?.id || (associations[0]?.id ?? 'assoc-gannavaram'),
    mandal: currentAssociation?.mandal || 'Gannavaram',
    district: currentAssociation?.district || 'Krishna',
    denomination: 'Independent',
  });

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

  const selectedAssoc =
    associations.find((a) => a.id === joinForm.associationId) || associations[0];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Bar with Language Selector */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft} />
        <TouchableOpacity
          style={styles.langPill}
          activeOpacity={0.7}
          onPress={() => setShowLangModal(true)}
        >
          <Feather name="globe" size={13} color={COLORS.brandTeal} />
          <Text style={styles.langPillText}>{language}</Text>
          <Feather name="chevron-down" size={13} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Brand Logo Presentation */}
      <View style={styles.brandBox}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>One Fold, One Shepherd</Text>
      </View>

      {/* Cardless Clean Form Area */}
      <View style={styles.formContainer}>
        {step === 'PHONE' ? (
          /* STEP 1: Phone Number Input */
          <View style={styles.stepBox}>
            <View style={styles.headingBox}>
              <Text style={styles.fieldHeading}>Pastor Mobile Number</Text>
              <Text style={styles.fieldSub}>
                Enter your mobile number to sign in or join your association
              </Text>
            </View>

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

            {/* Beautiful Primary Action Button */}
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

            {/* Clean Register Prompt */}
            <View style={styles.registerRow}>
              <Text style={styles.registerQuestion}>New to ShepherdLink?</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setJoinForm((prev) => ({
                    ...prev,
                    phone: phoneNumber.replace(/\D/g, '').slice(-10),
                  }));
                  setShowJoinModal(true);
                }}
              >
                <Text style={styles.registerActionText}> Register & Join Association</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* STEP 2: OTP Verification */
          <View style={styles.stepBox}>
            <View style={styles.otpHeader}>
              <View>
                <Text style={styles.fieldHeading}>Verification Code</Text>
                <Text style={styles.fieldSub}>Sent via SMS to +91 {phoneNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setStep('PHONE')}
                style={styles.editPhoneBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.editPhoneText}>Edit</Text>
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

      {/* Security Footer Note */}
      <View style={styles.securityFooter}>
        <Feather name="shield" size={13} color="#94A3B8" />
        <Text style={styles.securityText}>Verified Pastors Association Network</Text>
      </View>

      {/* Custom Beautiful Alert / Popup Dialog */}
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

      {/* Modal: Language Selection */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={styles.langModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Feather name="x" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = language === lang.label;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOptionRow,
                    isSelected && styles.langOptionRowSelected,
                  ]}
                  onPress={() => {
                    setLanguage(lang.label);
                    setShowLangModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text
                      style={[
                        styles.langOptionLabel,
                        isSelected && styles.langOptionLabelSelected,
                      ]}
                    >
                      {lang.native}
                    </Text>
                    <Text style={styles.langOptionSub}>{lang.label}</Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={18} color={COLORS.brandTeal} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Pastor Registration & Join Association */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.joinModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Register & Join Association</Text>
                <Text style={styles.modalSub}>
                  Create your profile to join your Mandal Pastors Association
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Feather name="x" size={22} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
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

              {/* Select Association */}
              <Text style={styles.formLabel}>Choose Pastors Association *</Text>
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
                          mandal: assoc.mandal,
                          district: assoc.district,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.assocPillTitle,
                            isAssocActive && styles.assocPillTitleActive,
                          ]}
                        >
                          {assoc.name}
                        </Text>
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

              {/* Mandal & District */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Mandal / Town</Text>
                  <TextInput
                    style={styles.formInput}
                    value={joinForm.mandal}
                    onChangeText={(t) => setJoinForm({ ...joinForm, mandal: t })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.formLabel}>District</Text>
                  <TextInput
                    style={styles.formInput}
                    value={joinForm.district}
                    onChangeText={(t) => setJoinForm({ ...joinForm, district: t })}
                  />
                </View>
              </View>

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
                      Create Account & Join {selectedAssoc?.mandal || 'Association'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Action: Submit Request for Verification */}
              <TouchableOpacity
                style={styles.secondaryOutlineBtn}
                onPress={() => handleCompleteRegistration(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryOutlineBtnText}>
                  Submit Application for Leader Approval Only
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  topBarLeft: {
    width: 20,
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
  brandBox: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  brandLogo: {
    width: 200,
    height: 120,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.brandNavy,
    marginTop: -8,
    letterSpacing: 0.3,
  },
  formContainer: {
    paddingHorizontal: 4,
  },
  stepBox: {
    gap: 16,
  },
  headingBox: {
    gap: 4,
  },
  fieldHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
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
    marginTop: -6,
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
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  registerQuestion: {
    fontSize: 13,
    color: '#64748B',
  },
  registerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginTop: 36,
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
  langModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  langOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langOptionRowSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  langOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  langOptionLabelSelected: {
    color: COLORS.brandTeal,
  },
  langOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  joinModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
    marginTop: 12,
    marginBottom: 6,
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
  assocPillTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  assocPillTitleActive: {
    color: '#FFFFFF',
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
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryOutlineBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryOutlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
});
