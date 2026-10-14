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
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Chip } from '../components/Chip';
import { COLORS } from '../constants/theme';

export const LoginScreen: React.FC = () => {
  const { loginWithPhone, language, setLanguage } = useApp();
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinForm, setJoinForm] = useState({
    name: '',
    church: '',
    mandal: 'Gannavaram',
    district: 'Krishna',
  });

  const languages = ['English', 'తెలుగు', 'हिन्दी', 'More +'];

  const SAMPLE_PASTORS = [
    { name: 'Pastor David', phone: '9440167890', role: 'Secretary', assoc: 'Gannavaram' },
    { name: 'Pastor Joshua', phone: '9848012345', role: 'President', assoc: 'Gannavaram' },
    { name: 'Rev. Abraham', phone: '9849155667', role: 'President', assoc: 'Vijayawada' },
  ];

  const handleSendOtp = () => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setOtpCode('123456'); // Pre-fill sample OTP for smooth testing
    setStep('OTP');
  };

  const handleVerifyOtp = () => {
    if (otpCode.trim().length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code sent to your phone.');
      return;
    }
    loginWithPhone(phoneNumber);
  };

  const handleQuickSelect = (phone: string) => {
    setPhoneNumber(phone);
    setOtpCode('123456');
    setStep('OTP');
  };

  const handleJoinRequest = () => {
    setShowJoinModal(false);
    Alert.alert(
      'Request Submitted',
      `Your request to join ${joinForm.mandal} Pastors Association has been sent to the association leaders for verification.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Branding */}
      <View style={styles.brandBox}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>One Fold, One Shepherd</Text>
      </View>

      {/* Language Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Choose language</Text>
        <View style={styles.chipsRow}>
          {languages.map((lang) => (
            <Chip
              key={lang}
              label={lang}
              isActive={language === lang}
              onPress={() => setLanguage(lang)}
            />
          ))}
        </View>
      </View>

      {step === 'PHONE' ? (
        /* STEP 1: Phone Number Input */
        <View style={styles.section}>
          <Text style={styles.label}>Pastor Mobile Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91 ▾</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit number"
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
            <Text style={styles.primaryBtnText}>Send OTP</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Quick Login Accounts for Testing */}
          <View style={styles.quickAccountsBox}>
            <Text style={styles.quickAccountsTitle}>
              <FontAwesome5 name="user-check" size={11} color={COLORS.brandTeal} /> Quick Test Accounts:
            </Text>
            {SAMPLE_PASTORS.map((p) => (
              <TouchableOpacity
                key={p.phone}
                style={styles.quickPastorPill}
                activeOpacity={0.7}
                onPress={() => handleQuickSelect(p.phone)}
              >
                <View>
                  <Text style={styles.quickPastorName}>{p.name} ({p.role})</Text>
                  <Text style={styles.quickPastorSub}>{p.assoc} • {p.phone}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        /* STEP 2: OTP Verification */
        <View style={styles.section}>
          <View style={styles.otpHeaderRow}>
            <View>
              <Text style={styles.label}>Enter Verification Code</Text>
              <Text style={styles.otpSub}>Sent via SMS to +91 {phoneNumber}</Text>
            </View>
            <TouchableOpacity onPress={() => setStep('PHONE')} style={styles.changePhoneBtn}>
              <Text style={styles.changePhoneText}>Edit</Text>
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
          <Text style={styles.otpDemoHint}>Demo testing code prefilled: 123456</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.8}
            onPress={handleVerifyOtp}
          >
            <Text style={styles.primaryBtnText}>Verify OTP & Sign In</Text>
            <Feather name="check" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Alert.alert('Code Resent', 'A new OTP has been sent to +91 ' + phoneNumber)}
            style={styles.resendBtn}
          >
            <Text style={styles.resendText}>Didn&apos;t get code? Resend OTP</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer / Join Request */}
      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          New pastor? Choose your association when you register. Association leaders
          verify all ordained ministers before grant of access.
        </Text>
        <TouchableOpacity
          onPress={() => setShowJoinModal(true)}
          activeOpacity={0.7}
          style={styles.joinLink}
        >
          <Text style={styles.joinLinkText}>Request to join an association</Text>
        </TouchableOpacity>
      </View>

      {/* Modal: Request to Join */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request to Join Association</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Feather name="x" size={22} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Select your local Mandal pastors association and submit your credentials.
            </Text>

            <Text style={styles.fieldLabel}>Pastor Full Name</Text>
            <TextInput
              style={styles.modalField}
              placeholder="e.g. Pastor John Wesley"
              value={joinForm.name}
              onChangeText={(t) => setJoinForm({ ...joinForm, name: t })}
            />

            <Text style={styles.fieldLabel}>Church Name</Text>
            <TextInput
              style={styles.modalField}
              placeholder="e.g. Grace Fellowship"
              value={joinForm.church}
              onChangeText={(t) => setJoinForm({ ...joinForm, church: t })}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Mandal</Text>
                <TextInput
                  style={styles.modalField}
                  value={joinForm.mandal}
                  onChangeText={(t) => setJoinForm({ ...joinForm, mandal: t })}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fieldLabel}>District</Text>
                <TextInput
                  style={styles.modalField}
                  value={joinForm.district}
                  onChangeText={(t) => setJoinForm({ ...joinForm, district: t })}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleJoinRequest}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Submit Application</Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  brandBox: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  brandLogo: {
    width: 220,
    height: 140,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.brandNavy,
    marginTop: -8,
  },
  section: {
    marginTop: 20,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  countryCode: {
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.field,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ink,
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.field,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.ink,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  changePhoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.brandTealSoft,
  },
  changePhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  otpInput: {
    height: 54,
    borderWidth: 1.5,
    borderColor: COLORS.brandTeal,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    color: COLORS.brandNavy,
    marginTop: 6,
  },
  otpDemoHint: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  resendText: {
    fontSize: 13,
    color: COLORS.brandNavy,
    fontWeight: '600',
  },
  quickAccountsBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  quickAccountsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  quickPastorPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ground,
  },
  quickPastorName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  quickPastorSub: {
    fontSize: 11,
    color: COLORS.muted,
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
    gap: 8,
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  joinLink: {
    paddingVertical: 8,
  },
  joinLinkText: {
    fontSize: 13,
    color: COLORS.brandTeal,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  modalField: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.field,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#FAF9F6',
    color: COLORS.ink,
  },
  row: {
    flexDirection: 'row',
  },
});
