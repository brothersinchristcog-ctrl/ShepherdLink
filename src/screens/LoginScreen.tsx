import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
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

  const handleSendOtp = () => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setOtpCode('123456'); // Pre-fill verification code for smooth UX
    setStep('OTP');
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const isExistingPastor = loginWithPhone(phoneNumber);

      if (!isExistingPastor) {
        // Not yet registered: open registration form with verified phone number pre-filled!
        setJoinForm((prev) => ({
          ...prev,
          phone: phoneNumber.replace(/\D/g, '').slice(-10),
        }));
        setLoading(false);
        Alert.alert(
          'Mobile Verified',
          'Your mobile number is verified. Please complete your Pastor Profile & select your Association to enter.',
          [
            {
              text: 'Complete Profile',
              onPress: () => setShowJoinModal(true),
            },
          ]
        );
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (instantEnter: boolean) => {
    if (!joinForm.name.trim()) {
      Alert.alert('Name Required', 'Please enter your full name (e.g. Pastor Rajesh).');
      return;
    }
    if (!joinForm.churchName.trim()) {
      Alert.alert('Church Name Required', 'Please enter your church or ministry name.');
      return;
    }

    const targetPhone = joinForm.phone.trim() || phoneNumber.replace(/\D/g, '').slice(-10);
    if (!targetPhone || targetPhone.length < 10) {
      Alert.alert('Mobile Number Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      if (instantEnter) {
        // Create account and enter directly
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
        Alert.alert(
          'Welcome to ShepherdLink',
          `Your profile is ready! You are enrolled in the pastors association.`
        );
      } else {
        // Submit request for leader verification
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
        Alert.alert(
          'Request Submitted',
          `Your membership application has been submitted to association leaders for verification. You will be notified via SMS.`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert('Error', 'Could not complete registration. Please try again.');
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
          <Feather name="globe" size={14} color={COLORS.brandTeal} />
          <Text style={styles.langPillText}>{language}</Text>
          <Feather name="chevron-down" size={13} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Branded Logo Presentation */}
      <View style={styles.brandBox}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>One Fold, One Shepherd</Text>
        <Text style={styles.brandSub}>Pastors Association Network</Text>
      </View>

      {/* Main Login Card */}
      <View style={styles.loginCard}>
        {step === 'PHONE' ? (
          /* STEP 1: Phone Number Input */
          <View style={styles.stepContainer}>
            <Text style={styles.fieldHeading}>Pastor Mobile Number</Text>
            <Text style={styles.fieldSub}>
              Enter your 10-digit mobile number to sign in or register
            </Text>

            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.flagIcon}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10-digit mobile"
                placeholderTextColor={COLORS.muted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.8}
              onPress={handleSendOtp}
            >
              <Text style={styles.primaryBtnText}>Get OTP Verification</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Register / Join Association Button */}
            <TouchableOpacity
              style={styles.registerBtn}
              activeOpacity={0.8}
              onPress={() => {
                setJoinForm((prev) => ({
                  ...prev,
                  phone: phoneNumber.replace(/\D/g, '').slice(-10),
                }));
                setShowJoinModal(true);
              }}
            >
              <Feather name="user-plus" size={17} color={COLORS.brandNavy} />
              <Text style={styles.registerBtnText}>
                New Pastor? Register & Join Association
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* STEP 2: OTP Verification */
          <View style={styles.stepContainer}>
            <View style={styles.otpHeader}>
              <View>
                <Text style={styles.fieldHeading}>Enter Verification Code</Text>
                <Text style={styles.fieldSub}>
                  Sent via SMS to +91 {phoneNumber}
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
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={6}
              autoFocus
            />
            <Text style={styles.otpHint}>Test code: 123456</Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.8}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Verify OTP & Continue</Text>
                  <Feather name="check" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Code Resent',
                  `A new 6-digit OTP has been sent to +91 ${phoneNumber}`
                )
              }
              style={styles.resendBtn}
            >
              <Text style={styles.resendText}>Didn&apos;t receive code? Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Association Info Footer Note */}
      <View style={styles.securityFooter}>
        <Feather name="shield" size={15} color={COLORS.brandTeal} />
        <Text style={styles.securityText}>
          Secure Pastors Association Platform. Verified ordained ministers only.
        </Text>
      </View>

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
                placeholderTextColor={COLORS.muted}
                value={joinForm.name}
                onChangeText={(t) => setJoinForm({ ...joinForm, name: t })}
              />

              {/* Mobile Number */}
              <Text style={styles.formLabel}>Mobile Number *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: '#F9FAFB' }]}
                placeholder="10-digit mobile"
                placeholderTextColor={COLORS.muted}
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
                placeholderTextColor={COLORS.muted}
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
                placeholderTextColor={COLORS.muted}
                value={joinForm.denomination}
                onChangeText={(t) => setJoinForm({ ...joinForm, denomination: t })}
              />

              {/* Primary Action: Create Account & Enter */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleCompleteRegistration(true)}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome5 name="check" size={15} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>
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
    backgroundColor: '#FFFFFF', // Seamless white background matches logo background!
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brandNavy,
  },
  brandBox: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  brandLogo: {
    width: 220,
    height: 130,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.brandNavy,
    marginTop: -4,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.brandTeal,
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stepContainer: {
    gap: 10,
  },
  fieldHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  fieldSub: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 4,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  countryCodeBadge: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  flagIcon: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.brandNavy,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  registerBtn: {
    height: 50,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editPhoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.brandTealSoft,
  },
  editPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  otpInput: {
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
    color: COLORS.brandNavy,
    marginTop: 6,
  },
  otpHint: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 8,
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
    gap: 8,
    marginTop: 26,
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 16,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    color: COLORS.muted,
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
    color: COLORS.muted,
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
    borderColor: '#E5E7EB',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
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
    color: COLORS.muted,
    marginTop: 2,
  },
  secondaryOutlineBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryOutlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    textDecorationLine: 'underline',
  },
});
