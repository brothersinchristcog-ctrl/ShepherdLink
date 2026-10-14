import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { InfoBox } from '../components/InfoBox';
import { Tag } from '../components/Tag';
import { COLORS } from '../constants/theme';

export const ProfileScreen: React.FC = () => {
  const { selectedPastor, navigateTo } = useApp();

  const handleCall = () => {
    Linking.openURL(`tel:${selectedPastor.phone}`).catch(() => {
      Alert.alert('Calling', `Dialing ${selectedPastor.phone}`);
    });
  };

  const handleMessage = () => {
    Linking.openURL(`sms:${selectedPastor.phone}`).catch(() => {
      Alert.alert('Messaging', `Opening SMS to ${selectedPastor.phone}`);
    });
  };

  const handleDirections = () => {
    const query = encodeURIComponent(`${selectedPastor.churchName}, ${selectedPastor.village}, ${selectedPastor.mandal}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {
      Alert.alert('Maps', `Navigating to ${selectedPastor.churchAddress}`);
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        activeOpacity={0.7}
        onPress={() => navigateTo('directory')}
      >
        <Feather name="chevron-left" size={24} color={COLORS.ink} />
      </TouchableOpacity>

      {/* Header Profile Info */}
      <View style={styles.profileHeader}>
        <View style={styles.largeAvatar}>
          <Text style={styles.avatarLabel}>[PHOTO]</Text>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{selectedPastor.name}</Text>
          {selectedPastor.isVerified && (
            <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
          )}
        </View>

        <Text style={styles.churchSub}>
          {selectedPastor.churchName}, {selectedPastor.village}
        </Text>

        <Tag
          label={`${selectedPastor.role} · ${selectedPastor.mandal.toUpperCase()} ASSOCIATION`}
          type="mine"
          size="md"
        />
      </View>

      {/* Action Buttons Row: Call, Message, Directions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleCall} activeOpacity={0.8}>
          <Feather name="phone" size={20} color="#FFFFFF" />
          <Text style={styles.actionBtnPrimaryText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnPlain} onPress={handleMessage} activeOpacity={0.7}>
          <Feather name="message-square" size={20} color={COLORS.ink} />
          <Text style={styles.actionBtnPlainText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnPlain} onPress={handleDirections} activeOpacity={0.7}>
          <Feather name="map-pin" size={20} color={COLORS.ink} />
          <Text style={styles.actionBtnPlainText}>Directions</Text>
        </TouchableOpacity>
      </View>

      {/* Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Association</Text>
          <Text style={styles.detailValue}>{selectedPastor.mandal} Pastors Association</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Church address</Text>
          <Text style={styles.detailValue}>{selectedPastor.churchAddress}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Denomination</Text>
          <Text style={styles.detailValue}>{selectedPastor.denomination}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Ordained</Text>
          <Text style={styles.detailValue}>{selectedPastor.ordainedYear}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>Ministry</Text>
          <Text style={styles.detailValue}>{selectedPastor.ministry}</Text>
        </View>

        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.detailKey}>Languages</Text>
          <Text style={styles.detailValue}>{selectedPastor.languages.join(', ')}</Text>
        </View>
      </View>

      {/* Privacy Notice */}
      <InfoBox
        type="amber"
        icon="lock"
        text="Phone number and address are visible only to verified members of the same association."
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  profileHeader: {
    alignItems: 'center',
    gap: 8,
  },
  largeAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
  },
  churchSub: {
    fontSize: 14,
    color: COLORS.muted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnPlain: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.field,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtnPlainText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  detailRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailKey: {
    fontSize: 14,
    color: COLORS.muted,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    textAlign: 'right',
    flex: 1.5,
  },
});
