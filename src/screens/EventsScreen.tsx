import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { DateBox } from '../components/DateBox';
import { Tag } from '../components/Tag';
import { InfoBox } from '../components/InfoBox';
import { COLORS } from '../constants/theme';

export const EventsScreen: React.FC = () => {
  const { events, toggleRSVP, selectEventForAttendance, navigateTo } = useApp();
  const [scopeFilter, setScopeFilter] = useState<'all' | 'public' | 'private'>('all');

  const filteredEvents = events.filter((e) => {
    if (scopeFilter === 'all') return true;
    return e.scope === scopeFilter;
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.title}>Events</Text>
        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.8}
          onPress={() => navigateTo('create')}
        >
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Filter */}
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segBtn, scopeFilter === 'all' && styles.segBtnActive]}
          onPress={() => setScopeFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segText, scopeFilter === 'all' && styles.segTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, scopeFilter === 'public' && styles.segBtnActive]}
          onPress={() => setScopeFilter('public')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segText, scopeFilter === 'public' && styles.segTextActive]}>
            Public
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, scopeFilter === 'private' && styles.segBtnActive]}
          onPress={() => setScopeFilter('private')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segText, scopeFilter === 'private' && styles.segTextActive]}>
            My association
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scope Explanation Info Box */}
      <InfoBox
        type="blue"
        icon="info"
        text="Public events from any association are visible to all pastors. Private events are visible only to your association."
      />

      {/* Events List */}
      <View style={styles.list}>
        {filteredEvents.map((item) => {
          const isGoing = item.rsvp === 'going';
          const isMaybe = item.rsvp === 'maybe';

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <DateBox month={item.month} day={item.day} />
                <View style={styles.eventInfo}>
                  <Tag
                    label={item.scope === 'public' ? 'PUBLIC' : 'PRIVATE · MY ASSOCIATION'}
                    type={item.scope === 'public' ? 'global' : 'mine'}
                  />
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventMeta}>
                    {item.venue} · {item.time}
                  </Text>
                  <Text style={styles.byLine}>By {item.byAssociation}</Text>
                </View>
              </View>

              {/* RSVP Buttons */}
              <View style={styles.rsvpRow}>
                <TouchableOpacity
                  style={[styles.rsvpBtn, isGoing ? styles.btnOn : styles.btnPlain]}
                  activeOpacity={0.7}
                  onPress={() => toggleRSVP(item.id, 'going')}
                >
                  <Text style={[styles.rsvpBtnText, isGoing && styles.btnOnText]}>
                    {isGoing ? 'Going ✓' : 'Going'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rsvpBtn, isMaybe ? styles.btnOn : styles.btnPlain]}
                  activeOpacity={0.7}
                  onPress={() => toggleRSVP(item.id, 'maybe')}
                >
                  <Text style={[styles.rsvpBtnText, isMaybe && styles.btnOnText]}>
                    {isMaybe ? 'Maybe ✓' : 'Maybe'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Attendance button for association leaders */}
              {item.scope === 'private' && item.trackAttendance && (
                <TouchableOpacity
                  style={styles.attendanceBtn}
                  activeOpacity={0.7}
                  onPress={() => selectEventForAttendance(item)}
                >
                  <Text style={styles.attendanceBtnText}>Mark attendance (leaders)</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {filteredEvents.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No events currently in this filter.</Text>
          </View>
        )}
      </View>
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
  },
  createBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.ph,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
  },
  segTextActive: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
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
  byLine: {
    fontSize: 12,
    color: COLORS.muted,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPlain: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.field,
  },
  btnOn: {
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  rsvpBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  btnOnText: {
    color: '#FFFFFF',
  },
  attendanceBtn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
  },
});
