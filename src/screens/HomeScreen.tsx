import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { DateBox } from '../components/DateBox';
import { Tag } from '../components/Tag';
import { COLORS } from '../constants/theme';

export const HomeScreen: React.FC = () => {
  const { currentUser, navigateTo, events, notices, logout } = useApp();

  const nextMeeting = events.find((e) => e.isMyAssociation) || events[0];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onPress={() => navigateTo('profile')}
        >
          <Text style={styles.avatarText}>
            {currentUser.name.replace('Pastor ', '').charAt(0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          activeOpacity={0.8}
          onPress={() => navigateTo('profile')}
        >
          <Text style={styles.greeting}>Good evening,</Text>
          <Text style={styles.pastorName} numberOfLines={1}>{currentUser.name}</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Notifications', 'All association circulars and notices are up to date.')}
          >
            <Feather name="bell" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, styles.logoutBtn]}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert('Sign Out', `Are you sure you want to log out from ${currentUser.name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: logout },
              ]);
            }}
          >
            <Feather name="log-out" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Association Card */}
      <View style={styles.associationCard}>
        <Text style={styles.monoHeading}>MY ASSOCIATION</Text>
        <Text style={styles.associationName}>{currentUser.association}</Text>
        <Text style={styles.associationLocation}>
          {currentUser.district} › {currentUser.state} › {currentUser.country}
        </Text>
        <TouchableOpacity
          style={styles.viewMembersBtn}
          onPress={() => navigateTo('directory')}
          activeOpacity={0.7}
        >
          <Text style={styles.viewMembersText}>
            View {currentUser.memberCount} member pastors ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4-Item Quick Action Grid */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigateTo('directory')}
          activeOpacity={0.7}
        >
          <Feather name="users" size={24} color={COLORS.accent} />
          <Text style={styles.gridLabel}>Directory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigateTo('events')}
          activeOpacity={0.7}
        >
          <Feather name="calendar" size={24} color={COLORS.accent} />
          <Text style={styles.gridLabel}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigateTo('prayer')}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={24} color={COLORS.accent} />
          <Text style={styles.gridLabel}>Prayer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigateTo('donate')}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="rupee-sign" size={22} color={COLORS.accent} />
          <Text style={styles.gridLabel}>Donate</Text>
        </TouchableOpacity>
      </View>

      {/* Next Meeting */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Next meeting</Text>
        <TouchableOpacity onPress={() => navigateTo('events')}>
          <Text style={styles.seeAllText}>All events</Text>
        </TouchableOpacity>
      </View>

      {nextMeeting && (
        <TouchableOpacity
          style={styles.meetingCard}
          activeOpacity={0.8}
          onPress={() => navigateTo('events')}
        >
          <DateBox month={nextMeeting.month} day={nextMeeting.day} />
          <View style={styles.meetingDetails}>
            <Tag label="PRIVATE · MY ASSOCIATION" type="mine" />
            <Text style={styles.meetingTitle}>{nextMeeting.title}</Text>
            <Text style={styles.meetingMeta}>
              {nextMeeting.venue} · {nextMeeting.time}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Latest Notices */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Latest notices</Text>
      </View>

      {notices.map((notice) => (
        <View key={notice.id} style={styles.noticeCard}>
          <View style={styles.noticeMetaRow}>
            <Tag
              label={notice.scope === 'public' ? 'PUBLIC' : 'MY ASSOCIATION'}
              type={notice.scope === 'public' ? 'global' : 'mine'}
            />
            <Text style={styles.noticeDate}>{notice.date}</Text>
          </View>
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeSummary} numberOfLines={2}>
            {notice.summary}
          </Text>
          <View style={styles.lineBarWrap}>
            <View style={[styles.lineBar, { width: '85%' }]} />
            <View style={[styles.lineBar, { width: '55%' }]} />
          </View>
        </View>
      ))}
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
    paddingBottom: 24,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.muted,
  },
  pastorName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  associationCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  monoHeading: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.85,
    letterSpacing: 0.8,
  },
  associationName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  associationLocation: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.85,
  },
  viewMembersBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  viewMembersText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    minHeight: 78,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  meetingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  meetingDetails: {
    flex: 1,
    gap: 4,
  },
  meetingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  meetingMeta: {
    fontSize: 13,
    color: COLORS.muted,
  },
  noticeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  noticeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  noticeSummary: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  lineBarWrap: {
    gap: 4,
    marginTop: 4,
  },
  lineBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.ph,
  },
});
