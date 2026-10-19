import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { DateBox } from '../components/DateBox';
import { Tag } from '../components/Tag';
import { COLORS } from '../constants/theme';

export const AttendanceScreen: React.FC = () => {
  const {
    pastors,
    selectedEvent,
    attendanceMap,
    toggleAttendance,
    markAllAttendance,
    navigateTo,
  } = useApp();

  const [showQRModal, setShowQRModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  const totalMembers = pastors.length;
  const presentCount = pastors.filter((p) => attendanceMap[p.id]).length;
  const absentCount = totalMembers - presentCount;

  const event = selectedEvent || {
    title: 'Monthly Association Meeting',
    month: 'NOV',
    day: '18',
    venue: 'Grace Baptist Chapel, Mustabad',
    time: '10:00 AM – 1:30 PM',
  };

  const handleSaveAttendance = () => {
    Alert.alert(
      'Attendance Saved',
      `Attendance recorded successfully! Present: ${presentCount}, Absent: ${absentCount}.`,
      [{ text: 'OK', onPress: () => navigateTo('events') }]
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateTo('events')}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Attendance</Text>
      </View>

      {/* Event Overview Card */}
      <View style={styles.eventCard}>
        <DateBox month={event.month} day={event.day} />
        <View style={styles.eventInfo}>
          <Tag label="PRIVATE · MY ASSOCIATION" type="mine" />
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventMeta}>
            {event.venue} · {event.time}
          </Text>
        </View>
      </View>

      {/* Counters: Present, Absent, Members */}
      <View style={styles.countersRow}>
        <View style={styles.counterCard}>
          <Text style={[styles.counterValue, { color: COLORS.accent }]}>
            {presentCount}
          </Text>
          <Text style={styles.counterLabel}>Present</Text>
        </View>

        <View style={styles.counterCard}>
          <Text style={styles.counterValue}>{absentCount}</Text>
          <Text style={styles.counterLabel}>Absent</Text>
        </View>

        <View style={styles.counterCard}>
          <Text style={styles.counterValue}>{totalMembers}</Text>
          <Text style={styles.counterLabel}>Members</Text>
        </View>
      </View>

      {/* Action Buttons: Show QR, Scan QR, Mark All */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.plainBtn}
          onPress={() => setShowQRModal(true)}
          activeOpacity={0.7}
        >
          <Feather name="maximize" size={15} color={COLORS.ink} />
          <Text style={styles.plainBtnText}>Show QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.plainBtn}
          onPress={() => setShowScanModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="qr-code-outline" size={15} color={COLORS.brandTeal} />
          <Text style={[styles.plainBtnText, { color: COLORS.brandNavy, fontWeight: '700' }]}>Scan QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.plainBtn}
          onPress={() => markAllAttendance(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.plainBtnText}>Mark all</Text>
        </TouchableOpacity>
      </View>

      {/* Pastors Attendance Roster List */}
      <View style={styles.list}>
        {pastors.map((pastor, index) => {
          const isPresent = !!attendanceMap[pastor.id];
          const isLast = index === pastors.length - 1;

          return (
            <View
              key={pastor.id}
              style={[styles.memberRow, isLast && styles.memberRowLast]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {pastor.name.replace('Pastor ', '').charAt(0)}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{pastor.name}</Text>
                <Text style={styles.churchSub}>{pastor.churchName}</Text>
              </View>

              <TouchableOpacity
                style={[styles.statusBtn, isPresent ? styles.statusPresent : styles.statusAbsent]}
                onPress={() => toggleAttendance(pastor.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    isPresent ? styles.statusPresentText : styles.statusAbsentText,
                  ]}
                >
                  {isPresent ? 'Present ✓' : 'Absent'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleSaveAttendance}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>Save attendance</Text>
      </TouchableOpacity>

      {/* Modal: QR Code Check-in */}
      <Modal visible={showQRModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.qrTitle}>Pastors Check-in QR</Text>
            <Text style={styles.qrSub}>
              Members scan this with ShepherdLink to record attendance instantly.
            </Text>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code" size={160} color={COLORS.ink} />
              <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
                EVENT CODE: SHEP-2026- Krishna
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { width: '100%', marginTop: 16 }]}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: QR Scanner for Attendance */}
      <Modal visible={showScanModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.qrTitle}>Scan Pastor Check-in QR</Text>
            <Text style={styles.qrSub}>
              Scan member QR code to mark attendance for {event.title}.
            </Text>

            <View style={styles.viewfinderFrame}>
              <View style={[styles.cornerReticle, styles.cornerTL]} />
              <View style={[styles.cornerReticle, styles.cornerTR]} />
              <View style={[styles.cornerReticle, styles.cornerBL]} />
              <View style={[styles.cornerReticle, styles.cornerBR]} />
              <Ionicons name="qr-code-outline" size={64} color="rgba(255,255,255,0.4)" />
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 8 }}>
                Align member QR code within frame
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { width: '100%', marginTop: 14 }]}
              onPress={() => {
                const nextAbsent = pastors.find((p) => !attendanceMap[p.id]);
                if (nextAbsent) {
                  toggleAttendance(nextAbsent.id);
                  Alert.alert('Scanned & Verified!', `Marked ${nextAbsent.name} as PRESENT.`);
                } else {
                  Alert.alert('All Checked In', 'All registered pastors are already marked present.');
                }
                setShowScanModal(false);
              }}
            >
              <Text style={styles.primaryBtnText}>Scan & Mark Present</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.plainBtn, { width: '100%', marginTop: 8, alignItems: 'center' }]}
              onPress={() => setShowScanModal(false)}
            >
              <Text style={[styles.plainBtnText, { color: COLORS.muted }]}>Cancel</Text>
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  eventMeta: {
    fontSize: 13,
    color: COLORS.muted,
  },
  countersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  counterCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
  },
  counterLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  plainBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  plainBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  memberRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
  },
  memberRowLast: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  churchSub: {
    fontSize: 12,
    color: COLORS.muted,
  },
  statusBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPresent: {
    backgroundColor: COLORS.accent,
  },
  statusAbsent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.field,
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusPresentText: {
    color: '#FFFFFF',
  },
  statusAbsentText: {
    color: COLORS.ink,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 6,
  },
  qrSub: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrPlaceholder: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.ground,
    borderRadius: 16,
  },
  viewfinderFrame: {
    width: 200,
    height: 180,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 6,
  },
  cornerReticle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: COLORS.brandTeal,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
});

