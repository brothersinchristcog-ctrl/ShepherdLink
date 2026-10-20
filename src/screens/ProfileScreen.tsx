import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  Switch,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';
import {
  Pastor,
  PastorRole,
  PastorPermissions,
  isPastorAdmin,
  getDefaultPermissionsForRole,
} from '../types';

// Safely load expo-image-picker for web & dev clients
let SafeImagePicker: typeof import('expo-image-picker') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SafeImagePicker = require('expo-image-picker');
} catch {
  SafeImagePicker = null;
}

const AVATAR_GRADIENT_PAIRS = [
  { bg: '#0F2B48', text: '#38BDF8' }, // Ocean Navy
  { bg: '#064E3B', text: '#34D399' }, // Deep Forest
  { bg: '#4C1D95', text: '#C084FC' }, // Royal Violet
  { bg: '#78350F', text: '#FBBF24' }, // Imperial Gold
  { bg: '#1E293B', text: '#94A3B8' }, // Slate Obsidian
  { bg: '#831843', text: '#F472B6' }, // Velvet Rose
];

const getAvatarStyle = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENT_PAIRS.length;
  return AVATAR_GRADIENT_PAIRS[index];
};

const COMMON_DENOMINATIONS = [
  'Independent',
  'Baptist',
  'Pentecostal',
  'CSI',
  'Lutheran',
  'Methodist',
  'Assemblies of God',
];

export const ProfileScreen: React.FC = () => {
  const {
    currentScreen,
    selectedPastor,
    navigateTo,
    logout,
    currentUser,
    loggedPastor,
    updatePastorRoleAndPermissions,
    updatePastorProfile,
    currentAssociation,
  } = useApp();

  const isMyProfile = currentScreen === 'profile';

  const displayPastor: Pastor = useMemo(() => {
    if (isMyProfile) {
      return (
        loggedPastor ||
        ({
          id: 'me',
          name: currentUser.name || 'Pastor',
          role: currentUser.role,
          isAdmin: currentUser.isAdmin,
          permissions: currentUser.permissions,
          associationId: currentUser.associationId,
          associationName: currentUser.association,
          associationCode: currentAssociation?.code || '',
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
        } as Pastor)
      );
    }
    return (
      selectedPastor ||
      loggedPastor ||
      ({
        id: 'unknown',
        name: 'Pastor',
        role: 'MEMBER',
        isAdmin: false,
        permissions: getDefaultPermissionsForRole('MEMBER'),
        associationId: currentUser.associationId,
        associationName: currentUser.association,
        associationCode: currentAssociation?.code || '',
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
      } as Pastor)
    );
  }, [isMyProfile, loggedPastor, selectedPastor, currentUser, currentAssociation]);

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDigitalIdModal, setShowDigitalIdModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Custom feedback alert state
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Edit Profile Form State
  const [editName, setEditName] = useState(displayPastor.name || '');
  const [editPhone, setEditPhone] = useState(displayPastor.phone || '');
  const [editChurchName, setEditChurchName] = useState(displayPastor.churchName || '');
  const [editVillage, setEditVillage] = useState(displayPastor.village || '');
  const [editMandal, setEditMandal] = useState(displayPastor.mandal || '');
  const [editDistrict, setEditDistrict] = useState(displayPastor.district || '');
  const [editState, setEditState] = useState(displayPastor.state || '');
  const [editDenomination, setEditDenomination] = useState(displayPastor.denomination || 'Independent');
  const [editOrdainedYear, setEditOrdainedYear] = useState(displayPastor.ordainedYear || '2020');
  const [editMinistry, setEditMinistry] = useState(displayPastor.ministry || 'Pastoral Ministry');
  const [editLanguages, setEditLanguages] = useState(
    displayPastor.languages ? displayPastor.languages.join(', ') : 'Telugu, English'
  );
  const [editAvatarUrl, setEditAvatarUrl] = useState(displayPastor.avatarUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openEditModal = () => {
    setEditName(displayPastor.name || '');
    setEditPhone(displayPastor.phone || '');
    setEditChurchName(displayPastor.churchName || '');
    setEditVillage(displayPastor.village || '');
    setEditMandal(displayPastor.mandal || '');
    setEditDistrict(displayPastor.district || '');
    setEditState(displayPastor.state || '');
    setEditDenomination(displayPastor.denomination || 'Independent');
    setEditOrdainedYear(displayPastor.ordainedYear || '2020');
    setEditMinistry(displayPastor.ministry || 'Pastoral Ministry');
    setEditLanguages(displayPastor.languages ? displayPastor.languages.join(', ') : 'Telugu, English');
    setEditAvatarUrl(displayPastor.avatarUrl || '');
    setShowEditModal(true);
  };

  // Admin Manage Role state
  const [targetRole, setTargetRole] = useState<PastorRole>(displayPastor?.role || 'MEMBER');
  const [targetPermissions, setTargetPermissions] = useState<PastorPermissions>(
    displayPastor?.permissions || getDefaultPermissionsForRole(displayPastor?.role || 'MEMBER')
  );
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  const pastorIsAdmin = isPastorAdmin(displayPastor?.role || 'MEMBER');
  const effectivePermissions =
    displayPastor?.permissions || getDefaultPermissionsForRole(displayPastor?.role || 'MEMBER');

  // Contact actions
  const handleCall = () => {
    if (!displayPastor.phone) return;
    Linking.openURL(`tel:${displayPastor.phone}`).catch(() => {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Calling Failed',
        message: `Could not start phone call to ${displayPastor.phone}.`,
      });
    });
  };

  const handleMessage = () => {
    if (!displayPastor.phone) return;
    Linking.openURL(`sms:${displayPastor.phone}`).catch(() => {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'SMS Failed',
        message: `Could not launch messaging for ${displayPastor.phone}.`,
      });
    });
  };

  const handleDirections = () => {
    const query = encodeURIComponent(
      `${displayPastor.churchName}, ${displayPastor.village || ''}, ${displayPastor.mandal || ''}, ${displayPastor.district || ''}`
    );
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Navigation Failed',
        message: `Could not open maps for ${displayPastor.churchAddress}.`,
      });
    });
  };

  // Photo Picking
  const handlePickPhoto = async () => {
    if (!SafeImagePicker) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Picker Unavailable',
        message: 'Image picking is not enabled in this environment.',
      });
      return;
    }

    try {
      const permission = await SafeImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setCustomAlert({
          visible: true,
          type: 'error',
          title: 'Permission Denied',
          message: 'Please grant gallery permissions to select a profile picture.',
        });
        return;
      }

      const result = await SafeImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const finalUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setEditAvatarUrl(finalUri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleTakePhoto = async () => {
    if (!SafeImagePicker) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Camera Unavailable',
        message: 'Camera capture is not enabled in this environment.',
      });
      return;
    }

    try {
      const permission = await SafeImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setCustomAlert({
          visible: true,
          type: 'error',
          title: 'Permission Denied',
          message: 'Please grant camera access to take a profile photo.',
        });
        return;
      }

      const result = await SafeImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const finalUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setEditAvatarUrl(finalUri);
      }
    } catch (err) {
      console.warn('Camera capture error:', err);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Name Required',
        message: 'Please enter your pastoral name.',
      });
      return;
    }

    if (!editPhone.trim()) {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Phone Required',
        message: 'Please enter your contact phone number.',
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      const langArray = editLanguages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      const updates: Partial<Pastor> = {
        name: editName.trim(),
        phone: editPhone.trim(),
        churchName: editChurchName.trim() || 'Fellowship Church',
        village: editVillage.trim(),
        mandal: editMandal.trim(),
        district: editDistrict.trim(),
        state: editState.trim(),
        churchAddress: `${editChurchName.trim()}, ${editVillage.trim() || editMandal.trim()}`,
        denomination: editDenomination.trim() || 'Independent',
        ordainedYear: editOrdainedYear.trim() || '2020',
        ministry: editMinistry.trim() || 'Pastoral Ministry',
        languages: langArray.length > 0 ? langArray : ['Telugu', 'English'],
        avatarUrl: editAvatarUrl || undefined,
      };

      await updatePastorProfile(displayPastor.id, updates);

      setShowEditModal(false);
      setCustomAlert({
        visible: true,
        type: 'success',
        title: 'Profile Updated',
        message: 'Your pastoral profile and credentials have been updated successfully.',
      });
    } catch (err) {
      console.warn('Failed to update profile:', err);
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update profile. Please try again.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Open Admin Manage Modal
  const openManageModal = () => {
    setTargetRole(displayPastor.role);
    setTargetPermissions(
      displayPastor.permissions || getDefaultPermissionsForRole(displayPastor.role)
    );
    setShowManageModal(true);
  };

  const handleRoleChange = (role: PastorRole) => {
    setTargetRole(role);
    setTargetPermissions(getDefaultPermissionsForRole(role));
  };

  const handleSavePermissions = async () => {
    setIsSubmittingRole(true);
    try {
      const pastorIdToUpdate = displayPastor?.id || loggedPastor?.id || 'me';
      const success = await updatePastorRoleAndPermissions(
        pastorIdToUpdate,
        targetRole,
        targetPermissions
      );

      if (success) {
        setShowManageModal(false);
        setCustomAlert({
          visible: true,
          type: 'success',
          title: 'Permissions Updated',
          message: `Updated role & access permissions for ${displayPastor.name}.`,
        });
      } else {
        throw new Error('Update returned false');
      }
    } catch {
      setCustomAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update permissions. Please try again.',
      });
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Scannable Digital ID QR Code Payload
  const digitalIdPayload = JSON.stringify({
    app: 'ShepherdLink',
    type: 'CLERGY_CREDENTIAL',
    pastorId: displayPastor.id,
    name: displayPastor.name,
    phone: displayPastor.phone,
    role: displayPastor.role,
    church: displayPastor.churchName,
    assocName: displayPastor.associationName || currentAssociation.name,
    assocCode: displayPastor.associationCode || currentAssociation.code,
    verified: displayPastor.isVerified,
    ordainedYear: displayPastor.ordainedYear || '2020',
  });

  const avatarStyle = getAvatarStyle(displayPastor.name || 'Pastor');

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar - Clean and Minimal */}
        <View style={styles.topNavRow}>
          {!isMyProfile ? (
            <TouchableOpacity
              style={styles.circleIconBtn}
              activeOpacity={0.7}
              onPress={() => navigateTo('directory')}
            >
              <Feather name="chevron-left" size={20} color={COLORS.ink} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}

          <Text style={styles.topNavTitle}>
            {isMyProfile ? 'My Profile' : 'Pastor Profile'}
          </Text>

          {/* Symmetrical empty spacer so title stays perfectly centered */}
          <View style={styles.headerSpacer} />
        </View>

        {/* Elegant Executive Profile Card */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarWrapper}>
            {displayPastor.avatarUrl ? (
              <Image
                source={{ uri: displayPastor.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatarInitialsCircle,
                  { backgroundColor: avatarStyle.bg },
                ]}
              >
                <Text style={[styles.avatarInitialsText, { color: avatarStyle.text }]}>
                  {(displayPastor.name || 'P')
                    .replace('Pastor ', '')
                    .replace('Rev. Dr. ', '')
                    .replace('Rev. ', '')
                    .trim()
                    .charAt(0)
                    .toUpperCase() || 'P'}
                </Text>
              </View>
            )}

            {isMyProfile && (
              <TouchableOpacity
                style={styles.avatarCameraBadge}
                activeOpacity={0.8}
                onPress={openEditModal}
              >
                <Feather name="camera" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Name & Official Verified Badge */}
          <View style={styles.nameHeaderWrap}>
            <Text style={styles.pastorDisplayName}>{displayPastor.name}</Text>
            {displayPastor.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.brandTeal} />
            )}
          </View>

          {/* Church Name & Location - Formatted clearly without cutting off */}
          <Text style={styles.churchMainName} numberOfLines={2}>
            {displayPastor.churchName}
          </Text>
          <View style={styles.churchLocationRow}>
            <Ionicons name="location-sharp" size={13} color={COLORS.brandTeal} />
            <Text style={styles.churchLocationText} numberOfLines={1}>
              {[displayPastor.village, displayPastor.mandal, displayPastor.district]
                .filter(Boolean)
                .join(', ') || displayPastor.state || 'Andhra Pradesh'}
            </Text>
          </View>

          {/* Prestigious Role Pill */}
          <View style={styles.prestigiousRolePill}>
            <Ionicons
              name={pastorIsAdmin ? 'shield-checkmark' : 'person'}
              size={13}
              color={pastorIsAdmin ? '#B45309' : COLORS.brandNavy}
            />
            <Text style={styles.prestigiousRoleText}>
              {displayPastor.role}
              {displayPastor.denomination ? `  •  ${displayPastor.denomination.toUpperCase()}` : ''}
            </Text>
          </View>

          {/* Two Perfectly Balanced Action Buttons: Edit Profile & Digital ID Pass */}
          {isMyProfile ? (
            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.heroEditBtn}
                onPress={openEditModal}
                activeOpacity={0.8}
              >
                <Feather name="edit-3" size={16} color={COLORS.brandNavy} />
                <Text style={styles.heroEditBtnText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroGoldBtn}
                onPress={() => setShowDigitalIdModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="qr-code-outline" size={17} color="#92400E" />
                <Text style={styles.heroGoldBtnText}>Digital ID Pass</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.heroPrimaryBtn}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={16} color="#FFFFFF" />
                <Text style={styles.heroPrimaryBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={handleMessage}
                activeOpacity={0.8}
              >
                <Feather name="message-square" size={16} color={COLORS.ink} />
                <Text style={styles.heroSecondaryBtnText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={handleDirections}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={16} color={COLORS.ink} />
                <Text style={styles.heroSecondaryBtnText}>Maps</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroIdPassMiniBtn}
                onPress={() => setShowDigitalIdModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="card-outline" size={18} color={COLORS.brandTeal} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Association Governance & Authority Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionHeaderIconWrap}>
              <Ionicons
                name={pastorIsAdmin ? 'shield-checkmark' : 'shield-outline'}
                size={18}
                color={pastorIsAdmin ? '#B45309' : COLORS.brandNavy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Association Governance</Text>
              <Text style={styles.sectionSubtitle}>
                {displayPastor.associationName || currentAssociation.name}
              </Text>
            </View>

            <View style={pastorIsAdmin ? styles.adminStatusBadge : styles.memberStatusBadge}>
              <Text style={pastorIsAdmin ? styles.adminStatusText : styles.memberStatusText}>
                {displayPastor.role}
              </Text>
            </View>
          </View>

          {/* Summary Authority Metrics */}
          <View style={styles.authorityGrid}>
            <View style={styles.authorityTile}>
              <View style={styles.authorityTileIcon}>
                <Ionicons
                  name={effectivePermissions.canManageMembers ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={effectivePermissions.canManageMembers ? '#059669' : COLORS.muted}
                />
              </View>
              <Text style={styles.authorityTileTitle}>Directory Access</Text>
              <Text style={styles.authorityTileSub}>
                {effectivePermissions.canManageMembers ? 'Manage pastors' : 'Directory view'}
              </Text>
            </View>

            <View style={styles.authorityTile}>
              <View style={styles.authorityTileIcon}>
                <Ionicons
                  name={effectivePermissions.canCreateEvents ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={effectivePermissions.canCreateEvents ? '#059669' : COLORS.muted}
                />
              </View>
              <Text style={styles.authorityTileTitle}>Meetings & Events</Text>
              <Text style={styles.authorityTileSub}>
                {effectivePermissions.canCreateEvents ? 'Publish conventions' : 'Attendee RSVP'}
              </Text>
            </View>

            <View style={styles.authorityTile}>
              <View style={styles.authorityTileIcon}>
                <Ionicons
                  name={effectivePermissions.canTrackAttendance ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={effectivePermissions.canTrackAttendance ? '#059669' : COLORS.muted}
                />
              </View>
              <Text style={styles.authorityTileTitle}>Attendance Register</Text>
              <Text style={styles.authorityTileSub}>
                {effectivePermissions.canTrackAttendance ? 'Scan & verify' : 'Digital QR check-in'}
              </Text>
            </View>

            <View style={styles.authorityTile}>
              <View style={styles.authorityTileIcon}>
                <Ionicons
                  name={effectivePermissions.canBroadcastNotices ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={effectivePermissions.canBroadcastNotices ? '#059669' : COLORS.muted}
                />
              </View>
              <Text style={styles.authorityTileTitle}>Circulars & Notices</Text>
              <Text style={styles.authorityTileSub}>
                {effectivePermissions.canBroadcastNotices ? 'Official broadcasts' : 'Member receiver'}
              </Text>
            </View>
          </View>

          {/* Admin Rights Configurator Button */}
          {currentUser.isAdmin && (
            <TouchableOpacity
              style={styles.manageRoleBtn}
              onPress={openManageModal}
              activeOpacity={0.8}
            >
              <Feather name="sliders" size={14} color={COLORS.brandNavy} />
              <Text style={styles.manageRoleBtnText}>Manage Role & Access Privileges</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Detailed Pastoral & Parish Credentials */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={[styles.sectionHeaderIconWrap, { backgroundColor: COLORS.brandTealSoft }]}>
              <MaterialCommunityIcons name="church" size={18} color={COLORS.brandTeal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Ministry & Parish Records</Text>
              <Text style={styles.sectionSubtitle}>Registered Clergy Information</Text>
            </View>
          </View>

          <View style={styles.infoItemsList}>
            {/* Contact */}
            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <Feather name="phone" size={15} color={COLORS.ink} />
              </View>
              <View style={styles.infoItemContent}>
                <Text style={styles.infoItemLabel}>Contact Number</Text>
                <Text style={styles.infoItemValue}>{displayPastor.phone || 'Not registered'}</Text>
              </View>
              {displayPastor.phone ? (
                <TouchableOpacity
                  style={styles.infoItemAction}
                  onPress={handleCall}
                  activeOpacity={0.7}
                >
                  <Feather name="phone-call" size={14} color={COLORS.brandNavy} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Church Address */}
            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <Feather name="map-pin" size={15} color={COLORS.ink} />
              </View>
              <View style={styles.infoItemContent}>
                <Text style={styles.infoItemLabel}>Church Address & Locality</Text>
                <Text style={styles.infoItemValue}>
                  {displayPastor.churchAddress ||
                    [displayPastor.churchName, displayPastor.village, displayPastor.mandal, displayPastor.district]
                      .filter(Boolean)
                      .join(', ')}
                </Text>
              </View>
            </View>

            {/* Ecclesiastical Credentials */}
            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <MaterialCommunityIcons name="book-cross" size={16} color={COLORS.ink} />
              </View>
              <View style={styles.infoItemContent}>
                <Text style={styles.infoItemLabel}>Denomination & Ordination</Text>
                <Text style={styles.infoItemValue}>
                  {displayPastor.denomination || 'Independent'}  •  Ordained in {displayPastor.ordainedYear || '2020'}
                </Text>
              </View>
            </View>

            {/* Calling & Responsibilities */}
            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <Feather name="award" size={15} color={COLORS.ink} />
              </View>
              <View style={styles.infoItemContent}>
                <Text style={styles.infoItemLabel}>Ministry Calling</Text>
                <Text style={styles.infoItemValue}>
                  {displayPastor.ministry || 'Pastoral & Ministry Leadership'}
                </Text>
              </View>
            </View>

            {/* Languages */}
            <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
              <View style={styles.infoItemIcon}>
                <Feather name="globe" size={15} color={COLORS.ink} />
              </View>
              <View style={styles.infoItemContent}>
                <Text style={styles.infoItemLabel}>Languages Spoken</Text>
                <Text style={styles.infoItemValue}>
                  {displayPastor.languages?.join(', ') || 'Telugu, English'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Association Security Assurance Note */}
        <View style={styles.securityNoteCard}>
          <Feather name="shield" size={16} color="#B45309" />
          <Text style={styles.securityNoteText}>
            Personal contact numbers and ordination records are safeguarded and visible exclusively to verified members within this association.
          </Text>
        </View>

        {/* The ONLY Log Out Button on the Screen */}
        {isMyProfile && (
          <TouchableOpacity
            style={styles.bottomSignOutBtn}
            onPress={() => setShowSignOutConfirm(true)}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={15} color="#DC2626" />
            <Text style={styles.bottomSignOutText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* 1. EDIT PROFILE MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSubtitle}>Update your personal and ministry details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              {/* Photo Selector Section */}
              <View style={styles.photoPickerContainer}>
                <View style={styles.photoPickerAvatarWrapper}>
                  {editAvatarUrl ? (
                    <Image
                      source={{ uri: editAvatarUrl }}
                      style={styles.photoPickerImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.photoPickerPlaceholder,
                        { backgroundColor: avatarStyle.bg },
                      ]}
                    >
                      <Text style={[styles.photoPickerPlaceholderText, { color: avatarStyle.text }]}>
                        {(editName || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.photoPickerActions}>
                  <TouchableOpacity
                    style={styles.photoPickBtn}
                    onPress={handlePickPhoto}
                    activeOpacity={0.8}
                  >
                    <Feather name="image" size={14} color={COLORS.brandNavy} />
                    <Text style={styles.photoPickBtnText}>Upload Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoPickBtnOutline}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                  >
                    <Feather name="camera" size={14} color={COLORS.ink} />
                    <Text style={styles.photoPickBtnOutlineText}>Camera</Text>
                  </TouchableOpacity>

                  {editAvatarUrl ? (
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => setEditAvatarUrl('')}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Form Input: Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Full Pastoral Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Pastor David Raju"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Form Input: Phone Number */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Mobile Phone Number <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+91 9876543210"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Form Input: Church Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Church / Fellowship Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={editChurchName}
                  onChangeText={setEditChurchName}
                  placeholder="e.g. Grace Fellowship Church"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Form Input: Village / Locality */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Village / Town / Colony</Text>
                <TextInput
                  style={styles.formInput}
                  value={editVillage}
                  onChangeText={setEditVillage}
                  placeholder="e.g. Anandapuram"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Form Row: Mandal & District */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Mandal</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editMandal}
                    onChangeText={setEditMandal}
                    placeholder="e.g. Bheemili"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>District</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editDistrict}
                    onChangeText={setEditDistrict}
                    placeholder="e.g. Visakhapatnam"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>
              </View>

              {/* Form Row: State & Ordained Year */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>State</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="e.g. Andhra Pradesh"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Ordained Year</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editOrdainedYear}
                    onChangeText={setEditOrdainedYear}
                    placeholder="e.g. 2018"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>

              {/* Denomination Selector & Preset Chips */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Denomination</Text>
                <TextInput
                  style={styles.formInput}
                  value={editDenomination}
                  onChangeText={setEditDenomination}
                  placeholder="e.g. Independent, Baptist, Pentecostal"
                  placeholderTextColor={COLORS.muted}
                />
                <View style={styles.chipsContainer}>
                  {COMMON_DENOMINATIONS.map((denom) => {
                    const isSelected = editDenomination.toLowerCase() === denom.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={denom}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                        ]}
                        onPress={() => setEditDenomination(denom)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {denom}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Form Input: Ministry Calling */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ministry Calling & Responsibilities</Text>
                <TextInput
                  style={styles.formInput}
                  value={editMinistry}
                  onChangeText={setEditMinistry}
                  placeholder="e.g. Pastoral Care, Youth Ministry, Evangelism"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Form Input: Languages */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Languages Spoken (comma-separated)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editLanguages}
                  onChangeText={setEditLanguages}
                  placeholder="e.g. Telugu, English, Hindi"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.8}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />
                    <Text style={styles.saveProfileBtnText}>Save Profile Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. PRESTIGIOUS DIGITAL CLERGY ID CARD MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showDigitalIdModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDigitalIdModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.digitalIdModalCard}>
            {/* Modal Close Icon */}
            <TouchableOpacity
              onPress={() => setShowDigitalIdModal(false)}
              style={styles.digitalIdCloseBtn}
            >
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', paddingBottom: 24 }}
            >
              {/* THE OFFICIAL CREDENTIAL CARD */}
              <View style={styles.idCardContainer}>
                {/* Gold Crest Top Border */}
                <View style={styles.idCardHeader}>
                  <View style={styles.idCardEmblemRow}>
                    <Ionicons name="shield-checkmark" size={20} color="#D97706" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.idCardAssocTitle} numberOfLines={1}>
                        {displayPastor.associationName || currentAssociation.name}
                      </Text>
                      <Text style={styles.idCardAssocSub}>
                        OFFICIAL CLERGY REGISTRATION PASSPORT
                      </Text>
                    </View>
                  </View>
                  <View style={styles.idCardRegistryCodeBadge}>
                    <Text style={styles.idCardRegistryCode}>
                      {displayPastor.associationCode || currentAssociation.code || 'SHEP-REG'}
                    </Text>
                  </View>
                </View>

                {/* Pastor Portrait & Identity */}
                <View style={styles.idCardBody}>
                  <View style={styles.idCardAvatarWrapper}>
                    {displayPastor.avatarUrl ? (
                      <Image
                        source={{ uri: displayPastor.avatarUrl }}
                        style={styles.idCardAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.idCardAvatarPlaceholder,
                          { backgroundColor: avatarStyle.bg },
                        ]}
                      >
                        <Text style={[styles.idCardAvatarText, { color: avatarStyle.text }]}>
                          {(displayPastor.name || 'P')
                            .replace('Pastor ', '')
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.idCardVerifiedDot}>
                      <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                    </View>
                  </View>

                  <Text style={styles.idCardPastorName}>{displayPastor.name}</Text>
                  <View style={styles.idCardRolePill}>
                    <Text style={styles.idCardRoleText}>
                      {displayPastor.role} • {displayPastor.denomination || 'INDEPENDENT'}
                    </Text>
                  </View>

                  <Text style={styles.idCardChurchName}>{displayPastor.churchName}</Text>
                  <Text style={styles.idCardLocation}>
                    {[displayPastor.village, displayPastor.mandal, displayPastor.district]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>

                {/* Scannable QR Code */}
                <View style={styles.idCardQRSection}>
                  <View style={styles.idCardQRWrap}>
                    <QRCode
                      value={digitalIdPayload}
                      size={130}
                      color="#0F172A"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.idCardQRHint}>
                    Scan for Live Convention & District Verification
                  </Text>
                </View>

                {/* Watermark Security Strip */}
                <View style={styles.idCardSecurityStrip}>
                  <Ionicons name="lock-closed" size={11} color="#B45309" />
                  <Text style={styles.idCardSecurityText}>
                    AUTHENTICATED SHEPHERDLINK REGISTRATION • VALID 2026-2027
                  </Text>
                </View>
              </View>

              {/* Single Full-Width Action Button Below ID Card */}
              <View style={styles.idModalActions}>
                <TouchableOpacity
                  style={styles.idDoneFullBtn}
                  onPress={() => setShowDigitalIdModal(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                  <Text style={styles.idDoneFullBtnText}>Close Identity Pass</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 3. MANAGE ROLE & PERMISSIONS MODAL (FOR ADMINS) */}
      {/* ========================================================================= */}
      <Modal
        visible={showManageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage Role & Permissions</Text>
                <Text style={styles.modalSubtitle}>{displayPastor.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowManageModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.label}>Select Role</Text>
                  <View style={styles.ruleBadge}>
                    <Text style={styles.ruleBadgeText}>Admin Rights Rule</Text>
                  </View>
                </View>
                <Text style={styles.ruleHelpText}>
                  Administrative privileges are restricted strictly to President, Secretary, and Treasurer.
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
                disabled={isSubmittingRole}
              >
                {isSubmittingRole ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={17} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Save Role & Permissions</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. CUSTOM SIGN OUT CONFIRMATION POPUP */}
      {/* ========================================================================= */}
      <Modal
        visible={showSignOutConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmPopupCard}>
            <View style={styles.confirmIconCircleDanger}>
              <Feather name="log-out" size={24} color="#DC2626" />
            </View>

            <Text style={styles.confirmTitle}>Log Out of ShepherdLink?</Text>
            <Text style={styles.confirmSubtitle}>
              You are currently signed in as <Text style={{ fontWeight: '700' }}>{displayPastor.name}</Text>. You can log back in at any time.
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowSignOutConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDangerBtn}
                onPress={() => {
                  setShowSignOutConfirm(false);
                  logout();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmDangerBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. CUSTOM SUCCESS / FEEDBACK POPUP */}
      {/* ========================================================================= */}
      <Modal
        visible={customAlert.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmPopupCard}>
            <View
              style={
                customAlert.type === 'success'
                  ? styles.confirmIconCircleSuccess
                  : styles.confirmIconCircleDanger
              }
            >
              <Ionicons
                name={customAlert.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={30}
                color={customAlert.type === 'success' ? '#059669' : '#DC2626'}
              />
            </View>

            <Text style={styles.confirmTitle}>{customAlert.title}</Text>
            <Text style={styles.confirmSubtitle}>{customAlert.message}</Text>

            <TouchableOpacity
              style={styles.confirmPrimaryBtn}
              onPress={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmPrimaryBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 44,
    gap: 14,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  /* Top Navigation Bar */
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerSpacer: {
    width: 38,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* Executive Hero Card */
  profileHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarInitialsCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarInitialsText: {
    fontSize: 34,
    fontWeight: '800',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.brandNavy,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  nameHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  pastorDisplayName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  churchMainName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  churchLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 12,
  },
  churchLocationText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  prestigiousRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 10,
  },
  prestigiousRoleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },

  /* Beautifully Balanced Action Buttons */
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    width: '100%',
  },
  heroEditBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.2,
    borderColor: '#CADCF2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  heroEditBtnText: {
    color: COLORS.brandNavy,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  heroGoldBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  heroGoldBtnText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },

  /* Actions when viewing other pastors */
  heroPrimaryBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.brandNavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  heroSecondaryBtnText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '600',
  },
  heroIdPassMiniBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Standard Section Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  adminStatusBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  memberStatusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memberStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },

  /* Authority Grid */
  authorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  authorityTile: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  authorityTileIcon: {
    marginBottom: 4,
  },
  authorityTileTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  authorityTileSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  manageRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.brandNavySoft,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CADCF2',
    marginTop: 2,
  },
  manageRoleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },

  /* Ministry Records List */
  infoItemsList: {
    gap: 0,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  infoItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoItemContent: {
    flex: 1,
  },
  infoItemLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  infoItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  infoItemAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandNavySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Security Note */
  securityNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  securityNoteText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    flex: 1,
  },

  /* Bottom Log Out (Centered Soft Rose Pill) */
  bottomSignOutBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 32,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
    marginBottom: 8,
  },
  bottomSignOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.1,
  },

  /* ==================== MODALS COMMON ==================== */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCardLarge: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    marginTop: 10,
  },

  /* ==================== EDIT PROFILE STYLES ==================== */
  photoPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  photoPickerAvatarWrapper: {
    position: 'relative',
  },
  photoPickerImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
  },
  photoPickerPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerPlaceholderText: {
    fontSize: 26,
    fontWeight: '800',
  },
  photoPickerActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brandNavySoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CADCF2',
  },
  photoPickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  photoPickBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  photoPickBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginTop: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  requiredAsterisk: {
    color: '#DC2626',
  },
  formInput: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#0F172A',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  chipSelected: {
    backgroundColor: COLORS.brandTealSoft,
    borderColor: COLORS.brandTeal,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextSelected: {
    color: COLORS.brandTeal,
    fontWeight: '700',
  },
  saveProfileBtn: {
    height: 48,
    borderRadius: 13,
    backgroundColor: COLORS.brandNavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveProfileBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ==================== DIGITAL ID CARD STYLES ==================== */
  digitalIdModalCard: {
    backgroundColor: '#0B132B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '94%',
  },
  digitalIdCloseBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  idCardContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  idCardHeader: {
    backgroundColor: '#002B5C',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2.5,
    borderBottomColor: '#D97706',
  },
  idCardEmblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  idCardAssocTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  idCardAssocSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FDE68A',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  idCardRegistryCodeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  idCardRegistryCode: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FDE68A',
  },
  idCardBody: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 14,
  },
  idCardAvatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  idCardAvatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: '#D97706',
  },
  idCardAvatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#D97706',
  },
  idCardAvatarText: {
    fontSize: 30,
    fontWeight: '800',
  },
  idCardVerifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#059669',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  idCardPastorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  idCardRolePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  idCardRoleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  idCardChurchName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 5,
  },
  idCardLocation: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  idCardQRSection: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  idCardQRWrap: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idCardQRHint: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 6,
  },
  idCardSecurityStrip: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  idCardSecurityText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  idModalActions: {
    width: '100%',
    maxWidth: 340,
    marginTop: 16,
  },
  idDoneFullBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  idDoneFullBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ==================== ADMIN MANAGE ROLES MODAL STYLES ==================== */
  inputGroup: {
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  sublabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 10,
  },
  ruleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  ruleBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#92400E',
  },
  ruleHelpText: {
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 15,
  },
  rolesGrid: {
    gap: 8,
  },
  roleOptionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleOptionCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.brandNavy,
    borderWidth: 1.8,
  },
  roleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  roleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  adminPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  adminPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#92400E',
  },
  memberPill: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  memberPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  permissionsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  permInfo: {
    flex: 1,
    marginRight: 10,
  },
  permName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  permDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  submitBtn: {
    height: 48,
    borderRadius: 13,
    backgroundColor: COLORS.brandNavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ==================== CUSTOM FEEDBACK POPUP ==================== */
  confirmPopupCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  confirmIconCircleDanger: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmIconCircleSuccess: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 5,
  },
  confirmSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmDangerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDangerBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmPrimaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
