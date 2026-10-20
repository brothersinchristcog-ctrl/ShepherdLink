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
  Platform,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { EventScope, AssociationEvent } from '../types';
import { COLORS } from '../constants/theme';
import { EventQRCodeModal } from '../components/EventQRCodeModal';

// Safely load expo-image-picker to avoid fatal crashes in dev clients without recompiled native binary
let SafeImagePicker: typeof import('expo-image-picker') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SafeImagePicker = require('expo-image-picker');
} catch {
  SafeImagePicker = null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Circular Clock Configuration
const CLOCK_RADIUS = 90;
const CLOCK_CENTER = 125;
const CLOCK_ITEM_HALF = 18;

const CLOCK_HOURS = [
  { label: '12', value: '12', index: 0 },
  { label: '1', value: '01', index: 1 },
  { label: '2', value: '02', index: 2 },
  { label: '3', value: '03', index: 3 },
  { label: '4', value: '04', index: 4 },
  { label: '5', value: '05', index: 5 },
  { label: '6', value: '06', index: 6 },
  { label: '7', value: '07', index: 7 },
  { label: '8', value: '08', index: 8 },
  { label: '9', value: '09', index: 9 },
  { label: '10', value: '10', index: 10 },
  { label: '11', value: '11', index: 11 },
].map((item) => {
  const rad = (item.index * 30 - 90) * (Math.PI / 180);
  const left = Math.round(CLOCK_CENTER + CLOCK_RADIUS * Math.cos(rad) - CLOCK_ITEM_HALF);
  const top = Math.round(CLOCK_CENTER + CLOCK_RADIUS * Math.sin(rad) - CLOCK_ITEM_HALF);
  return { ...item, left, top };
});

const CLOCK_MINUTES = [
  { label: '00', value: '00', index: 0 },
  { label: '05', value: '05', index: 1 },
  { label: '10', value: '10', index: 2 },
  { label: '15', value: '15', index: 3 },
  { label: '20', value: '20', index: 4 },
  { label: '25', value: '25', index: 5 },
  { label: '30', value: '30', index: 6 },
  { label: '35', value: '35', index: 7 },
  { label: '40', value: '40', index: 8 },
  { label: '45', value: '45', index: 9 },
  { label: '50', value: '50', index: 10 },
  { label: '55', value: '55', index: 11 },
].map((item) => {
  const rad = (item.index * 30 - 90) * (Math.PI / 180);
  const left = Math.round(CLOCK_CENTER + CLOCK_RADIUS * Math.cos(rad) - CLOCK_ITEM_HALF);
  const top = Math.round(CLOCK_CENTER + CLOCK_RADIUS * Math.sin(rad) - CLOCK_ITEM_HALF);
  return { ...item, left, top };
});

const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const dayName = DAYS_OF_WEEK[d.getDay()] || '';
  const monthShort = MONTH_SHORT[month] || '';
  return `${dayName}, ${day} ${monthShort} ${year}`;
};

export const CreateEventScreen: React.FC = () => {
  const { addEvent, currentUser, navigateTo } = useApp();

  // Form Fields
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [visibility, setVisibility] = useState<EventScope>('public');
  const [trackAttendance, setTrackAttendance] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Two Date Pickers: Start Date and End Date
  const [startDate, setStartDate] = useState('2026-11-20');
  const [endDate, setEndDate] = useState('2026-11-20');

  // Two Time Pickers: Start Time and End Time
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('01:30 PM');

  const handlePickThumbnail = async () => {
    if (!SafeImagePicker) {
      Alert.alert('Module Not Available', 'Image picker is not available on this device.');
      return;
    }

    try {
      const permission = await SafeImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow access to your photo library to select an event thumbnail banner.'
        );
        return;
      }

      const result = await SafeImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const finalUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setThumbnailUrl(finalUri);
      }
    } catch {
      Alert.alert('Error', 'Unable to pick image from gallery.');
    }
  };

  const handleTakeThumbnailPhoto = async () => {
    if (!SafeImagePicker) {
      Alert.alert('Module Not Available', 'Camera is not available on this device.');
      return;
    }

    try {
      const permission = await SafeImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission Needed', 'Please allow camera access to take a photo.');
        return;
      }

      const result = await SafeImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const finalUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setThumbnailUrl(finalUri);
      }
    } catch {
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const handleChooseThumbnailOptions = () => {
    Alert.alert(
      'Event Thumbnail / Banner',
      'Select an option to add an event thumbnail:',
      [
        { text: 'Choose from Gallery', onPress: handlePickThumbnail },
        { text: 'Take Photo', onPress: handleTakeThumbnailPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Picker Modals state: 'startDate' | 'endDate' | 'startTime' | 'endTime' | null
  const [activePicker, setActivePicker] = useState<
    'startDate' | 'endDate' | 'startTime' | 'endTime' | null
  >(null);

  // Created Event QR Modal
  const [publishedEvent, setPublishedEvent] = useState<AssociationEvent | null>(null);
  const [showCreatedQRModal, setShowCreatedQRModal] = useState(false);

  // Calendar Navigator state
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(10); // 0-indexed (10 = November)

  // Clock Picker state
  const [clockMode, setClockMode] = useState<'hours' | 'minutes'>('hours');
  const [tempHour, setTempHour] = useState('10');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempMeridiem, setTempMeridiem] = useState<'AM' | 'PM'>('AM');

  // Check if current user is authorized to create events
  const isAssociationAdmin = Boolean(
    currentUser.permissions?.canCreateEvents
  );

  if (!isAssociationAdmin) {
    return (
      <View style={styles.screen}>
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

        <View style={styles.restrictedWrap}>
          <View style={styles.restrictedIconWrap}>
            <Ionicons name="lock-closed" size={36} color={COLORS.brandNavy} />
          </View>
          <Text style={styles.restrictedTitle}>Admin Access Required</Text>
          <Text style={styles.restrictedSub}>
            Only association administrators (President, Secretary, Treasurer) have permission to create and publish fellowship events.
          </Text>
          <TouchableOpacity
            style={styles.backToEventsBtn}
            onPress={() => navigateTo('events')}
            activeOpacity={0.8}
          >
            <Text style={styles.backToEventsBtnText}>Back to Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Open Date Picker
  const handleOpenDatePicker = (target: 'startDate' | 'endDate') => {
    const currentVal = target === 'startDate' ? startDate : endDate;
    const parts = currentVal.split('-');
    if (parts.length === 3) {
      setCalendarYear(parseInt(parts[0], 10));
      setCalendarMonth(parseInt(parts[1], 10) - 1);
    }
    setActivePicker(target);
  };

  // Open Time Picker (initiates in circular clock mode)
  const handleOpenTimePicker = (target: 'startTime' | 'endTime') => {
    const currentVal = target === 'startTime' ? startTime : endTime;
    const match = currentVal.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      setTempHour(match[1].padStart(2, '0'));
      setTempMinute(match[2].padStart(2, '0'));
      setTempMeridiem(match[3].toUpperCase() as 'AM' | 'PM');
    } else {
      setTempHour('10');
      setTempMinute('00');
      setTempMeridiem('AM');
    }
    setClockMode('hours');
    setActivePicker(target);
  };

  // Select Date in Calendar
  const handleSelectDay = (dayNum: number) => {
    const formattedMonth = String(calendarMonth + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const selectedDateStr = `${calendarYear}-${formattedMonth}-${formattedDay}`;

    if (activePicker === 'startDate') {
      setStartDate(selectedDateStr);
      // Auto-adjust End Date if it is before Start Date
      if (selectedDateStr > endDate) {
        setEndDate(selectedDateStr);
      }
    } else if (activePicker === 'endDate') {
      if (selectedDateStr < startDate) {
        Alert.alert('Invalid Date', 'End Date cannot be before Start Date.');
        return;
      }
      setEndDate(selectedDateStr);
    }
    setActivePicker(null);
  };

  // Confirm Time from Clock Picker
  const handleConfirmTime = () => {
    const formattedTime = `${tempHour}:${tempMinute} ${tempMeridiem}`;
    if (activePicker === 'startTime') {
      setStartTime(formattedTime);
    } else if (activePicker === 'endTime') {
      setEndTime(formattedTime);
    }
    setActivePicker(null);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const handlePublish = () => {
    if (!eventName.trim() || !venue.trim()) {
      Alert.alert('Required Fields', 'Please specify an event name and venue.');
      return;
    }

    const dStart = new Date(startDate);
    const month = !isNaN(dStart.getMonth()) ? MONTH_SHORT[dStart.getMonth()] : 'NOV';
    const startDay = !isNaN(dStart.getDate()) ? String(dStart.getDate()).padStart(2, '0') : '20';

    let dayDisplay = startDay;
    if (startDate !== endDate) {
      const dEnd = new Date(endDate);
      const endDay = !isNaN(dEnd.getDate()) ? String(dEnd.getDate()).padStart(2, '0') : startDay;
      dayDisplay = `${startDay}–${endDay}`;
    }

    const timeDisplay = `${startTime} – ${endTime}`;

    const newEventData = {
      title: eventName.trim(),
      month,
      day: dayDisplay,
      time: timeDisplay,
      venue: venue.trim(),
      scope: visibility,
      byAssociation: `${currentUser.association} (yours)`,
      isMyAssociation: true,
      trackAttendance,
      startDate,
      endDate,
      startTime,
      endTime,
      thumbnailUrl: thumbnailUrl || undefined,
    };

    addEvent(newEventData);

    const created: AssociationEvent = {
      ...newEventData,
      id: `ev-${Date.now()}`,
      associationId: currentUser.associationId || '',
    };
    setPublishedEvent(created);
    setShowCreatedQRModal(true);
  };

  // Calendar Grid helpers
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

  const activeTargetDate = activePicker === 'startDate' ? startDate : endDate;

  // Clock Hand angle calculation
  const parsedHour = parseInt(tempHour, 10);
  const parsedMin = parseInt(tempMinute, 10);
  const clockHandAngle =
    clockMode === 'hours'
      ? (isNaN(parsedHour) ? 0 : parsedHour % 12) * 30
      : (isNaN(parsedMin) ? 0 : (parsedMin % 60) * 6);

  return (
    <View style={styles.screen}>
      <ScrollView
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
          <View>
            <Text style={styles.title}>Create event</Text>
            <Text style={styles.subtitle}>Publish fellowship gathering for pastors</Text>
          </View>
        </View>

        {/* Event Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Event name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Monthly Association Fellowship & Prayer"
            placeholderTextColor="#94A3B8"
            value={eventName}
            onChangeText={setEventName}
          />
        </View>

        {/* Event Thumbnail Banner Upload */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="image" size={18} color={COLORS.brandTeal} />
            <Text style={styles.sectionHeaderTitle}>Event Banner / Thumbnail</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          </View>

          {thumbnailUrl ? (
            <View style={styles.thumbnailPreviewContainer}>
              <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailPreviewImage} resizeMode="cover" />
              <View style={styles.thumbnailActionsRow}>
                <TouchableOpacity
                  style={styles.thumbnailChangeBtn}
                  onPress={handleChooseThumbnailOptions}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-reverse-outline" size={15} color={COLORS.brandNavy} />
                  <Text style={styles.thumbnailChangeBtnText}>Change Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.thumbnailRemoveBtn}
                  onPress={() => setThumbnailUrl(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={styles.thumbnailRemoveBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.thumbnailUploadBox}
              onPress={handleChooseThumbnailOptions}
              activeOpacity={0.8}
            >
              <View style={styles.thumbnailUploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={24} color={COLORS.brandTeal} />
              </View>
              <Text style={styles.thumbnailUploadTitle}>Upload Event Thumbnail</Text>
              <Text style={styles.thumbnailUploadSub}>
                Tap to pick a photo from gallery or take a picture (16:9 banner)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Date Pickers (Start Date & End Date) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="calendar" size={18} color={COLORS.brandTeal} />
            <Text style={styles.sectionHeaderTitle}>Event Dates (Start & End)</Text>
          </View>

          <View style={styles.row}>
            {/* Start Date Picker Trigger */}
            <TouchableOpacity
              style={[styles.pickerTriggerCard, { flex: 1 }]}
              activeOpacity={0.8}
              onPress={() => handleOpenDatePicker('startDate')}
            >
              <View style={styles.pickerTriggerHeader}>
                <Text style={styles.pickerTriggerLabel}>START DATE</Text>
                <Ionicons name="calendar-outline" size={15} color={COLORS.brandTeal} />
              </View>
              <Text style={styles.pickerTriggerValue}>{formatDateDisplay(startDate)}</Text>
              <Text style={styles.pickerTriggerAction}>Tap to choose</Text>
            </TouchableOpacity>

            {/* End Date Picker Trigger */}
            <TouchableOpacity
              style={[styles.pickerTriggerCard, { flex: 1 }]}
              activeOpacity={0.8}
              onPress={() => handleOpenDatePicker('endDate')}
            >
              <View style={styles.pickerTriggerHeader}>
                <Text style={styles.pickerTriggerLabel}>END DATE</Text>
                <Ionicons name="calendar-outline" size={15} color={COLORS.brandNavy} />
              </View>
              <Text style={styles.pickerTriggerValue}>{formatDateDisplay(endDate)}</Text>
              <Text style={styles.pickerTriggerAction}>Tap to choose</Text>
            </TouchableOpacity>
          </View>

          {startDate !== endDate && (
            <View style={styles.multiDayNotice}>
              <Ionicons name="information-circle" size={15} color={COLORS.brandTeal} />
              <Text style={styles.multiDayNoticeText}>
                Multi-day event: {formatDateDisplay(startDate)} to {formatDateDisplay(endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Section: Time Pickers (Start Time & End Time) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time" size={18} color={COLORS.brandTeal} />
            <Text style={styles.sectionHeaderTitle}>Event Times (Clock Pickers)</Text>
          </View>

          <View style={styles.row}>
            {/* Start Time Clock Picker Trigger */}
            <TouchableOpacity
              style={[styles.pickerTriggerCard, { flex: 1 }]}
              activeOpacity={0.8}
              onPress={() => handleOpenTimePicker('startTime')}
            >
              <View style={styles.pickerTriggerHeader}>
                <Text style={styles.pickerTriggerLabel}>START TIME</Text>
                <Ionicons name="time-outline" size={15} color={COLORS.brandTeal} />
              </View>
              <Text style={styles.pickerTriggerValue}>{startTime}</Text>
              <Text style={styles.pickerTriggerAction}>Open Clock</Text>
            </TouchableOpacity>

            {/* End Time Clock Picker Trigger */}
            <TouchableOpacity
              style={[styles.pickerTriggerCard, { flex: 1 }]}
              activeOpacity={0.8}
              onPress={() => handleOpenTimePicker('endTime')}
            >
              <View style={styles.pickerTriggerHeader}>
                <Text style={styles.pickerTriggerLabel}>END TIME</Text>
                <Ionicons name="time-outline" size={15} color={COLORS.brandNavy} />
              </View>
              <Text style={styles.pickerTriggerValue}>{endTime}</Text>
              <Text style={styles.pickerTriggerAction}>Open Clock</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Venue */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Venue & Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Church name / Hall, Village or City"
            placeholderTextColor="#94A3B8"
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
              <View style={[styles.visIconCircle, visibility === 'public' && styles.visIconCircleActive]}>
                <Feather name="globe" size={18} color={visibility === 'public' ? '#FFFFFF' : COLORS.brandTeal} />
              </View>
              <View style={styles.visTextWrap}>
                <Text style={styles.visTitle}>Public Convention</Text>
                <Text style={styles.visSub}>Visible to pastors from all associations</Text>
              </View>
            </TouchableOpacity>

            {/* Private Option */}
            <TouchableOpacity
              style={[styles.visCard, visibility === 'private' && styles.visCardActive]}
              onPress={() => setVisibility('private')}
              activeOpacity={0.7}
            >
              <View style={[styles.visIconCircle, visibility === 'private' && styles.visIconCircleActive]}>
                <Feather name="lock" size={18} color={visibility === 'private' ? '#FFFFFF' : COLORS.brandNavy} />
              </View>
              <View style={styles.visTextWrap}>
                <Text style={styles.visTitle}>Private Association Only</Text>
                <Text style={styles.visSub}>Only {currentUser.association || 'your association'} members</Text>
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
          <Text style={styles.checkboxLabel}>Enable attendance roll-call for leaders</Text>
        </TouchableOpacity>

        {/* Publish Button */}
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={handlePublish}
          activeOpacity={0.8}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.publishBtnText}>Publish Event</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Interactive Date Picker Modal */}
      {(activePicker === 'startDate' || activePicker === 'endDate') && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setActivePicker(null)}
            />
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalPickerTitle}>
                    Select {activePicker === 'startDate' ? 'Start Date' : 'End Date'}
                  </Text>
                  <Text style={styles.modalPickerSub}>
                    {formatDateDisplay(activeTargetDate)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setActivePicker(null)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Month & Year Navigator */}
              <View style={styles.calendarNavRow}>
                <TouchableOpacity
                  style={styles.calendarNavBtn}
                  onPress={handlePrevMonth}
                >
                  <Feather name="chevron-left" size={20} color={COLORS.brandNavy} />
                </TouchableOpacity>

                <Text style={styles.calendarNavTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <TouchableOpacity
                  style={styles.calendarNavBtn}
                  onPress={handleNextMonth}
                >
                  <Feather name="chevron-right" size={20} color={COLORS.brandNavy} />
                </TouchableOpacity>
              </View>

              {/* Days of Week Header */}
              <View style={styles.daysHeaderRow}>
                {DAYS_OF_WEEK.map((d) => (
                  <Text key={d} style={styles.daysHeaderText}>{d}</Text>
                ))}
              </View>

              {/* Calendar Days Grid */}
              <View style={styles.calendarGrid}>
                {Array.from({ length: firstDayIndex }).map((_, index) => (
                  <View key={`empty-${index}`} style={styles.dayCellEmpty} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const dayNum = index + 1;
                  const formattedMonth = String(calendarMonth + 1).padStart(2, '0');
                  const formattedDay = String(dayNum).padStart(2, '0');
                  const thisDateStr = `${calendarYear}-${formattedMonth}-${formattedDay}`;

                  const isSelected = thisDateStr === activeTargetDate;
                  const isStartDate = thisDateStr === startDate;
                  const isEndDate = thisDateStr === endDate;
                  const isDisabled =
                    activePicker === 'endDate' && thisDateStr < startDate;

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        (isStartDate || isEndDate) && !isSelected && styles.dayCellBoundary,
                        isDisabled && styles.dayCellDisabled,
                      ]}
                      onPress={() => !isDisabled && handleSelectDay(dayNum)}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          isSelected && styles.dayCellTextSelected,
                          (isStartDate || isEndDate) && !isSelected && styles.dayCellTextBoundary,
                          isDisabled && styles.dayCellTextDisabled,
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.quickPresetRow}>
                <TouchableOpacity
                  style={styles.quickPresetBtn}
                  onPress={() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    const todayStr = `${y}-${m}-${d}`;
                    if (activePicker === 'startDate') {
                      setStartDate(todayStr);
                      if (todayStr > endDate) setEndDate(todayStr);
                    } else {
                      setEndDate(todayStr >= startDate ? todayStr : startDate);
                    }
                    setActivePicker(null);
                  }}
                >
                  <Text style={styles.quickPresetText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickPresetBtn}
                  onPress={() => {
                    const now = new Date();
                    now.setDate(now.getDate() + 1);
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    const tmrwStr = `${y}-${m}-${d}`;
                    if (activePicker === 'startDate') {
                      setStartDate(tmrwStr);
                      if (tmrwStr > endDate) setEndDate(tmrwStr);
                    } else {
                      setEndDate(tmrwStr >= startDate ? tmrwStr : startDate);
                    }
                    setActivePicker(null);
                  }}
                >
                  <Text style={styles.quickPresetText}>Tomorrow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickPresetBtn}
                  onPress={() => {
                    const now = new Date();
                    const daysUntilSun = (7 - now.getDay()) % 7 || 7;
                    now.setDate(now.getDate() + daysUntilSun);
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    const sunStr = `${y}-${m}-${d}`;
                    if (activePicker === 'startDate') {
                      setStartDate(sunStr);
                      if (sunStr > endDate) setEndDate(sunStr);
                    } else {
                      setEndDate(sunStr >= startDate ? sunStr : startDate);
                    }
                    setActivePicker(null);
                  }}
                >
                  <Text style={styles.quickPresetText}>Next Sunday</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Interactive Circular Clock Picker Modal */}
      {(activePicker === 'startTime' || activePicker === 'endTime') && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setActivePicker(null)}
            />
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalPickerTitle}>
                    {activePicker === 'startTime' ? 'Start Time' : 'End Time'}
                  </Text>
                  <Text style={styles.modalPickerSub}>
                    {clockMode === 'hours' ? 'Tap an hour on the clock face' : 'Tap minutes on the clock face'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setActivePicker(null)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Digital Time Display & Mode Switcher */}
              <View style={styles.clockDigitalHeader}>
                <View style={styles.clockDigitalBoxWrap}>
                  <TouchableOpacity
                    style={[
                      styles.clockDigitalBox,
                      clockMode === 'hours' && styles.clockDigitalBoxActive,
                    ]}
                    onPress={() => setClockMode('hours')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.clockDigitalText,
                        clockMode === 'hours' && styles.clockDigitalTextActive,
                      ]}
                    >
                      {tempHour}
                    </Text>
                    <Text
                      style={[
                        styles.clockDigitalSub,
                        clockMode === 'hours' && styles.clockDigitalSubActive,
                      ]}
                    >
                      HOURS
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.clockDigitalColon}>:</Text>

                  <TouchableOpacity
                    style={[
                      styles.clockDigitalBox,
                      clockMode === 'minutes' && styles.clockDigitalBoxActive,
                    ]}
                    onPress={() => setClockMode('minutes')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.clockDigitalText,
                        clockMode === 'minutes' && styles.clockDigitalTextActive,
                      ]}
                    >
                      {tempMinute}
                    </Text>
                    <Text
                      style={[
                        styles.clockDigitalSub,
                        clockMode === 'minutes' && styles.clockDigitalSubActive,
                      ]}
                    >
                      MINUTES
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* AM / PM Toggle Box */}
                <View style={styles.clockAmPmBox}>
                  <TouchableOpacity
                    style={[
                      styles.clockAmPmBtn,
                      tempMeridiem === 'AM' && styles.clockAmPmBtnActive,
                    ]}
                    onPress={() => setTempMeridiem('AM')}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.clockAmPmText,
                        tempMeridiem === 'AM' && styles.clockAmPmTextActive,
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.clockAmPmBtn,
                      tempMeridiem === 'PM' && styles.clockAmPmBtnActive,
                    ]}
                    onPress={() => setTempMeridiem('PM')}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.clockAmPmText,
                        tempMeridiem === 'PM' && styles.clockAmPmTextActive,
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Circular Analog Clock Face */}
              <View style={styles.clockFaceContainer}>
                <View style={styles.clockFace}>
                  {/* Rotating Clock Hand */}
                  <View
                    style={[
                      styles.clockHandContainer,
                      { transform: [{ rotate: `${clockHandAngle}deg` }] },
                    ]}
                  >
                    <View style={styles.clockHandLine} />
                    <View style={styles.clockHandTipCircle} />
                  </View>

                  {/* Center Pivot Pin */}
                  <View style={styles.clockCenterPivot} />

                  {/* Clock Numbers: Hours mode */}
                  {clockMode === 'hours' &&
                    CLOCK_HOURS.map((item) => {
                      const isSelected = tempHour === item.value;
                      return (
                        <TouchableOpacity
                          key={`h-${item.value}`}
                          style={[
                            styles.clockNumberCell,
                            { left: item.left, top: item.top },
                            isSelected && styles.clockNumberCellSelected,
                          ]}
                          onPress={() => {
                            setTempHour(item.value);
                            setClockMode('minutes');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.clockNumberText,
                              isSelected && styles.clockNumberTextSelected,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                  {/* Clock Numbers: Minutes mode */}
                  {clockMode === 'minutes' &&
                    CLOCK_MINUTES.map((item) => {
                      const isSelected = tempMinute === item.value;
                      return (
                        <TouchableOpacity
                          key={`m-${item.value}`}
                          style={[
                            styles.clockNumberCell,
                            { left: item.left, top: item.top },
                            isSelected && styles.clockNumberCellSelected,
                          ]}
                          onPress={() => {
                            setTempMinute(item.value);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.clockNumberText,
                              isSelected && styles.clockNumberTextSelected,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>

              {/* Quick Minute Increments / Presets */}
              <View style={styles.clockQuickMinuteRow}>
                <Text style={styles.clockQuickLabel}>QUICK MINS:</Text>
                {['00', '15', '30', '45'].map((m) => {
                  const isSelected = tempMinute === m;
                  return (
                    <TouchableOpacity
                      key={`qm-${m}`}
                      style={[
                        styles.clockQuickMinBtn,
                        isSelected && styles.clockQuickMinBtnActive,
                      ]}
                      onPress={() => setTempMinute(m)}
                    >
                      <Text
                        style={[
                          styles.clockQuickMinText,
                          isSelected && styles.clockQuickMinTextActive,
                        ]}
                      >
                        :{m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Confirm Time Button */}
              <TouchableOpacity
                style={styles.confirmTimeBtn}
                onPress={handleConfirmTime}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.confirmTimeBtnText}>
                  Set Time to {tempHour}:{tempMinute} {tempMeridiem}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Created Event Scannable QR Code Modal */}
      <EventQRCodeModal
        event={publishedEvent}
        visible={showCreatedQRModal}
        onClose={() => {
          setShowCreatedQRModal(false);
          navigateTo('events');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 16,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#002B5C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerTriggerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  pickerTriggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerTriggerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  pickerTriggerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  pickerTriggerAction: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.brandTeal,
    marginTop: 2,
  },
  multiDayNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brandTealSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  multiDayNoticeText: {
    fontSize: 12,
    color: '#004D40',
    fontWeight: '600',
  },
  visWrap: {
    gap: 8,
  },
  visCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  visCardActive: {
    borderColor: COLORS.brandTeal,
    backgroundColor: '#F0FDFA',
  },
  visIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EBF1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visIconCircleActive: {
    backgroundColor: COLORS.brandTeal,
  },
  visTextWrap: {
    flex: 1,
    gap: 2,
  },
  visTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  visSub: {
    fontSize: 12,
    color: '#64748B',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  publishBtn: {
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  restrictedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 12,
  },
  restrictedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EBF1F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  restrictedSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  backToEventsBtn: {
    marginTop: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.brandNavy,
  },
  backToEventsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 14,
    maxHeight: '92%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalPickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalPickerSub: {
    fontSize: 13,
    color: COLORS.brandTeal,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  daysHeaderText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 6,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: COLORS.brandTeal,
  },
  dayCellBoundary: {
    backgroundColor: '#EBF1F8',
    borderWidth: 1,
    borderColor: COLORS.brandNavy,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayCellTextBoundary: {
    color: COLORS.brandNavy,
    fontWeight: '700',
  },
  dayCellTextDisabled: {
    color: '#94A3B8',
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
  },
  quickPresetBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPresetText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },

  /* Clock Picker Styles */
  clockDigitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clockDigitalBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clockDigitalBox: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    minWidth: 64,
  },
  clockDigitalBoxActive: {
    backgroundColor: '#E6F7F7',
    borderColor: COLORS.brandTeal,
  },
  clockDigitalText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#334155',
  },
  clockDigitalTextActive: {
    color: COLORS.brandTeal,
  },
  clockDigitalSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: -2,
    letterSpacing: 0.5,
  },
  clockDigitalSubActive: {
    color: COLORS.brandTeal,
  },
  clockDigitalColon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#64748B',
  },
  clockAmPmBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  clockAmPmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockAmPmBtnActive: {
    backgroundColor: COLORS.brandNavy,
  },
  clockAmPmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  clockAmPmTextActive: {
    color: '#FFFFFF',
  },
  clockFaceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  clockFace: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHandContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  clockHandLine: {
    width: 2.5,
    height: 86,
    backgroundColor: COLORS.brandTeal,
    marginTop: 35,
  },
  clockHandTipCircle: {
    position: 'absolute',
    top: 17,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandTeal,
  },
  clockCenterPivot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brandNavy,
    zIndex: 10,
  },
  clockNumberCell: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  clockNumberCellSelected: {
    backgroundColor: COLORS.brandTeal,
  },
  clockNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  clockNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  clockQuickMinuteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    gap: 8,
  },
  clockQuickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  clockQuickMinBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockQuickMinBtnActive: {
    backgroundColor: COLORS.brandTeal,
  },
  clockQuickMinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  clockQuickMinTextActive: {
    color: '#FFFFFF',
  },
  confirmTimeBtn: {
    flexDirection: 'row',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  confirmTimeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginLeft: 'auto',
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  thumbnailUploadBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thumbnailUploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  thumbnailUploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  thumbnailUploadSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260,
  },
  thumbnailPreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  thumbnailPreviewImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#0F172A',
  },
  thumbnailActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  thumbnailChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  thumbnailChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  thumbnailRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  thumbnailRemoveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
});
