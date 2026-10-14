import React, { useState } from 'react';
import {
  View,
  Text,
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
import { Tag } from '../components/Tag';
import { COLORS } from '../constants/theme';
import {
  PastorRole,
  PastorPermissions,
  isPastorAdmin,
  getDefaultPermissionsForRole,
} from '../types';

export const ProfileScreen: React.FC = () => {
  const {
    selectedPastor,
    navigateTo,
    logout,
    currentUser,
    updatePastorRoleAndPermissions,
  } = useApp();

  const [showManageModal, setShowManageModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetRole, setTargetRole] = useState<PastorRole>(selectedPastor.role);
  const [targetPermissions, setTargetPermissions] = useState<PastorPermissions>(
    selectedPastor.permissions || getDefaultPermissionsForRole(selectedPastor.role)
  );

  const isMyProfile =
    selectedPastor.phone.replace(/\D/g, '').slice(-10) ===
      currentUser.phone.replace(/\D/g, '').slice(-10) ||
    selectedPastor.name === currentUser.name;

  const pastorIsAdmin = isPastorAdmin(selectedPastor.role);
  const effectivePermissions =
    selectedPastor.permissions || getDefaultPermissionsForRole(selectedPastor.role);

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
    const query = encodeURIComponent(
      `${selectedPastor.churchName}, ${selectedPastor.village}, ${selectedPastor.mandal}`
    );
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {
      Alert.alert('Maps', `Navigating to ${selectedPastor.churchAddress}`);
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

  const openManageModal = () => {
    setTargetRole(selectedPastor.role);
    setTargetPermissions(
      selectedPastor.permissions || getDefaultPermissionsForRole(selectedPastor.role)
    );
    setShowManageModal(true);
  };

  const handleRoleChange = (role: PastorRole) => {
    setTargetRole(role);
    setTargetPermissions(getDefaultPermissionsForRole(role));
  };

  const handleSavePermissions = async () => {
    setIsSubmitting(true);
    try {
      await updatePastorRoleAndPermissions(
        selectedPastor.id,
        targetRole,
        targetPermissions
      );
      setShowManageModal(false);
      Alert.alert(
        'Permissions Updated',
        `Updated role & access permissions for ${selectedPastor.name}.`
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
        {/* Top Header Row with Back and Logout */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => navigateTo(isMyProfile ? 'home' : 'directory')}
          >
            <Feather name="chevron-left" size={24} color={COLORS.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutHeaderBtn}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={16} color={COLORS.danger} />
            <Text style={styles.logoutHeaderText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Header Profile Info */}
        <View style={styles.profileHeader}>
          <View style={styles.largeAvatar}>
            <Text style={styles.avatarLabel}>
              {selectedPastor.name
                .replace('Pastor ', '')
                .replace('Rev. Dr. ', '')
                .charAt(0)}
            </Text>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{selectedPastor.name}</Text>
            {selectedPastor.isVerified && (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.brandTeal} />
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
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Feather name="phone" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnPrimaryText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnPlain}
            onPress={handleMessage}
            activeOpacity={0.7}
          >
            <Feather name="message-square" size={20} color={COLORS.ink} />
            <Text style={styles.actionBtnPlainText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnPlain}
            onPress={handleDirections}
            activeOpacity={0.7}
          >
            <Feather name="map-pin" size={20} color={COLORS.ink} />
            <Text style={styles.actionBtnPlainText}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* ADMIN ROLE & PERMISSIONS CARD */}
        <View style={styles.adminCard}>
          <View style={styles.adminCardHeader}>
            <View style={styles.adminHeaderLeft}>
              <Ionicons
                name={pastorIsAdmin ? 'shield-checkmark' : 'shield-outline'}
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
                <Text style={styles.adminBadgeText}>{selectedPastor.role}</Text>
              </View>
            ) : (
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>{selectedPastor.role}</Text>
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
              onPress={openManageModal}
              activeOpacity={0.8}
            >
              <Feather name="sliders" size={16} color={COLORS.brandNavy} />
              <Text style={styles.adminActionBtnText}>Manage Role & Permissions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Association</Text>
            <Text style={styles.detailValue}>
              {selectedPastor.associationName ||
                `${selectedPastor.mandal} Pastors Association`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Mobile Phone</Text>
            <Text style={styles.detailValue}>{selectedPastor.phone}</Text>
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
            <Text style={styles.detailValue}>
              {selectedPastor.languages.join(', ')}
            </Text>
          </View>
        </View>

        {/* Privacy Notice */}
        <InfoBox
          type="amber"
          icon="lock"
          text="Phone number and address are visible only to verified members of the same association."
        />

        {/* Full Logout Button at Bottom of Profile */}
        <TouchableOpacity
          style={styles.logoutFullBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color={COLORS.danger} />
          <Text style={styles.logoutFullBtnText}>Sign Out of Account</Text>
        </TouchableOpacity>
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
                <Text style={styles.modalSubtitle}>{selectedPastor.name}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 16,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brandNavySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
  },
  avatarLabel: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.brandNavy,
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
});
