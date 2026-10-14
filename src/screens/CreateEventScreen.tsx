import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { EventScope } from '../types';
import { COLORS } from '../constants/theme';

export const CreateEventScreen: React.FC = () => {
  const { addEvent, currentUser, navigateTo } = useApp();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('2026-11-20');
  const [eventTime, setEventTime] = useState('10:00 AM');
  const [venue, setVenue] = useState('');
  const [visibility, setVisibility] = useState<EventScope>('public');
  const [trackAttendance, setTrackAttendance] = useState(true);

  const handlePublish = () => {
    if (!eventName.trim() || !venue.trim()) {
      Alert.alert('Required Fields', 'Please specify an event name and venue.');
      return;
    }

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const d = new Date(eventDate);
    const month = !isNaN(d.getMonth()) ? monthNames[d.getMonth()] : 'NOV';
    const day = !isNaN(d.getDate()) ? String(d.getDate()).padStart(2, '0') : '20';

    addEvent({
      title: eventName.trim(),
      month,
      day,
      time: eventTime,
      venue: venue.trim(),
      scope: visibility,
      byAssociation: `${currentUser.association} (yours)`,
      isMyAssociation: true,
      trackAttendance,
    });

    Alert.alert('Event Published', 'Your event is now live on the fellowship calendar.');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateTo('events')}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Create event</Text>
      </View>

      {/* Event Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Event name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Monthly Association Meeting"
          placeholderTextColor={COLORS.muted}
          value={eventName}
          onChangeText={setEventName}
        />
      </View>

      {/* Date & Time Row */}
      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.muted}
            value={eventDate}
            onChangeText={setEventDate}
          />
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10:00 AM"
            placeholderTextColor={COLORS.muted}
            value={eventTime}
            onChangeText={setEventTime}
          />
        </View>
      </View>

      {/* Venue */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Venue</Text>
        <TextInput
          style={styles.input}
          placeholder="Church / hall, village"
          placeholderTextColor={COLORS.muted}
          value={venue}
          onChangeText={setVenue}
        />
      </View>

      {/* Visibility Choice */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Who can see this event?</Text>
        <View style={styles.visWrap}>
          {/* Public Option */}
          <TouchableOpacity
            style={[styles.visCard, visibility === 'public' && styles.visCardActive]}
            onPress={() => setVisibility('public')}
            activeOpacity={0.7}
          >
            <Feather name="globe" size={22} color={COLORS.accent} style={{ marginTop: 2 }} />
            <View style={styles.visTextWrap}>
              <Text style={styles.visTitle}>Public</Text>
              <Text style={styles.visSub}>Visible to pastors of all associations</Text>
            </View>
          </TouchableOpacity>

          {/* Private Option */}
          <TouchableOpacity
            style={[styles.visCard, visibility === 'private' && styles.visCardActive]}
            onPress={() => setVisibility('private')}
            activeOpacity={0.7}
          >
            <Feather name="lock" size={22} color={COLORS.accent} style={{ marginTop: 2 }} />
            <View style={styles.visTextWrap}>
              <Text style={styles.visTitle}>Private</Text>
              <Text style={styles.visSub}>
                Only {currentUser.association} members
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Track Attendance Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setTrackAttendance(!trackAttendance)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, trackAttendance && styles.checkboxChecked]}>
          {trackAttendance && <Feather name="check" size={13} color="#FFFFFF" />}
        </View>
        <Text style={styles.checkboxLabel}>Track attendance for this event</Text>
      </TouchableOpacity>

      {/* Publish Button */}
      <TouchableOpacity
        style={styles.publishBtn}
        onPress={handlePublish}
        activeOpacity={0.8}
      >
        <Text style={styles.publishBtnText}>Publish event</Text>
      </TouchableOpacity>
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
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.ink,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  visWrap: {
    gap: 8,
  },
  visCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  visCardActive: {
    borderColor: COLORS.accent,
  },
  visTextWrap: {
    flex: 1,
    gap: 2,
  },
  visTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  visSub: {
    fontSize: 13,
    color: COLORS.muted,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.field,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.ink,
    fontWeight: '500',
  },
  publishBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
