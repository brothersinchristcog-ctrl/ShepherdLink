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
  Linking,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
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

export const DirectoryScreen: React.FC = () => {
  const {
    pastors,
    selectPastor,
    currentUser,
    currentAssociation,
    addMemberByAdmin,
    updatePastorRoleAndPermissions,
    navigateTo,
    availableRoles,
    addCustomRole,
  } = useApp();

  const officersCount = pastors.filter((p) => isPastorAdmin(p.role, p.isAdmin)).length;

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
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newIsCustomRole, setNewIsCustomRole] = useState(false);
  const [newCustomRoleText, setNewCustomRoleText] = useState('');
  const [newPermissions, setNewPermissions] = useState<PastorPermissions>(
    getDefaultPermissionsForRole('MEMBER')
  );

  // Form state for editing member
  const [editRole, setEditRole] = useState<PastorRole>('MEMBER');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editIsCustomRole, setEditIsCustomRole] = useState(false);
  const [editCustomRoleText, setEditCustomRoleText] = useState('');
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
      return isPastorAdmin(p.role, p.isAdmin);
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
    setNewIsAdmin(false);
    setNewIsCustomRole(false);
    setNewCustomRoleText('');
    setNewPermissions(getDefaultPermissionsForRole('MEMBER', false));
    setShowAddModal(true);
  };

  const handleRoleChangeForAdd = (role: PastorRole) => {
    setNewIsCustomRole(false);
    setNewRole(role);
    const admin = isPastorAdmin(role);
    setNewIsAdmin(admin);
    setNewPermissions(getDefaultPermissionsForRole(role, admin));
  };

  const handleSelectCustomRoleForAdd = () => {
    setNewIsCustomRole(true);
    setNewIsAdmin(false);
    setNewPermissions(getDefaultPermissionsForRole(newCustomRoleText || 'CUSTOM', false));
  };

  const handleRoleChangeForEdit = (role: PastorRole) => {
    setEditIsCustomRole(false);
    setEditRole(role);
    const admin = isPastorAdmin(role);
    setEditIsAdmin(admin);
    setEditPermissions(getDefaultPermissionsForRole(role, admin));
  };

  const handleSelectCustomRoleForEdit = () => {
    setEditIsCustomRole(true);
    setEditIsAdmin(false);
    setEditPermissions(getDefaultPermissionsForRole(editCustomRoleText || 'CUSTOM', false));
  };

  const handleOpenEditModal = (pastor: Pastor) => {
    setEditingPastor(pastor);
    const role = pastor.role || 'MEMBER';
    const admin = pastor.isAdmin !== undefined ? Boolean(pastor.isAdmin) : isPastorAdmin(role);
    setEditRole(role);
    setEditIsAdmin(admin);
    const isStandard = ['PRESIDENT', 'VICE PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER'].includes(
      role.toUpperCase()
    );
    setEditIsCustomRole(!isStandard);
    setEditCustomRoleText(!isStandard ? role : '');
    setEditPermissions(
      pastor.permissions || getDefaultPermissionsForRole(role, admin)
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

    const resolvedRole = newIsCustomRole
      ? (newCustomRoleText.trim() ? newCustomRoleText.trim().toUpperCase() : 'MEMBER')
      : newRole;

    if (newIsCustomRole && newCustomRoleText.trim()) {
      addCustomRole(resolvedRole);
    }

    setIsSubmitting(true);
    try {
      await addMemberByAdmin({
        name: newName.trim(),
        phone: cleanPhone.slice(-10),
        churchName: newChurch.trim(),
        village: newVillage.trim(),
        denomination: newDenomination,
        role: resolvedRole,
        permissions: newPermissions,
        isAdmin: newIsAdmin,
      });

      setShowAddModal(false);
      Alert.alert(
        'Member Added',
        `${newName} has been added to ${currentAssociation.name} as ${resolvedRole}.`
      );
    } catch {
      Alert.alert('Error', 'Could not add member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEditMember = async () => {
    if (!editingPastor) return;

    const resolvedRole = editIsCustomRole
      ? (editCustomRoleText.trim() ? editCustomRoleText.trim().toUpperCase() : 'MEMBER')
      : editRole;

    if (editIsCustomRole && editCustomRoleText.trim()) {
      addCustomRole(resolvedRole);
    }

    setIsSubmitting(true);
    try {
      await updatePastorRoleAndPermissions(
        editingPastor.id,
        resolvedRole,
        editPermissions,
        editIsAdmin
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

  if (!currentUser.permissions?.canManageMembers) {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedCard}>
          <View style={styles.restrictedIconWrap}>
            <Ionicons name="lock-closed" size={36} color="#DC2626" />
          </View>
          <Text style={styles.restrictedTitle}>Directory Access Disabled</Text>
          <Text style={styles.restrictedDesc}>
            Directory and member access permissions are currently turned off for your account. You can enable &quot;Manage Members&quot; under Role &amp; Access Privileges in your Profile settings.
          </Text>
          <TouchableOpacity
            style={styles.restrictedBtn}
            onPress={() => navigateTo('home')}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={16} color="#FFFFFF" />
            <Text style={styles.restrictedBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Row: Title and Add Pastor Button */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pastors Directory</Text>
            <Text style={styles.subtitle}>
              Certified members & fellowship leaders
            </Text>
          </View>

          {currentUser.permissions?.canManageMembers && (
            <TouchableOpacity
              style={styles.addPastorBtn}
              activeOpacity={0.85}
              onPress={handleOpenAddModal}
            >
              <Ionicons name="person-add" size={15} color="#FFFFFF" />
              <Text style={styles.addPastorBtnText}>Add Pastor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.brandTeal} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by pastor name, church, village..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chipBtn, filterTab === 'all' && styles.chipBtnActive]}
            onPress={() => setFilterTab('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipBtnText, filterTab === 'all' && styles.chipBtnTextActive]}>
              All Pastors ({pastors.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chipBtn, filterTab === 'officers' && styles.chipBtnActive]}
            onPress={() => setFilterTab('officers')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="shield"
              size={12}
              color={filterTab === 'officers' ? '#FFFFFF' : '#D97706'}
            />
            <Text style={[styles.chipBtnText, filterTab === 'officers' && styles.chipBtnTextActive]}>
              Office Bearers ({officersCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Individual Pastor Cards */}
        <View style={styles.cardsContainer}>
          {filteredPastors.map((pastor) => {
            const pastorIsAdmin = isPastorAdmin(pastor.role);
            const avatarBg = getAvatarColor(pastor.name);

            return (
              <TouchableOpacity
                key={pastor.id}
                style={styles.pastorCard}
                activeOpacity={0.75}
                onPress={() => selectPastor(pastor)}
              >
                {/* Card Top Row: Avatar & Details */}
                <View style={styles.cardTopRow}>
                  {/* Rich Colorful Avatar */}
                  <View style={[styles.avatarBox, { backgroundColor: avatarBg }]}>
                    <Text style={styles.avatarLetter}>
                      {pastor.name.replace('Pastor ', '').replace('Rev. ', '').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Pastor Details */}
                  <View style={styles.pastorDetailsCol}>
                    <View style={styles.pastorTitleRow}>
                      <Text style={styles.pastorFullName} numberOfLines={1}>
                        {pastor.name}
                      </Text>
                      {pastor.isVerified && (
                        <Ionicons name="checkmark-circle" size={16} color="#0D9488" />
                      )}
                    </View>

                    {/* Church */}
                    <View style={styles.metaRow}>
                      <Ionicons name="business-outline" size={13} color="#64748B" />
                      <Text style={styles.metaChurchText} numberOfLines={1}>
                        {pastor.churchName}
                      </Text>
                    </View>

                    {/* Location */}
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={13} color="#94A3B8" />
                      <Text style={styles.metaLocationText} numberOfLines={1}>
                        {[pastor.village, pastor.mandal, pastor.district].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Card Divider */}
                <View style={styles.cardDivider} />

                {/* Card Footer: Role, Denomination & Actions */}
                <View style={styles.cardFooterRow}>
                  {pastorIsAdmin ? (
                    <View style={styles.adminRoleBadge}>
                      <Ionicons name="shield" size={11} color="#B45309" />
                      <Text style={styles.adminRoleBadgeText}>{pastor.role}</Text>
                    </View>
                  ) : (
                    <View style={styles.memberRoleBadge}>
                      <Ionicons name="person" size={11} color="#0D9488" />
                      <Text style={styles.memberRoleBadgeText}>{pastor.role}</Text>
                    </View>
                  )}

                  {pastor.denomination ? (
                    <View style={styles.denomTag}>
                      <Text style={styles.denomTagText}>{pastor.denomination}</Text>
                    </View>
                  ) : null}

                  <View style={{ flex: 1 }} />

                  {/* Quick Phone Call Button */}
                  {pastor.phone ? (
                    <TouchableOpacity
                      style={styles.cardCallBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${pastor.phone}`).catch(() => {});
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="call" size={13} color="#0D9488" />
                    </TouchableOpacity>
                  ) : null}

                  {/* Admin Manage Button */}
                  {currentUser.permissions?.canAssignRoles && (
                    <TouchableOpacity
                      style={styles.cardManageBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(pastor);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="options" size={14} color={COLORS.brandNavy} />
                    </TouchableOpacity>
                  )}

                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredPastors.length === 0 && (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search" size={28} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No pastors found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching with a different name, church, or village
              </Text>
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
                    <Text style={styles.ruleBadgeText}>President &amp; Admin Rights</Text>
                  </View>
                </View>
                <Text style={styles.ruleHelpText}>
                  Administrators have full rights to assign standard roles or create custom roles with tailored privileges.
                </Text>

                <View style={styles.rolesGrid}>
                  {/* President */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !newIsCustomRole && newRole === 'PRESIDENT' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('PRESIDENT')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="ribbon" size={16} color={!newIsCustomRole && newRole === 'PRESIDENT' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>President</Text>
                    <Text style={styles.roleDesc}>Full association administrative rights</Text>
                  </TouchableOpacity>

                  {/* Vice President */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !newIsCustomRole && newRole === 'VICE PRESIDENT' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('VICE PRESIDENT')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="shield" size={16} color={!newIsCustomRole && newRole === 'VICE PRESIDENT' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Vice President</Text>
                    <Text style={styles.roleDesc}>Executive administrative rights</Text>
                  </TouchableOpacity>

                  {/* Secretary */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !newIsCustomRole && newRole === 'SECRETARY' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('SECRETARY')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="document-text" size={16} color={!newIsCustomRole && newRole === 'SECRETARY' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Secretary</Text>
                    <Text style={styles.roleDesc}>Member management, events &amp; notices</Text>
                  </TouchableOpacity>

                  {/* Treasurer */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !newIsCustomRole && newRole === 'TREASURER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('TREASURER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="wallet" size={16} color={!newIsCustomRole && newRole === 'TREASURER' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Treasurer</Text>
                    <Text style={styles.roleDesc}>Financial records, donations &amp; attendance</Text>
                  </TouchableOpacity>

                  {/* Member */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !newIsCustomRole && newRole === 'MEMBER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForAdd('MEMBER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="person" size={16} color={!newIsCustomRole && newRole === 'MEMBER' ? COLORS.brandNavy : COLORS.muted} />
                      <View style={styles.memberPill}>
                        <Text style={styles.memberPillText}>STANDARD</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Member</Text>
                    <Text style={styles.roleDesc}>Fellowship member with standard access</Text>
                  </TouchableOpacity>

                  {/* Association Created Custom Roles */}
                  {availableRoles
                    .filter(
                      (r) =>
                        !['PRESIDENT', 'VICE PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER'].includes(
                          (r || '').toUpperCase()
                        )
                    )
                    .map((customR) => {
                      const isSel = !newIsCustomRole && newRole === customR;
                      return (
                        <TouchableOpacity
                          key={customR}
                          style={[
                            styles.roleOptionCard,
                            isSel && styles.roleOptionCardSelected,
                          ]}
                          onPress={() => handleRoleChangeForAdd(customR)}
                        >
                          <View style={styles.roleCardTop}>
                            <Ionicons
                              name="star"
                              size={16}
                              color={isSel ? COLORS.brandTeal : COLORS.muted}
                            />
                            <View style={newIsAdmin && isSel ? styles.adminPill : styles.memberPill}>
                              <Text style={newIsAdmin && isSel ? styles.adminPillText : styles.memberPillText}>
                                {newIsAdmin && isSel ? 'ADMIN' : 'CUSTOM'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.roleTitle} numberOfLines={1}>
                            {customR}
                          </Text>
                          <Text style={styles.roleDesc}>Custom Association Role</Text>
                        </TouchableOpacity>
                      );
                    })}

                  {/* + Custom Role */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      newIsCustomRole && styles.roleOptionCardSelected,
                      { borderStyle: 'dashed' },
                    ]}
                    onPress={handleSelectCustomRoleForAdd}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons
                        name="add-circle"
                        size={18}
                        color={newIsCustomRole ? COLORS.brandTeal : COLORS.brandNavy}
                      />
                      <View style={[styles.memberPill, { backgroundColor: '#F0FDFA' }]}>
                        <Text style={[styles.memberPillText, { color: COLORS.brandTeal }]}>NEW</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>+ Custom Role</Text>
                    <Text style={styles.roleDesc}>Create any custom role</Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Role Input Box */}
                {newIsCustomRole && (
                  <View style={styles.customRoleBox}>
                    <Text style={styles.customRoleBoxTitle}>Enter Custom Role Name</Text>
                    <TextInput
                      style={styles.customRoleInput}
                      placeholder="e.g. Youth Leader, Senior Advisor, Coordinator..."
                      placeholderTextColor="#94A3B8"
                      value={newCustomRoleText}
                      onChangeText={(t) => {
                        setNewCustomRoleText(t);
                        setNewRole(t.toUpperCase());
                      }}
                      autoCapitalize="words"
                    />

                    <View style={styles.customAdminToggleRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.customAdminToggleTitle}>Grant Administrative Privileges</Text>
                        <Text style={styles.customAdminToggleSub}>
                          Enable to grant administrative governance badge and rights
                        </Text>
                      </View>
                      <Switch
                        value={newIsAdmin}
                        onValueChange={(val) => {
                          setNewIsAdmin(val);
                          setNewPermissions(getDefaultPermissionsForRole(newCustomRoleText || 'CUSTOM', val));
                        }}
                        trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                      />
                    </View>
                  </View>
                )}
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
                <View style={isPastorAdmin(editingPastor?.role || 'MEMBER') ? styles.adminRoleBadge : styles.memberRoleBadge}>
                  <Text style={isPastorAdmin(editingPastor?.role || 'MEMBER') ? styles.adminRoleBadgeText : styles.memberRoleBadgeText}>
                    {editingPastor?.role}
                  </Text>
                </View>
              </View>

              {/* ROLE SELECTION */}
              <View style={styles.inputGroup}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.label}>Select or Create Role</Text>
                  <View style={styles.ruleBadge}>
                    <Text style={styles.ruleBadgeText}>President &amp; Admin Rights</Text>
                  </View>
                </View>
                <Text style={styles.ruleHelpText}>
                  Administrators have full rights to assign standard roles or create custom roles with tailored privileges.
                </Text>

                <View style={styles.rolesGrid}>
                  {/* President */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !editIsCustomRole && editRole === 'PRESIDENT' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('PRESIDENT')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="ribbon" size={16} color={!editIsCustomRole && editRole === 'PRESIDENT' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>President</Text>
                    <Text style={styles.roleDesc}>Full administrative rights</Text>
                  </TouchableOpacity>

                  {/* Vice President */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !editIsCustomRole && editRole === 'VICE PRESIDENT' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('VICE PRESIDENT')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="shield" size={16} color={!editIsCustomRole && editRole === 'VICE PRESIDENT' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Vice President</Text>
                    <Text style={styles.roleDesc}>Executive administrative rights</Text>
                  </TouchableOpacity>

                  {/* Secretary */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !editIsCustomRole && editRole === 'SECRETARY' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('SECRETARY')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="document-text" size={16} color={!editIsCustomRole && editRole === 'SECRETARY' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Secretary</Text>
                    <Text style={styles.roleDesc}>Ops, members &amp; notices</Text>
                  </TouchableOpacity>

                  {/* Treasurer */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !editIsCustomRole && editRole === 'TREASURER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('TREASURER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="wallet" size={16} color={!editIsCustomRole && editRole === 'TREASURER' ? '#B45309' : COLORS.muted} />
                      <View style={styles.adminPill}>
                        <Text style={styles.adminPillText}>ADMIN</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Treasurer</Text>
                    <Text style={styles.roleDesc}>Finances &amp; collections</Text>
                  </TouchableOpacity>

                  {/* Member */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      !editIsCustomRole && editRole === 'MEMBER' && styles.roleOptionCardSelected,
                    ]}
                    onPress={() => handleRoleChangeForEdit('MEMBER')}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons name="person" size={16} color={!editIsCustomRole && editRole === 'MEMBER' ? COLORS.brandNavy : COLORS.muted} />
                      <View style={styles.memberPill}>
                        <Text style={styles.memberPillText}>STANDARD</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>Member</Text>
                    <Text style={styles.roleDesc}>Standard member access</Text>
                  </TouchableOpacity>

                  {/* Association Created Custom Roles */}
                  {availableRoles
                    .filter(
                      (r) =>
                        !['PRESIDENT', 'VICE PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER'].includes(
                          (r || '').toUpperCase()
                        )
                    )
                    .map((customR) => {
                      const isSel = !editIsCustomRole && editRole === customR;
                      return (
                        <TouchableOpacity
                          key={customR}
                          style={[
                            styles.roleOptionCard,
                            isSel && styles.roleOptionCardSelected,
                          ]}
                          onPress={() => handleRoleChangeForEdit(customR)}
                        >
                          <View style={styles.roleCardTop}>
                            <Ionicons
                              name="star"
                              size={16}
                              color={isSel ? COLORS.brandTeal : COLORS.muted}
                            />
                            <View style={editIsAdmin && isSel ? styles.adminPill : styles.memberPill}>
                              <Text style={editIsAdmin && isSel ? styles.adminPillText : styles.memberPillText}>
                                {editIsAdmin && isSel ? 'ADMIN' : 'CUSTOM'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.roleTitle} numberOfLines={1}>
                            {customR}
                          </Text>
                          <Text style={styles.roleDesc}>Custom Association Role</Text>
                        </TouchableOpacity>
                      );
                    })}

                  {/* + Custom Role */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      editIsCustomRole && styles.roleOptionCardSelected,
                      { borderStyle: 'dashed' },
                    ]}
                    onPress={handleSelectCustomRoleForEdit}
                  >
                    <View style={styles.roleCardTop}>
                      <Ionicons
                        name="add-circle"
                        size={18}
                        color={editIsCustomRole ? COLORS.brandTeal : COLORS.brandNavy}
                      />
                      <View style={[styles.memberPill, { backgroundColor: '#F0FDFA' }]}>
                        <Text style={[styles.memberPillText, { color: COLORS.brandTeal }]}>NEW</Text>
                      </View>
                    </View>
                    <Text style={styles.roleTitle}>+ Custom Role</Text>
                    <Text style={styles.roleDesc}>Create any custom role</Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Role Input Box */}
                {editIsCustomRole && (
                  <View style={styles.customRoleBox}>
                    <Text style={styles.customRoleBoxTitle}>Enter Custom Role Name</Text>
                    <TextInput
                      style={styles.customRoleInput}
                      placeholder="e.g. Youth Leader, Senior Advisor, Coordinator..."
                      placeholderTextColor="#94A3B8"
                      value={editCustomRoleText}
                      onChangeText={(t) => {
                        setEditCustomRoleText(t);
                        setEditRole(t.toUpperCase());
                      }}
                      autoCapitalize="words"
                    />

                    <View style={styles.customAdminToggleRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.customAdminToggleTitle}>Grant Administrative Privileges</Text>
                        <Text style={styles.customAdminToggleSub}>
                          Enable to grant administrative governance badge and rights
                        </Text>
                      </View>
                      <Switch
                        value={editIsAdmin}
                        onValueChange={(val) => {
                          setEditIsAdmin(val);
                          setEditPermissions(getDefaultPermissionsForRole(editCustomRoleText || 'CUSTOM', val));
                        }}
                        trackColor={{ false: COLORS.ph, true: COLORS.brandTeal }}
                      />
                    </View>
                  </View>
                )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  topAssocBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  assocPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  assocPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  memberCountBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  addPastorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brandTeal,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addPastorBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  adminStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  adminStatusStripText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  searchBar: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipBtnActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardsContainer: {
    gap: 10,
  },
  pastorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pastorDetailsCol: {
    flex: 1,
    gap: 3,
  },
  pastorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastorFullName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaChurchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flexShrink: 1,
  },
  metaLocationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    flexShrink: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminRoleBadge: {
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
  adminRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memberRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
    letterSpacing: 0.3,
  },
  denomTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  denomTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  cardCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardManageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyWrap: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
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
  restrictedContainer: {
    flex: 1,
    backgroundColor: COLORS.ground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  restrictedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  restrictedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  restrictedDesc: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  restrictedBtn: {
    backgroundColor: COLORS.brandNavy,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  restrictedBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customRoleBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    gap: 10,
  },
  customRoleBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  customRoleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  customAdminToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  customAdminToggleTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  customAdminToggleSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
});
