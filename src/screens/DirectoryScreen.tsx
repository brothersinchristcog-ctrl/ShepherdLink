import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { InfoBox } from '../components/InfoBox';
import { Chip } from '../components/Chip';
import { COLORS } from '../constants/theme';
import {
  Pastor,
  PastorRole,
  PastorPermissions,
  isPastorAdmin,
  getDefaultPermissionsForRole,
} from '../types';

const DENOMINATIONS = [
  'Independent',
  'Assemblies of God',
  'Baptist Church',
  'Church of South India (CSI)',
  'Pentecostal',
  'Lutheran (AELC)',
];

export const DirectoryScreen: React.FC = () => {
  const {
    pastors,
    selectPastor,
    currentUser,
    currentAssociation,
    addMemberByAdmin,
    updatePastorRoleAndPermissions,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'officers' | 'ministry'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPastor, setEditingPastor] = useState<Pastor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for adding member
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newChurch, setNewChurch] = useState('');
  const [newVillage, setNewVillage] = useState(currentAssociation.mandal || '');
  const [newDenomination, setNewDenomination] = useState('Independent');
  const [newRole, setNewRole] = useState<PastorRole>('MEMBER');
  const [newPermissions, setNewPermissions] = useState<PastorPermissions>(
    getDefaultPermissionsForRole('MEMBER')
  );

  // Form state for editing member
  const [editRole, setEditRole] = useState<PastorRole>('MEMBER');
  const [editPermissions, setEditPermissions] = useState<PastorPermissions>(
    getDefaultPermissionsForRole('MEMBER')
  );

  // Filter pastors
  const filteredPastors = pastors.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.churchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.village.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'officers') {
      return isPastorAdmin(p.role);
    }

    return true;
  });

  const handleOpenAddModal = () => {
    setNewName('');
    setNewPhone('');
    setNewChurch('');
    setNewVillage(currentAssociation.mandal || '');
    setNewDenomination('Independent');
    setNewRole('MEMBER');
    setNewPermissions(getDefaultPermissionsForRole('MEMBER'));
    setShowAddModal(true);
  };

  const handleRoleChangeForAdd = (role: PastorRole) => {
    setNewRole(role);
    setNewPermissions(getDefaultPermissionsForRole(role));
  };

  const handleRoleChangeForEdit = (role: PastorRole) => {
    setEditRole(role);
    setEditPermissions(getDefaultPermissionsForRole(role));
  };

  const handleOpenEditModal = (pastor: Pastor) => {
    setEditingPastor(pastor);
    setEditRole(pastor.role);
    setEditPermissions(
      pastor.permissions || getDefaultPermissionsForRole(pastor.role)
    );
  };

  const handleSubmitAddMember = async () => {
    if (!newName.trim()) {
      Alert.alert('Required', 'Please enter pastor name');
      return;
    }
    const cleanPhone = newPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number');
      return;
    }
    if (!newChurch.trim()) {
      Alert.alert('Required', 'Please enter church name');
      return;
    }

    setIsSubmitting(true);
    try {
      await addMemberByAdmin({
        name: newName.trim(),
        phone: cleanPhone.slice(-10),
        churchName: newChurch.trim(),
        village: newVillage.trim(),
        denomination: newDenomination,
        role: newRole,
        permissions: newPermissions,
      });

      setShowAddModal(false);
      Alert.alert(
        'Member Added',
        `${newName} has been added to ${currentAssociation.name} as ${newRole}.`
      );
    } catch {
      Alert.alert('Error', 'Could not add member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEditMember = async () => {
    if (!editingPastor) return;

    setIsSubmitting(true);
    try {
      await updatePastorRoleAndPermissions(
        editingPastor.id,
        editRole,
        editPermissions
      );

      const targetName = editingPastor.name;
      setEditingPastor(null);
      Alert.alert(
        'Permissions Updated',
        `Updated role & access permissions for ${targetName}.`
      );
    } catch {
      Alert.alert('Error', 'Could not update role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Row with Title and Add Button */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Directory</Text>
            <Text style={styles.subtitle}>{currentAssociation.name}</Text>
          </View>

          {currentUser.isAdmin && (
            <TouchableOpacity
              style={styles.addPastorBtn}
              activeOpacity={0.8}
              onPress={handleOpenAddModal}
            >
              <Feather name="user-plus" size={15} color="#FFFFFF" />
              <Text style={styles.addPastorBtnText}>Add Pastor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Admin Notice Banner */}
        {currentUser.isAdmin && (
          <View style={styles.adminBanner}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.brandNavy} />
            <View style={{ flex: 1 }}>
              <Text style={styles.adminBannerTitle}>
                Association Admin Access ({currentUser.role})
              </Text>
              <Text style={styles.adminBannerSubtitle}>
                Administrative rights are restricted strictly to President, Secretary, and Treasurer.
              </Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, church, village"
            placeholderTextColor={COLORS.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          <Chip
            label="All members"
            isActive={filterTab === 'all'}
            onPress={() => setFilterTab('all')}
          />
          <Chip
            label="Office bearers"
            isActive={filterTab === 'officers'}
            onPress={() => setFilterTab('officers')}
          />
          <Chip
            label="Ministry ▾"
            isActive={filterTab === 'ministry'}
            onPress={() => setFilterTab(filterTab === 'ministry' ? 'all' : 'ministry')}
          />
        </View>

        {/* Association Info Callout */}
        <InfoBox
          type="blue"
          icon="shield"
          boldPrefix={`${currentUser.association} · ${pastors.length} members.`}
          text="You can see pastors of your own association only."
        />

        {/* Member List */}
        <View style={styles.list}>
          {filteredPastors.map((pastor, index) => {
            const isLast = index === filteredPastors.length - 1;
            const pastorIsAdmin = isPastorAdmin(pastor.role);

            return (
              <TouchableOpacity
                key={pastor.id}
                style={[styles.memberRow, isLast && styles.memberRowLast]}
                activeOpacity={0.7}
                onPress={() => selectPastor(pastor)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {pastor.name.replace('Pastor ', '').replace('Rev. ', '').charAt(0)}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{pastor.name}</Text>
                    {pastor.isVerified && (
                      <Ionicons name="checkmark-circle" size={15} color={COLORS.brandTeal} />
                    )}
                  </View>
                  <Text style={styles.churchSub} numberOfLines={1}>
                    {pastor.churchName} · {pastor.village}
                  </Text>
                </View>

                {/* Role Badge */}
                <View style={styles.roleContainer}>
                  {pastorIsAdmin ? (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield" size={10} color="#92400E" />
                      <Text style={styles.adminBadgeText}>{pastor.role}</Text>
                    </View>
                  ) : (
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>{pastor.role}</Text>
                    </View>
                  )}

                  {/* Admin Manage Role Button */}
                  {currentUser.isAdmin && (
                    <TouchableOpacity
                      style={styles.manageRoleBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(pastor);
                      }}
                    >
                      <Feather name="sliders" size={14} color={COLORS.brandNavy} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredPastors.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No pastors found matching your query.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL 1: ADD PASTOR TO ASSOCIATION                         */}
      {/* ========================================================= */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Member to Association</Text>
                <Text style={styles.modalSubtitle}>{currentAssociation.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Pastor Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pastor{"'"}s Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Pastor K. David Kumar"
                  placeholderTextColor={COLORS.muted}
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              {/* Mobile Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Phone Number *</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="98480 12345"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={newPhone}
                    onChangeText={setNewPhone}
                  />
                </View>
              </View>

              {/* Church Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Church / Ministry Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Grace Baptist Chapel"
                  placeholderTextColor={COLORS.muted}
                  value={newChurch}
                  onChangeText={setNewChurch}
                />
              </View>

              {/* Village / Mandal */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Village / Town</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mustabad"
                  placeholderTextColor={COLORS.muted}
                  value={newVillage}
                  onChangeText={setNewVillage}
                />
              </View>

              {/* Denomination quick select */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Denomination</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.denomRow}>
                  {DENOMINATIONS.map((denom) => (
                    <TouchableOpacity
                      key={denom}
                      style={[
                        styles.denomChip,
                        newDenomination === denom && styles.denomChipActive,
                      ]}
                      onPress={() => setNewDenomination(denom)}
                    >
                      <Text
                        style={[
                          styles.denomChipText,
                          newDenomination === denom && styles.denomChipTextActive,
                        ]}
                      >
                        {denom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* ROLE SELECTION */}
              <View style={styles.inputGroup}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.label}>Assign Association Role *</Text>
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
                      newRole === 'PRESIDENT' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('PRESIDENT')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="ribbon" size={16} color={newRole === 'PRESIDENT' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>President</Text>
                    <Text style={styles.roleDesc}>Full association administrative rights</Text>
                  </TouchableOpacity>

                  {/* Secretary */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      newRole === 'SECRETARY' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('SECRETARY')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="document-text" size={16} color={newRole === 'SECRETARY' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Secretary</Text>
                    <Text style={styles.roleDesc}>Member management, events & notices</Text>
                  </TouchableOpacity>

                  {/* Treasurer */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      newRole === 'TREASURER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('TREASURER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="wallet" size={16} color={newRole === 'TREASURER' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Treasurer</Text>
                    <Text style={styles.roleDesc}>Financial records, donations & attendance</Text>
                  </TouchableOpacity>

                  {/* Member */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      newRole === 'MEMBER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('MEMBER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="person" size={16} color={newRole === 'MEMBER' ? COLORS.brandNavy : COLORS.muted} />
                      <View style={styles.memberPill}>
                        <Text style={styles.memberPillText}>STANDARD</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Member</Text>
                    <Text style={styles.roleDesc}>Fellowship member with standard access</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PERMISSIONS TOGGLES */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Access Permissions</Text>
                <Text style={styles.sublabel}>
                  Fine-tune permissions assigned to this pastor
                </Text>

                <View style={styles.permissionsContainer}>
                  {/* Can Manage Members */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Manage Members</Text>
                      <Text style={styles.permDesc}>Add pastors and view member directory</Text>
                    </View>
                    <Switch
                      value={newPermissions.canManageMembers}
                      onValueChange={(val) =>
                        setNewPermissions((prev) => ({ ...prev, canManageMembers: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Assign Roles */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Assign Roles & Permissions</Text>
                      <Text style={styles.permDesc}>Grant or modify roles and administrative rights</Text>
                    </View>
                    <Switch
                      value={newPermissions.canAssignRoles}
                      onValueChange={(val) =>
                        setNewPermissions((prev) => ({ ...prev, canAssignRoles: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Create Events */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Create Events</Text>
                      <Text style={styles.permDesc}>Publish fellowship meetings and conventions</Text>
                    </View>
                    <Switch
                      value={newPermissions.canCreateEvents}
                      onValueChange={(val) =>
                        setNewPermissions((prev) => ({ ...prev, canCreateEvents: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Track Attendance */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Track Attendance</Text>
                      <Text style={styles.permDesc}>Access attendance registers for events</Text>
                    </View>
                    <Switch
                      value={newPermissions.canTrackAttendance}
                      onValueChange={(val) =>
                        setNewPermissions((prev) => ({ ...prev, canTrackAttendance: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Manage Donations */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Manage Donations</Text>
                      <Text style={styles.permDesc}>View financials and collection records</Text>
                    </View>
                    <Switch
                      value={newPermissions.canManageDonations}
                      onValueChange={(val) =>
                        setNewPermissions((prev) => ({ ...prev, canManageDonations: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Broadcast Notices */}
                  <View style={[styles.permRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Broadcast Notices</Text>
                      <Text style={styles.permDesc}>Send association announcements to all pastors</Text>
                    </View>
                    <Switch
                      value={newPermissions.canBroadcastNotices}
                      onValueChange={(val) =>
                        setNewPermissions((prev) => ({ ...prev, canBroadcastNotices: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.8}
                onPress={handleSubmitAddMember}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Add Pastor to Association</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: MANAGE ROLE & ACCESS PERMISSIONS                  */}
      {/* ========================================================= */}
      <Modal
        visible={!!editingPastor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingPastor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage Role & Permissions</Text>
                <Text style={styles.modalSubtitle}>{editingPastor?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingPastor(null)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Pastor Overview */}
              <View style={styles.memberBriefCard}>
                <Ionicons name="person-circle" size={36} color={COLORS.brandNavy} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.briefName}>{editingPastor?.name}</Text>
                  <Text style={styles.briefChurch}>{editingPastor?.churchName}</Text>
                  <Text style={styles.briefPhone}>{editingPastor?.phone}</Text>
                </View>
                <View style={isPastorAdmin(editingPastor?.role || 'MEMBER') ? styles.adminBadge : styles.memberBadge}>
                  <Text style={isPastorAdmin(editingPastor?.role || 'MEMBER') ? styles.adminBadgeText : styles.memberBadgeText}>
                    {editingPastor?.role}
                  </Text>
                </View>
              </View>

              {/* ROLE SELECTION */}
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
                      editRole === 'PRESIDENT' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('PRESIDENT')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="ribbon" size={16} color={editRole === 'PRESIDENT' ? '#B45309' : COLORS.muted} />
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
                      editRole === 'SECRETARY' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('SECRETARY')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="document-text" size={16} color={editRole === 'SECRETARY' ? '#B45309' : COLORS.muted} />
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
                      editRole === 'TREASURER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('TREASURER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="wallet" size={16} color={editRole === 'TREASURER' ? '#B45309' : COLORS.muted} />
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
                      editRole === 'MEMBER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('MEMBER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="person" size={16} color={editRole === 'MEMBER' ? COLORS.brandNavy : COLORS.muted} />
                      <View style={styles.memberPill}>
                        <Text style={styles.memberPillText}>STANDARD</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Member</Text>
                    <Text style={styles.roleDesc}>Standard member access</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PERMISSIONS TOGGLES */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Access Permissions</Text>
                <Text style={styles.sublabel}>
                  Toggle specific permissions for this member
                </Text>

                <View style={styles.permissionsContainer}>
                  {/* Can Manage Members */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Manage Members</Text>
                      <Text style={styles.permDesc}>Add pastors and view member directory</Text>
                    </View>
                    <Switch
                      value={editPermissions.canManageMembers}
                      onValueChange={(val) =>
                        setEditPermissions((prev) => ({ ...prev, canManageMembers: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Assign Roles */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Assign Roles & Permissions</Text>
                      <Text style={styles.permDesc}>Grant or modify roles and administrative rights</Text>
                    </View>
                    <Switch
                      value={editPermissions.canAssignRoles}
                      onValueChange={(val) =>
                        setEditPermissions((prev) => ({ ...prev, canAssignRoles: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Create Events */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Create Events</Text>
                      <Text style={styles.permDesc}>Publish fellowship meetings and conventions</Text>
                    </View>
                    <Switch
                      value={editPermissions.canCreateEvents}
                      onValueChange={(val) =>
                        setEditPermissions((prev) => ({ ...prev, canCreateEvents: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Track Attendance */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Track Attendance</Text>
                      <Text style={styles.permDesc}>Access attendance registers for events</Text>
                    </View>
                    <Switch
                      value={editPermissions.canTrackAttendance}
                      onValueChange={(val) =>
                        setEditPermissions((prev) => ({ ...prev, canTrackAttendance: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Manage Donations */}
                  <View style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Manage Donations</Text>
                      <Text style={styles.permDesc}>View financials and collection records</Text>
                    </View>
                    <Switch
                      value={editPermissions.canManageDonations}
                      onValueChange={(val) =>
                        setEditPermissions((prev) => ({ ...prev, canManageDonations: val }))
                      }
                      trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                    />
                  </View>

                  {/* Can Broadcast Notices */}
                  <View style={[styles.permRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>Broadcast Notices</Text>
                      <Text style={styles.permDesc}>Send association announcements to all pastors</Text>
                    </View>
                    <Switch
                      value={editPermissions.canBroadcastNotices}
                      onValueChange={(val) =>
                        setEditPermissions((prev) => ({ ...prev, canBroadcastNotices: val }))
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
                onPress={handleSubmitEditMember}
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
    paddingBottom: 24,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
    marginTop: 2,
  },
  addPastorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brandNavy,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addPastorBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  adminBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  adminBannerSubtitle: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 1,
  },
  searchBar: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  memberRow: {
    minHeight: 74,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  churchSub: {
    fontSize: 13,
    color: COLORS.muted,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  manageRoleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandNavySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
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
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.field,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: '#FFFFFF',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixBox: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.field,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  denomRow: {
    flexDirection: 'row',
  },
  denomChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.ground,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginRight: 8,
  },
  denomChipActive: {
    backgroundColor: COLORS.brandTealSoft,
    borderColor: COLORS.brandTeal,
  },
  denomChipText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  denomChipTextActive: {
    color: COLORS.brandTeal,
    fontWeight: '700',
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
  memberBriefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.brandNavySoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  briefName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  briefChurch: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  briefPhone: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
});
