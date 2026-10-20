import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { InfoBox } from '../components/InfoBox';
import { COLORS } from '../constants/theme';
import {
  Pastor,
  PastorRole,
  PastorPermissions,
  isPastorAdmin,
  getDefaultPermissionsForRole,
} from '../types';

const AVATAR_COLORS = [
  '#0D9488', // Emerald Teal
  '#2563EB', // Royal Blue
  '#7C3AED', // Purple
  '#EA580C', // Amber Coral
  '#059669', // Mint Green
  '#4F46E5', // Indigo
  '#D97706', // Warm Gold
  '#E11D48', // Vibrant Rose
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const ProfileScreen: React.FC = () => {
  const {
    currentScreen,
    selectedPastor,
    selectPastor,
    navigateTo,
    logout,
    currentUser,
    loggedPastor,
    pastors,
    currentAssociation,
    updatePastorRoleAndPermissions,
  } = useApp();

  // If on 'profile' screen, viewing profile tab.
  // If on 'pastor-detail', viewing a specific pastor's full profile.
  const isMyProfile = currentScreen === 'profile';

  // Toggle between "My Profile" and "Member View" inside the profile tab
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'members'>('profile');

  // Member search & filter in Member View
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'ALL' | 'LEADERSHIP' | 'MEMBERS'>('ALL');

  const displayPastor: Pastor = isMyProfile
    ? (loggedPastor || ({
        id: 'me',
        name: currentUser.name || 'Pastor',
        role: currentUser.role,
        isAdmin: currentUser.isAdmin,
        permissions: currentUser.permissions,
        associationId: currentUser.associationId,
        associationName: currentUser.association,
        associationCode: '',
        isVerified: true,
        churchName: `${currentUser.association} Fellowship`,
        village: currentUser.district || '',
        mandal: currentUser.district || '',
        district: currentUser.district || '',
        state: currentUser.state || '',
        phone: currentUser.phone || '',
        churchAddress: `${currentUser.district}, ${currentUser.state}`,
        denomination: 'Independent',
        ordainedYear: '2020',
        ministry: 'Pastoral & Ministry Leadership',
        languages: ['Telugu', 'English'],
      } as Pastor))
    : (selectedPastor || loggedPastor || ({
        id: 'unknown',
        name: 'Pastor',
        role: 'MEMBER',
        isAdmin: false,
        permissions: getDefaultPermissionsForRole('MEMBER'),
        associationId: currentUser.associationId,
        associationName: currentUser.association,
        associationCode: '',
        isVerified: false,
        churchName: 'Church',
        village: '',
        mandal: '',
        district: '',
        state: '',
        phone: '',
        churchAddress: '',
        denomination: 'Independent',
        ordainedYear: '2020',
        ministry: 'Pastoral Ministry',
        languages: ['Telugu', 'English'],
      } as Pastor));

  // Role Management Modal State
  const [showManageModal, setShowManageModal] = useState(false);
  const [managingPastor, setManagingPastor] = useState<Pastor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetRole, setTargetRole] = useState<PastorRole>('MEMBER');
  const [targetPermissions, setTargetPermissions] = useState<PastorPermissions>(
    getDefaultPermissionsForRole('MEMBER')
  );

  const pastorIsAdmin = isPastorAdmin(displayPastor?.role || 'MEMBER');
  const effectivePermissions =
    displayPastor?.permissions || getDefaultPermissionsForRole(displayPastor?.role || 'MEMBER');

  // Leadership queries across association
  const presidentPastor = pastors.find((p) => p.role === 'PRESIDENT');
  const secretaryPastor = pastors.find((p) => p.role === 'SECRETARY');
  const treasurerPastor = pastors.find((p) => p.role === 'TREASURER');
  const generalMembers = pastors.filter((p) => p.role === 'MEMBER');

  // Filtered list for member view
  const filteredPastorsList = pastors.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      p.churchName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      p.village.toLowerCase().includes(memberSearch.toLowerCase()) ||
      p.role.toLowerCase().includes(memberSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (memberRoleFilter === 'LEADERSHIP') {
      return isPastorAdmin(p.role);
    }
    if (memberRoleFilter === 'MEMBERS') {
      return p.role === 'MEMBER';
    }
    return true;
  });

  const handleCall = (phone?: string) => {
    const target = phone || displayPastor.phone;
    if (!target) return;
    Linking.openURL(`tel:${target}`).catch(() => {
      Alert.alert('Calling', `Dialing ${target}`);
    });
  };

  const handleMessage = (phone?: string) => {
    const target = phone || displayPastor.phone;
    if (!target) return;
    Linking.openURL(`sms:${target}`).catch(() => {
      Alert.alert('Messaging', `Opening SMS to ${target}`);
    });
  };

  const handleDirections = (pastorItem?: Pastor) => {
    const p = pastorItem || displayPastor;
    const query = encodeURIComponent(
      `${p.churchName}, ${p.village}, ${p.mandal}`
    );
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {
      Alert.alert('Maps', `Navigating to ${p.churchAddress}`);
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      `Sign out of ShepherdLink (${currentUser.name})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const openManageModalForPastor = (pastor: Pastor) => {
    setManagingPastor(pastor);
    setTargetRole(pastor.role);
    setTargetPermissions(
      pastor.permissions || getDefaultPermissionsForRole(pastor.role)
    );
    setShowManageModal(true);
  };

  const openManageModalForSelf = () => {
    openManageModalForPastor(displayPastor);
  };

  const handleRoleChange = (role: PastorRole) => {
    setTargetRole(role);
    setTargetPermissions(getDefaultPermissionsForRole(role));
  };

  const handleSavePermissions = async () => {
    const target = managingPastor || displayPastor;
    if (!target) return;

    setIsSubmitting(true);
    try {
      await updatePastorRoleAndPermissions(
        target.id,
        targetRole,
        targetPermissions
      );
      setShowManageModal(false);
      Alert.alert(
        'Permissions Updated',
        `Updated role & access permissions for ${target.name}.`
      );
    } catch {
      Alert.alert('Error', 'Failed to update permissions. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Back and Screen Title */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => navigateTo(isMyProfile ? 'home' : 'directory')}
          >
            <Feather name="chevron-left" size={24} color={COLORS.ink} />
          </TouchableOpacity>

          <Text style={styles.topNavTitle}>
            {isMyProfile
              ? activeProfileTab === 'profile'
                ? 'My Profile'
                : 'Association & Members'
              : 'Pastor Profile'}
          </Text>

          {isMyProfile ? (
            <TouchableOpacity
              style={styles.logoutHeaderBtn}
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={15} color={COLORS.danger} />
              <Text style={styles.logoutHeaderText}>Log Out</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Segmented Tab Switcher (My Profile vs Member View) - Only shown on main Profile screen */}
        {isMyProfile && (
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeProfileTab === 'profile' && styles.segmentBtnActive,
              ]}
              onPress={() => setActiveProfileTab('profile')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-circle-outline"
                size={18}
                color={activeProfileTab === 'profile' ? '#FFFFFF' : COLORS.muted}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  activeProfileTab === 'profile' && styles.segmentBtnTextActive,
                ]}
              >
                My Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeProfileTab === 'members' && styles.segmentBtnActive,
              ]}
              onPress={() => setActiveProfileTab('members')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people-outline"
                size={18}
                color={activeProfileTab === 'members' ? '#FFFFFF' : COLORS.muted}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  activeProfileTab === 'members' && styles.segmentBtnTextActive,
                ]}
              >
                Member View ({pastors.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* -------------------- TAB 1: MY PROFILE / INDIVIDUAL PROFILE -------------------- */}
        {(activeProfileTab === 'profile' || !isMyProfile) && (
          <>
            {/* Header Profile Info */}
            <View style={styles.profileHeader}>
              <View
                style={[
                  styles.largeAvatar,
                  { backgroundColor: getAvatarColor(displayPastor.name || 'Pastor') },
                ]}
              >
                <Text style={styles.avatarLabel}>
                  {(displayPastor.name || 'P')
                    .replace('Pastor ', '')
                    .replace('Rev. Dr. ', '')
                    .replace('Rev. ', '')
                    .trim()
                    .charAt(0)
                    .toUpperCase() || 'P'}
                </Text>
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.name}>{displayPastor.name}</Text>
                {displayPastor.isVerified && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.brandTeal} />
                )}
              </View>

              <Text style={styles.churchSub}>
                {[displayPastor.churchName, displayPastor.village, displayPastor.district]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>

            {/* Quick Actions (Call, SMS, Location) */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                activeOpacity={0.8}
                onPress={() => handleCall()}
              >
                <Feather name="phone" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Call Pastor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnPlain}
                activeOpacity={0.8}
                onPress={() => handleMessage()}
              >
                <Feather name="message-square" size={18} color={COLORS.ink} />
                <Text style={styles.actionBtnPlainText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnPlain}
                activeOpacity={0.8}
                onPress={() => handleDirections()}
              >
                <Feather name="map-pin" size={18} color={COLORS.ink} />
                <Text style={styles.actionBtnPlainText}>Location</Text>
              </TouchableOpacity>
            </View>

            {/* Association Role & Permissions Card */}
            <View style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <View style={styles.adminHeaderLeft}>
                  <Ionicons
                    name={pastorIsAdmin ? 'shield-checkmark' : 'person-circle-outline'}
                    size={22}
                    color={pastorIsAdmin ? '#B45309' : COLORS.muted}
                  />
                  <View>
                    <Text style={styles.adminCardTitle}>Association Role & Rights</Text>
                    <Text style={styles.adminCardSubtitle}>
                      {pastorIsAdmin
                        ? 'Official Association Administrator'
                        : 'Standard Association Member'}
                    </Text>
                  </View>
                </View>

                {pastorIsAdmin ? (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield" size={11} color="#92400E" />
                    <Text style={styles.adminBadgeText}>{displayPastor.role}</Text>
                  </View>
                ) : (
                  <View style={styles.memberBadge}>
                    <Text style={styles.memberBadgeText}>{displayPastor.role}</Text>
                  </View>
                )}
              </View>

              {/* Permissions Breakdown List */}
              <View style={styles.permissionsGrid}>
                <View style={styles.permPill}>
                  <Ionicons
                    name={effectivePermissions.canManageMembers ? 'checkmark-circle' : 'lock-closed'}
                    size={14}
                    color={effectivePermissions.canManageMembers ? COLORS.brandTeal : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.permPillText,
                      !effectivePermissions.canManageMembers && styles.permPillTextDisabled,
                    ]}
                  >
                    Manage Members
                  </Text>
                </View>

                <View style={styles.permPill}>
                  <Ionicons
                    name={effectivePermissions.canAssignRoles ? 'checkmark-circle' : 'lock-closed'}
                    size={14}
                    color={effectivePermissions.canAssignRoles ? COLORS.brandTeal : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.permPillText,
                      !effectivePermissions.canAssignRoles && styles.permPillTextDisabled,
                    ]}
                  >
                    Assign Roles
                  </Text>
                </View>

                <View style={styles.permPill}>
                  <Ionicons
                    name={effectivePermissions.canCreateEvents ? 'checkmark-circle' : 'lock-closed'}
                    size={14}
                    color={effectivePermissions.canCreateEvents ? COLORS.brandTeal : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.permPillText,
                      !effectivePermissions.canCreateEvents && styles.permPillTextDisabled,
                    ]}
                  >
                    Create Events
                  </Text>
                </View>

                <View style={styles.permPill}>
                  <Ionicons
                    name={effectivePermissions.canTrackAttendance ? 'checkmark-circle' : 'lock-closed'}
                    size={14}
                    color={effectivePermissions.canTrackAttendance ? COLORS.brandTeal : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.permPillText,
                      !effectivePermissions.canTrackAttendance && styles.permPillTextDisabled,
                    ]}
                  >
                    Track Attendance
                  </Text>
                </View>

                <View style={styles.permPill}>
                  <Ionicons
                    name={effectivePermissions.canManageDonations ? 'checkmark-circle' : 'lock-closed'}
                    size={14}
                    color={effectivePermissions.canManageDonations ? COLORS.brandTeal : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.permPillText,
                      !effectivePermissions.canManageDonations && styles.permPillTextDisabled,
                    ]}
                  >
                    Manage Donations
                  </Text>
                </View>

                <View style={styles.permPill}>
                  <Ionicons
                    name={effectivePermissions.canBroadcastNotices ? 'checkmark-circle' : 'lock-closed'}
                    size={14}
                    color={effectivePermissions.canBroadcastNotices ? COLORS.brandTeal : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.permPillText,
                      !effectivePermissions.canBroadcastNotices && styles.permPillTextDisabled,
                    ]}
                  >
                    Broadcast Notices
                  </Text>
                </View>
              </View>

              {/* Manage Button for Admins */}
              {currentUser.isAdmin && (
                <TouchableOpacity
                  style={styles.adminActionBtn}
                  onPress={openManageModalForSelf}
                  activeOpacity={0.8}
                >
                  <Feather name="sliders" size={16} color={COLORS.brandNavy} />
                  <Text style={styles.adminActionBtnText}>Manage Role & Permissions</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Association Leadership Teaser Card */}
            {isMyProfile && (
              <TouchableOpacity
                style={styles.leadershipTeaserCard}
                activeOpacity={0.85}
                onPress={() => setActiveProfileTab('members')}
              >
                <View style={styles.teaserLeft}>
                  <View style={styles.teaserIconBox}>
                    <Ionicons name="people" size={20} color={COLORS.brandNavy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teaserTitle}>Association Executive Board</Text>
                    <Text style={styles.teaserSubtitle}>
                      {presidentPastor ? `President: ${presidentPastor.name}` : 'View Association Leadership & Members'}
                    </Text>
                  </View>
                </View>
                <View style={styles.teaserActionBadge}>
                  <Text style={styles.teaserActionText}>View All</Text>
                  <Feather name="chevron-right" size={14} color={COLORS.brandNavy} />
                </View>
              </TouchableOpacity>
            )}

            {/* Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Association</Text>
                <Text style={styles.detailValue}>
                  {displayPastor.associationName ||
                    currentAssociation.name ||
                    `${displayPastor.mandal || displayPastor.district || 'Fellowship'} Pastors Association`}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Mobile Phone</Text>
                <Text style={styles.detailValue}>{displayPastor.phone || 'Not provided'}</Text>
              </View>

              {displayPastor.gender ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Gender</Text>
                  <Text style={styles.detailValue}>{displayPastor.gender}</Text>
                </View>
              ) : null}

              {displayPastor.dateOfBirth ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Date of Birth</Text>
                  <Text style={styles.detailValue}>{displayPastor.dateOfBirth}</Text>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Church address</Text>
                <Text style={styles.detailValue}>
                  {displayPastor.churchAddress ||
                    [displayPastor.churchName, displayPastor.village, displayPastor.mandal, displayPastor.district]
                      .filter(Boolean)
                      .join(', ')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Denomination</Text>
                <Text style={styles.detailValue}>{displayPastor.denomination || 'Independent'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Ordained</Text>
                <Text style={styles.detailValue}>{displayPastor.ordainedYear || '2020'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Ministry</Text>
                <Text style={styles.detailValue}>{displayPastor.ministry || 'Pastoral Ministry'}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailKey}>Languages</Text>
                <Text style={styles.detailValue}>
                  {displayPastor.languages?.join(', ') || 'Telugu, English'}
                </Text>
              </View>
            </View>

            {/* Privacy Notice */}
            <InfoBox
              type="amber"
              icon="lock"
              text="Phone number and address are visible only to verified members of the same association."
            />

            {/* Full Logout Button at Bottom of Profile (Only for My Profile) */}
            {isMyProfile && (
              <TouchableOpacity
                style={styles.logoutFullBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Feather name="log-out" size={18} color={COLORS.danger} />
                <Text style={styles.logoutFullBtnText}>Sign Out of Account</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* -------------------- TAB 2: MEMBER VIEW & LEADERSHIP -------------------- */}
        {isMyProfile && activeProfileTab === 'members' && (
          <View style={styles.memberViewContainer}>
            {/* Association Banner Card */}
            <View style={styles.assocInfoBanner}>
              <View style={styles.assocInfoIconBox}>
                <Ionicons name="business" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.assocBannerName}>
                  {currentAssociation.name || 'ShepherdLink Fellowship'}
                </Text>
                <Text style={styles.assocBannerMeta}>
                  {[currentAssociation.district, currentAssociation.state, currentAssociation.code]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
              <View style={styles.memberCountPill}>
                <Text style={styles.memberCountPillText}>{pastors.length} Members</Text>
              </View>
            </View>

            {/* Section: EXECUTIVE LEADERSHIP SPOTLIGHT */}
            <View style={styles.leadershipSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="ribbon" size={18} color="#B45309" />
                  <Text style={styles.sectionHeaderTitle}>Association Leadership</Text>
                </View>
                <View style={styles.officersBadge}>
                  <Text style={styles.officersBadgeText}>Official Board</Text>
                </View>
              </View>
              <Text style={styles.sectionHeaderSubtitle}>
                Designated office bearers and authorized administrative signatories
              </Text>

              {/* PRESIDENT CARD */}
              <View style={[styles.leaderSpotlightCard, styles.leaderPresidentCard]}>
                <View style={styles.leaderCardTopRow}>
                  <View style={[styles.leaderAvatar, { backgroundColor: '#B45309' }]}>
                    <Text style={styles.leaderAvatarText}>
                      {presidentPastor
                        ? presidentPastor.name
                            .replace('Rev. Dr. ', '')
                            .replace('Pastor ', '')
                            .replace('Rev. ', '')
                            .trim()
                            .charAt(0)
                        : 'P'}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.leaderBadgeRow}>
                      <View style={styles.presidentPill}>
                        <Ionicons name="star" size={12} color="#FFFFFF" />
                        <Text style={styles.presidentPillText}>PRESIDENT</Text>
                      </View>
                      {presidentPastor?.isVerified && (
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.brandTeal} />
                      )}
                    </View>
                    <Text style={styles.leaderName} numberOfLines={1}>
                      {presidentPastor ? presidentPastor.name : 'President Not Assigned'}
                    </Text>
                    <Text style={styles.leaderChurch} numberOfLines={1}>
                      {presidentPastor ? presidentPastor.churchName : 'Contact association board'}
                    </Text>
                  </View>
                </View>

                {presidentPastor && (
                  <View style={styles.leaderCardFooter}>
                    <View style={styles.leaderLocationRow}>
                      <Ionicons name="location-outline" size={13} color={COLORS.muted} />
                      <Text style={styles.leaderLocationText} numberOfLines={1}>
                        {[presidentPastor.village, presidentPastor.mandal, presidentPastor.district]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </View>

                    <View style={styles.leaderActionsRow}>
                      {presidentPastor.phone ? (
                        <TouchableOpacity
                          style={styles.leaderActionBtn}
                          onPress={() => handleCall(presidentPastor.phone)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call" size={13} color={COLORS.brandNavy} />
                          <Text style={styles.leaderActionBtnText}>Call</Text>
                        </TouchableOpacity>
                      ) : null}

                      {presidentPastor.phone ? (
                        <TouchableOpacity
                          style={styles.leaderActionBtn}
                          onPress={() => handleMessage(presidentPastor.phone)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="chatbubble-ellipses" size={13} color={COLORS.brandNavy} />
                          <Text style={styles.leaderActionBtnText}>SMS</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.leaderActionBtn}
                        onPress={() => selectPastor(presidentPastor)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="person" size={13} color={COLORS.brandNavy} />
                        <Text style={styles.leaderActionBtnText}>Profile</Text>
                      </TouchableOpacity>

                      {currentUser.isAdmin && (
                        <TouchableOpacity
                          style={styles.leaderManageBtn}
                          onPress={() => openManageModalForPastor(presidentPastor)}
                          activeOpacity={0.7}
                        >
                          <Feather name="sliders" size={13} color="#92400E" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* SECRETARY & TREASURER SIDE-BY-SIDE / STACKED */}
              <View style={styles.executiveRow}>
                {/* SECRETARY CARD */}
                <View style={[styles.leaderSpotlightCard, styles.leaderSecretaryCard]}>
                  <View style={styles.leaderBadgeRow}>
                    <View style={styles.secretaryPill}>
                      <Ionicons name="document-text" size={11} color="#FFFFFF" />
                      <Text style={styles.secretaryPillText}>SECRETARY</Text>
                    </View>
                  </View>

                  <View style={styles.officerCompactInfo}>
                    <View style={[styles.officerAvatar, { backgroundColor: '#1E40AF' }]}>
                      <Text style={styles.officerAvatarText}>
                        {secretaryPastor
                          ? secretaryPastor.name
                              .replace('Rev. Dr. ', '')
                              .replace('Pastor ', '')
                              .replace('Rev. ', '')
                              .trim()
                              .charAt(0)
                          : 'S'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.officerName} numberOfLines={1}>
                        {secretaryPastor ? secretaryPastor.name : 'Not Assigned'}
                      </Text>
                      <Text style={styles.officerChurch} numberOfLines={1}>
                        {secretaryPastor ? secretaryPastor.churchName : 'No church recorded'}
                      </Text>
                    </View>
                  </View>

                  {secretaryPastor && (
                    <View style={styles.officerQuickActions}>
                      <TouchableOpacity
                        style={styles.officerMiniBtn}
                        onPress={() => handleCall(secretaryPastor.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={12} color="#1E40AF" />
                        <Text style={styles.officerMiniBtnText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.officerMiniBtn}
                        onPress={() => selectPastor(secretaryPastor)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="person" size={12} color="#1E40AF" />
                        <Text style={styles.officerMiniBtnText}>Profile</Text>
                      </TouchableOpacity>
                      {currentUser.isAdmin && (
                        <TouchableOpacity
                          style={styles.officerMiniBtnManage}
                          onPress={() => openManageModalForPastor(secretaryPastor)}
                          activeOpacity={0.7}
                        >
                          <Feather name="sliders" size={12} color="#1E40AF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* TREASURER CARD */}
                <View style={[styles.leaderSpotlightCard, styles.leaderTreasurerCard]}>
                  <View style={styles.leaderBadgeRow}>
                    <View style={styles.treasurerPill}>
                      <Ionicons name="wallet" size={11} color="#FFFFFF" />
                      <Text style={styles.treasurerPillText}>TREASURER</Text>
                    </View>
                  </View>

                  <View style={styles.officerCompactInfo}>
                    <View style={[styles.officerAvatar, { backgroundColor: '#065F46' }]}>
                      <Text style={styles.officerAvatarText}>
                        {treasurerPastor
                          ? treasurerPastor.name
                              .replace('Rev. Dr. ', '')
                              .replace('Pastor ', '')
                              .replace('Rev. ', '')
                              .trim()
                              .charAt(0)
                          : 'T'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.officerName} numberOfLines={1}>
                        {treasurerPastor ? treasurerPastor.name : 'Not Assigned'}
                      </Text>
                      <Text style={styles.officerChurch} numberOfLines={1}>
                        {treasurerPastor ? treasurerPastor.churchName : 'No church recorded'}
                      </Text>
                    </View>
                  </View>

                  {treasurerPastor && (
                    <View style={styles.officerQuickActions}>
                      <TouchableOpacity
                        style={styles.officerMiniBtn}
                        onPress={() => handleCall(treasurerPastor.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={12} color="#065F46" />
                        <Text style={styles.officerMiniBtnText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.officerMiniBtn}
                        onPress={() => selectPastor(treasurerPastor)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="person" size={12} color="#065F46" />
                        <Text style={styles.officerMiniBtnText}>Profile</Text>
                      </TouchableOpacity>
                      {currentUser.isAdmin && (
                        <TouchableOpacity
                          style={styles.officerMiniBtnManage}
                          onPress={() => openManageModalForPastor(treasurerPastor)}
                          activeOpacity={0.7}
                        >
                          <Feather name="sliders" size={12} color="#065F46" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Section: ALL REGISTERED MEMBERS DIRECTORY */}
            <View style={styles.membersListSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="people" size={18} color={COLORS.brandNavy} />
                  <Text style={styles.sectionHeaderTitle}>Association Members Directory</Text>
                </View>
                <Text style={styles.membersCountSub}>
                  {filteredPastorsList.length} of {pastors.length}
                </Text>
              </View>

              {/* Search Bar */}
              <View style={styles.memberSearchBar}>
                <Ionicons name="search" size={16} color={COLORS.brandTeal} />
                <TextInput
                  style={styles.memberSearchInput}
                  placeholder="Search by pastor, church, role, village..."
                  placeholderTextColor="#94A3B8"
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                />
                {memberSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setMemberSearch('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Chips */}
              <View style={styles.filterChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    memberRoleFilter === 'ALL' && styles.filterChipActive,
                  ]}
                  onPress={() => setMemberRoleFilter('ALL')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      memberRoleFilter === 'ALL' && styles.filterChipTextActive,
                    ]}
                  >
                    All Members ({pastors.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    memberRoleFilter === 'LEADERSHIP' && styles.filterChipActive,
                  ]}
                  onPress={() => setMemberRoleFilter('LEADERSHIP')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="shield"
                    size={11}
                    color={memberRoleFilter === 'LEADERSHIP' ? '#FFFFFF' : '#D97706'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      memberRoleFilter === 'LEADERSHIP' && styles.filterChipTextActive,
                    ]}
                  >
                    Board ({pastors.filter((p) => isPastorAdmin(p.role)).length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    memberRoleFilter === 'MEMBERS' && styles.filterChipActive,
                  ]}
                  onPress={() => setMemberRoleFilter('MEMBERS')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="person"
                    size={11}
                    color={memberRoleFilter === 'MEMBERS' ? '#FFFFFF' : COLORS.brandTeal}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      memberRoleFilter === 'MEMBERS' && styles.filterChipTextActive,
                    ]}
                  >
                    Members ({generalMembers.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Members List Cards */}
              <View style={styles.memberCardsWrapper}>
                {filteredPastorsList.map((pastor) => {
                  const isCurrentLoggedUser = pastor.phone === currentUser.phone;

                  return (
                    <TouchableOpacity
                      key={pastor.id}
                      style={[
                        styles.memberCard,
                        isCurrentLoggedUser && styles.memberCardCurrentUser,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => selectPastor(pastor)}
                    >
                      <View style={styles.memberCardTop}>
                        {/* Avatar */}
                        <View
                          style={[
                            styles.memberAvatarBox,
                            { backgroundColor: getAvatarColor(pastor.name) },
                          ]}
                        >
                          <Text style={styles.memberAvatarText}>
                            {pastor.name
                              .replace('Rev. Dr. ', '')
                              .replace('Pastor ', '')
                              .replace('Rev. ', '')
                              .trim()
                              .charAt(0)}
                          </Text>
                        </View>

                        {/* Details */}
                        <View style={{ flex: 1 }}>
                          <View style={styles.memberTitleRow}>
                            <Text style={styles.memberName} numberOfLines={1}>
                              {pastor.name}
                            </Text>
                            {pastor.isVerified && (
                              <Ionicons name="checkmark-circle" size={15} color={COLORS.brandTeal} />
                            )}
                            {isCurrentLoggedUser && (
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>YOU</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.memberChurchName} numberOfLines={1}>
                            {pastor.churchName}
                          </Text>

                          <View style={styles.memberMetaRow}>
                            <Ionicons name="location-outline" size={12} color="#94A3B8" />
                            <Text style={styles.memberLocation} numberOfLines={1}>
                              {[pastor.village, pastor.mandal].filter(Boolean).join(', ')}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Footer: Role Badge + Contact Actions */}
                      <View style={styles.memberCardBottom}>
                        {pastor.role === 'PRESIDENT' && (
                          <View style={styles.roleTagPresident}>
                            <Ionicons name="star" size={10} color="#B45309" />
                            <Text style={styles.roleTagPresidentText}>PRESIDENT</Text>
                          </View>
                        )}
                        {pastor.role === 'SECRETARY' && (
                          <View style={styles.roleTagSecretary}>
                            <Ionicons name="document-text" size={10} color="#1E40AF" />
                            <Text style={styles.roleTagSecretaryText}>SECRETARY</Text>
                          </View>
                        )}
                        {pastor.role === 'TREASURER' && (
                          <View style={styles.roleTagTreasurer}>
                            <Ionicons name="wallet" size={10} color="#065F46" />
                            <Text style={styles.roleTagTreasurerText}>TREASURER</Text>
                          </View>
                        )}
                        {pastor.role === 'MEMBER' && (
                          <View style={styles.roleTagMember}>
                            <Ionicons name="person" size={10} color="#0D9488" />
                            <Text style={styles.roleTagMemberText}>MEMBER</Text>
                          </View>
                        )}

                        {pastor.denomination ? (
                          <View style={styles.denomTag}>
                            <Text style={styles.denomTagText}>{pastor.denomination}</Text>
                          </View>
                        ) : null}

                        <View style={{ flex: 1 }} />

                        {/* Call Quick Action */}
                        {pastor.phone ? (
                          <TouchableOpacity
                            style={styles.cardCallMiniBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCall(pastor.phone);
                            }}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="call" size={13} color={COLORS.brandTeal} />
                          </TouchableOpacity>
                        ) : null}

                        {/* Admin Role Management */}
                        {currentUser.isAdmin && (
                          <TouchableOpacity
                            style={styles.cardManageMiniBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              openManageModalForPastor(pastor);
                            }}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Feather name="sliders" size={13} color={COLORS.brandNavy} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {filteredPastorsList.length === 0 && (
                  <View style={styles.emptyMembersBox}>
                    <Ionicons name="search-outline" size={32} color="#94A3B8" />
                    <Text style={styles.emptyMembersTitle}>No Members Found</Text>
                    <Text style={styles.emptyMembersSubtitle}>
                      {`No pastors match "${memberSearch}" in ${currentAssociation.name}.`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MANAGE ROLE & PERMISSIONS MODAL */}
      <Modal
        visible={showManageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage Role & Permissions</Text>
                <Text style={styles.modalSubtitle}>
                  {managingPastor?.name || displayPastor.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowManageModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.label}>Select Role</Text>
                  <View style={styles.ruleBadge}>
                    <Text style={styles.ruleBadgeText}>Administrative Rights Rule</Text>
                  </View>
                </View>
                <Text style={styles.ruleHelpText}>
                  Administrative rights are strictly restricted to President, Secretary, and Treasurer.
                </Text>

                <View style={styles.rolesGrid}>
                  {/* President */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      targetRole === 'PRESIDENT' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChange('PRESIDENT')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons
                        name="ribbon"
                        size={16}
                        color={targetRole === 'PRESIDENT' ? '#B45309' : COLORS.muted}
                      />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>President</Text>
                    <Text style={styles.roleDesc}>Full administrative rights</Text>
                  </TouchableOpacity>

                  {/* Secretary */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      targetRole === 'SECRETARY' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChange('SECRETARY')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons
                        name="document-text"
                        size={16}
                        color={targetRole === 'SECRETARY' ? '#B45309' : COLORS.muted}
                      />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Secretary</Text>
                    <Text style={styles.roleDesc}>Ops, members & notices</Text>
                  </TouchableOpacity>

                  {/* Treasurer */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      targetRole === 'TREASURER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChange('TREASURER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons
                        name="wallet"
                        size={16}
                        color={targetRole === 'TREASURER' ? '#B45309' : COLORS.muted}
                      />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Treasurer</Text>
                    <Text style={styles.roleDesc}>Finances & collections</Text>
                  </TouchableOpacity>

                  {/* Member */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      targetRole === 'MEMBER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChange('MEMBER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons
                        name="person"
                        size={16}
                        color={targetRole === 'MEMBER' ? COLORS.brandNavy : COLORS.muted}
                      />
                      <View style={styles.memberPill}>
                        <Text style={styles.memberPillText}>STANDARD</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Member</Text>
                    <Text style={styles.roleDesc}>Standard member access</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Permissions Toggles */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Access Permissions</Text>
                <Text style={styles.sublabel}>
                  Toggle permissions assigned to this pastor
                </Text>

                <View style={styles.permissionsContainer}>
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Manage Members</Text>
                      <Text style={styles.permDesc}>Add pastors and view member directory</Text>
                    </View>
                    <Switch
                      value={targetPermissions.canManageMembers}
                      onValueChange={(val) =>
                        setTargetPermissions((prev) => ({ ...prev, canManageMembers: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Assign Roles & Permissions</Text>
                      <Text style={styles.permDesc}>Grant or modify roles and administrative rights</Text>
                    </View>
                    <Switch
                      value={targetPermissions.canAssignRoles}
                      onValueChange={(val) =>
                        setTargetPermissions((prev) => ({ ...prev, canAssignRoles: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Create Events</Text>
                      <Text style={styles.permDesc}>Publish meetings and conventions</Text>
                    </View>
                    <Switch
                      value={targetPermissions.canCreateEvents}
                      onValueChange={(val) =>
                        setTargetPermissions((prev) => ({ ...prev, canCreateEvents: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Track Attendance</Text>
                      <Text style={styles.permDesc}>Access event attendance registers</Text>
                    </View>
                    <Switch
                      value={targetPermissions.canTrackAttendance}
                      onValueChange={(val) =>
                        setTargetPermissions((prev) => ({ ...prev, canTrackAttendance: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Manage Donations</Text>
                      <Text style={styles.permDesc}>Financial records and collections</Text>
                    </View>
                    <Switch
                      value={targetPermissions.canManageDonations}
                      onValueChange={(val) =>
                        setTargetPermissions((prev) => ({ ...prev, canManageDonations: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  <View style={[styles.permRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Broadcast Notices</Text>
                      <Text style={styles.permDesc}>Send notices to association pastors</Text>
                    </View>
                    <Switch
                      value={targetPermissions.canBroadcastNotices}
                      onValueChange={(val) =>
                        setTargetPermissions((prev) => ({ ...prev, canBroadcastNotices: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.8}
                onPress={handleSavePermissions}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Save Role & Permissions</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.ink,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  logoutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FDE8E8',
  },
  logoutHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  profileHeader: {
    alignItems: 'center',
    gap: 8,
  },
  largeAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarLabel: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
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
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.brandNavy,
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
    height: 56,
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

  /* Admin Role Card */
  adminCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.soft,
    gap: 14,
  },
  adminCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  adminCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  adminCardSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  memberBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.ground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  permPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  permPillTextDisabled: {
    color: COLORS.muted,
    fontWeight: '500',
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brandNavySoft,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.brandNavy,
  },
  adminActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
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
  logoutFullBtn: {
    marginTop: 8,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F8B4B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutFullBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
  },
  sublabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ruleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  ruleHelpText: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 10,
    fontWeight: '600',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOptionCard: {
    width: '48%',
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FAFAFA',
  },
  roleOptionCardSelected: {
    borderColor: COLORS.brandNavy,
    backgroundColor: COLORS.brandNavySoft,
  },
  roleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  memberPill: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  roleDesc: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 13,
  },
  permissionsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  permInfo: {
    flex: 1,
    paddingRight: 10,
  },
  permName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  permDesc: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  submitBtn: {
    height: 52,
    backgroundColor: COLORS.brandNavy,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Segmented Tab Controls */
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.brandNavy,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Leadership Teaser Card on Profile Tab */
  leadershipTeaserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  teaserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teaserIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.brandNavySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teaserTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  teaserSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  teaserActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.brandNavySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  teaserActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },

  /* Member View Styles */
  memberViewContainer: {
    gap: 16,
  },
  assocInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandNavy,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  assocInfoIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assocBannerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  assocBannerMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 3,
  },
  memberCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  memberCountPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Leadership Section */
  leadershipSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: -4,
  },
  officersBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  officersBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },

  /* Leader Spotlight Cards */
  leaderSpotlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  leaderPresidentCard: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF9',
  },
  leaderSecretaryCard: {
    flex: 1,
    borderColor: '#60A5FA',
    backgroundColor: '#F9FBFF',
    padding: 12,
  },
  leaderTreasurerCard: {
    flex: 1,
    borderColor: '#34D399',
    backgroundColor: '#F8FCF9',
    padding: 12,
  },
  leaderCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  leaderAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  leaderAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  presidentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  presidentPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secretaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  secretaryPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  treasurerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  treasurerPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  leaderName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  leaderChurch: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  leaderCardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingRight: 8,
  },
  leaderLocationText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  leaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  leaderActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  leaderManageBtn: {
    backgroundColor: '#FEF3C7',
    padding: 7,
    borderRadius: 8,
  },

  /* Executive Row for Secretary & Treasurer */
  executiveRow: {
    flexDirection: 'row',
    gap: 10,
  },
  officerCompactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  officerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  officerName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  officerChurch: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  officerQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  officerMiniBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  officerMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  officerMiniBtnManage: {
    padding: 6,
    borderRadius: 7,
    backgroundColor: '#EFF6FF',
  },

  /* Members Directory Section */
  membersListSection: {
    gap: 12,
    marginTop: 4,
  },
  membersCountSub: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  memberSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  filterChipActive: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  /* Member Cards Wrapper & Items */
  memberCardsWrapper: {
    gap: 10,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  memberCardCurrentUser: {
    borderColor: COLORS.brandTeal,
    backgroundColor: '#F0FDFA',
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  memberTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  youBadge: {
    backgroundColor: COLORS.brandTeal,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  memberChurchName: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  memberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberLocation: {
    fontSize: 11,
    color: '#94A3B8',
  },
  memberCardBottom: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleTagPresident: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleTagPresidentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  roleTagSecretary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleTagSecretaryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
  },
  roleTagTreasurer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleTagTreasurerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  roleTagMember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleTagMemberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
  denomTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  denomTagText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  cardCallMiniBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0FDFA',
  },
  cardManageMiniBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  emptyMembersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyMembersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  emptyMembersSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
