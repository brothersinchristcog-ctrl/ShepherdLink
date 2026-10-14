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
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Chip } from '../components/Chip';
import { COLORS } from '../constants/theme';

export const LoginScreen: React.FC = () => {
  const { loginWithPhone, language, setLanguage } = useApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinForm, setJoinForm] = useState({
    name: '',
    church: '',
    mandal: 'Gannavaram',
    district: 'Krishna',
  });

  const languages = ['English', 'తెలుగు', 'हिन्दी', 'More +'];

  const handleSendOtp = () => {
    loginWithPhone(phoneNumber || '9876543210');
  };

  const handleJoinRequest = () => {
    setShowJoinModal(false);
    Alert.alert(
      'Request Submitted',
      'Your request to join Gannavaram Pastors Association has been sent to the association leaders for verification.',
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

      {/* Phone Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Mobile number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+91 ▾</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="98765 43210"
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
        </TouchableOpacity>
      </View>

      {/* Footer / Join Request */}
      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          New here? Choose your association when you register. Its leaders approve you
          before you can see member details.
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
              placeholder="Pastor Name"
              value={joinForm.name}
              onChangeText={(t) => setJoinForm({ ...joinForm, name: t })}
            />

            <Text style={styles.fieldLabel}>Church Name & Village</Text>
            <TextInput
              style={styles.modalField}
              placeholder="e.g. Bethel Church, Gannavaram"
              value={joinForm.church}
              onChangeText={(t) => setJoinForm({ ...joinForm, church: t })}
            />

            <Text style={styles.fieldLabel}>Association (One pastor per association)</Text>
            <View style={[styles.modalField, { justifyContent: 'center' }]}>
              <Text style={{ fontWeight: '600', color: COLORS.accent }}>
                Gannavaram Pastors Association (Krishna Dist)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={handleJoinRequest}
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
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: 'space-between',
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
    marginTop: 24,
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
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.ink,
    backgroundColor: '#FFFFFF',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 36,
    gap: 12,
  },
  footerNote: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
    textAlign: 'center',
  },
  joinLink: {
    paddingVertical: 6,
  },
  joinLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 10,
    marginBottom: 4,
  },
  modalField: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.field,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
});
