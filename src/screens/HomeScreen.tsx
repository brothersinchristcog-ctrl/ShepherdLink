import React from 'react';
import {
  View,
  Text,
  Image,
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

const getTimeGreeting = (): string => {
  const currentHour = new Date().getHours();
  if (currentHour >= 4 && currentHour < 12) {
    return 'Good morning,';
  } else if (currentHour >= 12 && currentHour < 17) {
    return 'Good afternoon,';
  } else if (currentHour >= 17 && currentHour < 21) {
    return 'Good evening,';
  } else {
    return 'Good night,';
  }
};

export const HomeScreen: React.FC = () => {
  const {
    currentUser,
    currentAssociation,
    navigateTo,
    events,
    notices,
  } = useApp();

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
            {currentUser.name ? currentUser.name.replace('Pastor ', '').charAt(0) : 'P'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          activeOpacity={0.8}
          onPress={() => navigateTo('profile')}
        >
          <Text style={styles.greeting}>{getTimeGreeting()}</Text>
          <Text style={styles.pastorName} numberOfLines={1}>{currentUser.name}</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Notifications', 'All association circulars and notices are up to date.')}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.ink} />
            <View style={styles.notificationBadgeDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Clean Featured Association Card */}
      <View style={styles.associationCard}>
        <View style={styles.assocBrandRow}>
          {currentAssociation?.logoUrl ? (
            <Image
              source={{ uri: currentAssociation.logoUrl }}
              style={styles.assocLogoThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.assocLogoPlaceholder}>
              <Ionicons name="shield" size={26} color={COLORS.brandTeal} />
            </View>
          )}
          <View style={styles.assocTextWrap}>
            <Text style={styles.associationName} numberOfLines={2}>
              {currentUser.association}
            </Text>
          </View>
        </View>
      </View>

      {/* 4-Item Quick Action Grid */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={[
            styles.gridCard,
            !currentUser.permissions?.canManageMembers && styles.gridCardDisabled,
          ]}
          onPress={() => {
            if (currentUser.permissions?.canManageMembers) {
              navigateTo('directory');
            } else {
              Alert.alert(
                'Directory Access Disabled',
                'Directory and member access is currently turned off for your account. You can enable "Manage Members" under Role & Access Privileges in your Profile settings.'
              );
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.gridIconWrap}>
            <Feather
              name="users"
              size={24}
              color={currentUser.permissions?.canManageMembers ? COLORS.accent : '#94A3B8'}
            />
            {!currentUser.permissions?.canManageMembers && (
              <View style={styles.gridLockBadge}>
                <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.gridLabel,
              !currentUser.permissions?.canManageMembers && styles.gridLabelDisabled,
            ]}
          >
            Directory
          </Text>
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

      {nextMeeting ? (
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
      ) : (
        <View style={[styles.meetingCard, { justifyContent: 'center', alignItems: 'center', paddingVertical: 18 }]}>
          <Text style={{ color: COLORS.muted, fontSize: 13 }}>No upcoming meetings scheduled yet.</Text>
        </View>
      )}

      {/* Latest Notices */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Latest notices</Text>
      </View>

      {notices.length > 0 ? (
        notices.map((notice) => (
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
        ))
      ) : (
        <View style={[styles.noticeCard, { justifyContent: 'center', alignItems: 'center', paddingVertical: 18 }]}>
          <Text style={{ color: COLORS.muted, fontSize: 13 }}>No circulars or notices posted yet.</Text>
        </View>
      )}
    </ScrollView>
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
    paddingBottom: 24,
    gap: 14,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
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
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D9488',
    letterSpacing: 0.2,
  },
  pastorName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  notificationBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.brandTeal,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  associationCard: {
    backgroundColor: '#0F2F4A',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#0F2F4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  assocBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  assocLogoThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  assocLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  assocTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  associationName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    lineHeight: 23,
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
  gridCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  gridIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLockBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#DC2626',
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  gridLabelDisabled: {
    color: '#94A3B8',
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
