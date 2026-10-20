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
  Share,
  TextInput,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
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

// Safely load expo-image-picker for web & dev clients
let SafeImagePicker: typeof import('expo-image-picker') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SafeImagePicker = require('expo-image-picker');
} catch {
  SafeImagePicker = null;
}

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

  // Contact actions (for other pastors)
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
      `${displayPastor.churchName}, ${displayPastor.village}, ${displayPastor.mandal}`
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

  // Image picking
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

  // Share Pastor Profile / Card
  const handleShareProfile = async () => {
    try {
      const message =
        `🕊️ *ShepherdLink Pastoral Credentials*\n\n` +
        `👤 *${displayPastor.name}*\n` +
        `🏛️ Church: ${displayPastor.churchName}\n` +
        `📍 Location: ${displayPastor.village || displayPastor.mandal}, ${displayPastor.district}\n` +
        `🏷️ Role: ${displayPastor.role}\n` +
        `📜 Denomination: ${displayPastor.denomination || 'Independent'}\n` +
        `📅 Ordained: ${displayPastor.ordainedYear || '2020'}\n` +
        `📞 Phone: ${displayPastor.phone}\n` +
        `🤝 Association: ${displayPastor.associationName || currentAssociation.name} (${displayPastor.associationCode || currentAssociation.code})\n\n` +
        `Verified clergy registration on ShepherdLink.`;
      await Share.share({ message });
    } catch {
      // ignore
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
      await updatePastorRoleAndPermissions(
        displayPastor.id,
        targetRole,
        targetPermissions
      );
      setShowManageModal(false);
      setCustomAlert({
        visible: true,
        type: 'success',
        title: 'Permissions Updated',
        message: `Updated role & access permissions for ${displayPastor.name}.`,
      });
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

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row */}
        <View style={styles.topNavRow}>
          {isMyProfile ? (
            <View style={styles.headerAssociationBadge}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.brandTeal} />
              <Text style={styles.headerAssociationBadgeText} numberOfLines={1}>
                {currentAssociation?.code || 'SHEPHERD'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={() => navigateTo('directory')}
            >
              <Feather name="chevron-left" size={22} color={COLORS.ink} />
            </TouchableOpacity>
          )}

          <Text style={styles.topNavTitle}>
            {isMyProfile ? 'My Profile' : 'Pastor Profile'}
          </Text>

          {isMyProfile ? (
            <TouchableOpacity
              style={styles.logoutHeaderBtn}
              activeOpacity={0.7}
              onPress={() => setShowSignOutConfirm(true)}
            >
              <Feather name="log-out" size={15} color="#DC2626" />
              <Text style={styles.logoutHeaderText}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.shareHeaderBtn}
              activeOpacity={0.7}
              onPress={handleShareProfile}
            >
              <Feather name="share-2" size={17} color={COLORS.ink} />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Profile Card with Modern Appearance */}
        <View style={styles.heroCard}>
          {/* Subtle Accent Glow Bar */}
          <View style={styles.heroCardAccent} />

          <View style={styles.heroAvatarContainer}>
            {displayPastor.avatarUrl ? (
              <Image
                source={{ uri: displayPastor.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
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
            )}

            {/* Quick edit photo icon overlay for my profile */}
            {isMyProfile && (
              <TouchableOpacity
                style={styles.avatarEditBadge}
                activeOpacity={0.8}
                onPress={openEditModal}
              >
                <Feather name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayPastor.name}</Text>
            {displayPastor.isVerified && (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.brandTeal} />
            )}
          </View>

          <Text style={styles.churchSub}>
            {[displayPastor.churchName, displayPastor.village, displayPastor.mandal, displayPastor.district]
              .filter(Boolean)
              .join(' • ')}
          </Text>

          <View style={styles.heroBadgesRow}>
            <View
              style={[
                styles.roleBadge,
                pastorIsAdmin ? styles.roleBadgeAdmin : styles.roleBadgeMember,
              ]}
            >
              <Ionicons
                name={pastorIsAdmin ? 'shield-checkmark' : 'person'}
                size={12}
                color={pastorIsAdmin ? '#92400E' : COLORS.brandNavy}
              />
              <Text
                style={[
                  styles.roleBadgeText,
                  pastorIsAdmin ? styles.roleBadgeTextAdmin : styles.roleBadgeTextMember,
                ]}
              >
                {displayPastor.role}
              </Text>
            </View>

            <View style={styles.associationChip}>
              <Feather name="globe" size={12} color={COLORS.muted} />
              <Text style={styles.associationChipText} numberOfLines={1}>
                {displayPastor.associationCode || currentAssociation?.code || 'ASSOCIATION'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        {isMyProfile ? (
          <View style={styles.myActionsRow}>
            <TouchableOpacity
              style={styles.actionBtnNavy}
              onPress={openEditModal}
              activeOpacity={0.8}
            >
              <Feather name="edit-3" size={17} color="#FFFFFF" />
              <Text style={styles.actionBtnNavyText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnGold}
              onPress={() => setShowDigitalIdModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={18} color="#92400E" />
              <Text style={styles.actionBtnGoldText}>Digital ID</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={handleShareProfile}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={16} color={COLORS.ink} />
              <Text style={styles.actionBtnOutlineText}>Share</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.otherActionsRow}>
            <TouchableOpacity
              style={styles.actionBtnNavy}
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <Feather name="phone" size={17} color="#FFFFFF" />
              <Text style={styles.actionBtnNavyText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={handleMessage}
              activeOpacity={0.7}
            >
              <Feather name="message-square" size={17} color={COLORS.ink} />
              <Text style={styles.actionBtnOutlineText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={handleDirections}
              activeOpacity={0.7}
            >
              <Feather name="map-pin" size={17} color={COLORS.ink} />
              <Text style={styles.actionBtnOutlineText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutlineIcon}
              onPress={() => setShowDigitalIdModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="card-outline" size={18} color={COLORS.brandTeal} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Digital ID Teaser Banner (Only for My Profile) */}
        {isMyProfile && (
          <TouchableOpacity
            style={styles.idTeaserBanner}
            activeOpacity={0.85}
            onPress={() => setShowDigitalIdModal(true)}
          >
            <View style={styles.idTeaserLeft}>
              <View style={styles.idTeaserIconWrap}>
                <Ionicons name="qr-code-outline" size={22} color="#B45309" />
              </View>
              <View style={styles.idTeaserTextWrap}>
                <Text style={styles.idTeaserTitle}>Digital Clergy Identity Card</Text>
                <Text style={styles.idTeaserSubtitle}>
                  Verified QR Pass for conventions & association access
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#B45309" />
          </TouchableOpacity>
        )}

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

          {/* Manage Button for Association Admins */}
          {currentUser.isAdmin && (
            <TouchableOpacity
              style={styles.adminActionBtn}
              onPress={openManageModal}
              activeOpacity={0.8}
            >
              <Feather name="sliders" size={15} color={COLORS.brandNavy} />
              <Text style={styles.adminActionBtnText}>Manage Role & Permissions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pastoral Profile Credentials & Ministry Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsCardHeader}>
            <Feather name="book-open" size={16} color={COLORS.brandTeal} />
            <Text style={styles.detailsCardTitle}>Ministry & Registry Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Association</Text>
            <Text style={styles.detailValue}>
              {displayPastor.associationName ||
                `${displayPastor.mandal || displayPastor.district || 'Fellowship'} Pastors Association`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Registry Code</Text>
            <Text style={[styles.detailValue, { fontWeight: '700', color: COLORS.brandTeal }]}>
              {displayPastor.associationCode || currentAssociation.code || 'SHEP-REG-001'}
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
            <Text style={styles.detailKey}>Church Address</Text>
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
            <Text style={styles.detailKey}>Ordained Year</Text>
            <Text style={styles.detailValue}>{displayPastor.ordainedYear || '2020'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Ministry Calling</Text>
            <Text style={styles.detailValue}>{displayPastor.ministry || 'Pastoral Ministry'}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailKey}>Languages</Text>
            <Text style={styles.detailValue}>
              {displayPastor.languages?.join(', ') || 'Telugu, English'}
            </Text>
          </View>
        </View>

        {/* Privacy Note */}
        <InfoBox
          type="amber"
          icon="lock"
          text="Clergy identity and church contact records are accessible exclusively to verified pastors of this association."
        />

        {/* Sign Out Button at Bottom of My Profile */}
        {isMyProfile && (
          <TouchableOpacity
            style={styles.logoutFullBtn}
            onPress={() => setShowSignOutConfirm(true)}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={18} color="#DC2626" />
            <Text style={styles.logoutFullBtnText}>Sign Out of ShepherdLink</Text>
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
                <Feather name="x" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
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
                        { backgroundColor: getAvatarColor(editName || 'Pastor') },
                      ]}
                    >
                      <Text style={styles.photoPickerPlaceholderText}>
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
                    <Feather name="image" size={15} color={COLORS.brandNavy} />
                    <Text style={styles.photoPickBtnText}>Select Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoPickBtnOutline}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                  >
                    <Feather name="camera" size={15} color={COLORS.ink} />
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
                  Mobile Phone <Text style={styles.requiredAsterisk}>*</Text>
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
                    placeholder="e.g. Bheemunipatnam"
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
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
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
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            >
              {/* THE OFFICIAL CREDENTIAL CARD */}
              <View style={styles.idCardContainer}>
                {/* Gold Crest Top Border */}
                <View style={styles.idCardHeader}>
                  <View style={styles.idCardEmblemRow}>
                    <Ionicons name="shield-checkmark" size={22} color="#D97706" />
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
                          { backgroundColor: getAvatarColor(displayPastor.name || 'Pastor') },
                        ]}
                      >
                        <Text style={styles.idCardAvatarText}>
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
                      size={140}
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

              {/* Action Buttons Below ID Card */}
              <View style={styles.idModalActions}>
                <TouchableOpacity
                  style={styles.idShareBtn}
                  onPress={handleShareProfile}
                  activeOpacity={0.8}
                >
                  <Feather name="share-2" size={16} color="#FFFFFF" />
                  <Text style={styles.idShareBtnText}>Share Clergy Pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.idDoneBtn}
                  onPress={() => setShowDigitalIdModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.idDoneBtnText}>Close</Text>
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
                <Feather name="x" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
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
                    <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
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
              <Feather name="log-out" size={26} color="#DC2626" />
            </View>

            <Text style={styles.confirmTitle}>Sign Out of ShepherdLink?</Text>
            <Text style={styles.confirmSubtitle}>
              You are signed in as <Text style={{ fontWeight: '700' }}>{displayPastor.name}</Text>. You can sign back in anytime using your phone number.
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
                <Text style={styles.confirmDangerBtnText}>Sign Out</Text>
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
                size={32}
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
    backgroundColor: COLORS.ground,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  /* Top Nav */
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  headerAssociationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brandTealSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    maxWidth: 120,
  },
  headerAssociationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandTeal,
    letterSpacing: 0.5,
  },
  logoutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  shareHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.line,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.soft,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  heroCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: COLORS.brandTeal,
  },
  heroAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  largeAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.brandNavy,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    textAlign: 'center',
  },
  churchSub: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: 8,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  roleBadgeAdmin: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  roleBadgeMember: {
    backgroundColor: COLORS.brandNavySoft,
    borderWidth: 1,
    borderColor: '#C7D9EE',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  roleBadgeTextAdmin: {
    color: '#92400E',
  },
  roleBadgeTextMember: {
    color: COLORS.brandNavy,
  },
  associationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  associationChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },

  /* Action Buttons */
  myActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  otherActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnNavy: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.brandNavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnNavyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnGold: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnGoldText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnOutline: {
    flex: 1.5,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.field,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionBtnOutlineText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnOutlineIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.field,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ID Teaser Banner */
  idTeaserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  idTeaserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  idTeaserIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idTeaserTextWrap: {
    flex: 1,
  },
  idTeaserTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  idTeaserSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },

  /* Admin Role Card */
  adminCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  permPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.ink,
  },
  permPillTextDisabled: {
    color: COLORS.muted,
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brandNavySoft,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CADCF2',
    marginTop: 2,
  },
  adminActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },

  /* Details Card */
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  detailsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
    marginBottom: 4,
  },
  detailsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
  },
  detailKey: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },

  /* Full Logout Button at Profile Bottom */
  logoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
  },
  logoutFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
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
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
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
    marginTop: 12,
  },

  /* ==================== EDIT PROFILE STYLES ==================== */
  photoPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
  },
  photoPickerAvatarWrapper: {
    position: 'relative',
  },
  photoPickerImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
  },
  photoPickerPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerPlaceholderText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
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
    paddingHorizontal: 12,
    paddingVertical: 9,
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
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.field,
  },
  photoPickBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  photoRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginTop: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#DC2626',
  },
  formInput: {
    height: 48,
    backgroundColor: COLORS.ground,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.ink,
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
    borderColor: COLORS.line,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  chipSelected: {
    backgroundColor: COLORS.brandTealSoft,
    borderColor: COLORS.brandTeal,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
  },
  chipTextSelected: {
    color: COLORS.brandTeal,
    fontWeight: '700',
  },
  saveProfileBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.brandNavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    shadowColor: COLORS.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveProfileBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ==================== DIGITAL ID CARD STYLES ==================== */
  digitalIdModalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '94%',
  },
  digitalIdCloseBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  idCardContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    borderBottomColor: '#D97706',
  },
  idCardEmblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  idCardAssocTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  idCardAssocSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FDE68A',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  idCardRegistryCodeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  idCardRegistryCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE68A',
  },
  idCardBody: {
    alignItems: 'center',
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  idCardAvatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  idCardAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#D97706',
  },
  idCardAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#D97706',
  },
  idCardAvatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  idCardVerifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#059669',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  idCardPastorName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  idCardRolePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  idCardRoleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  idCardChurchName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 6,
  },
  idCardLocation: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  idCardQRSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  idCardQRWrap: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  idCardQRHint: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 8,
  },
  idCardSecurityStrip: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  idCardSecurityText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  idModalActions: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  idShareBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  idShareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  idDoneBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ==================== ADMIN MANAGE ROLES MODAL STYLES ==================== */
  inputGroup: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  sublabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  ruleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ruleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  ruleHelpText: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 12,
    lineHeight: 16,
  },
  rolesGrid: {
    gap: 10,
  },
  roleOptionCard: {
    backgroundColor: COLORS.ground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  roleOptionCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.brandNavy,
    borderWidth: 2,
  },
  roleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  roleDesc: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
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
  permissionsContainer: {
    backgroundColor: COLORS.ground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.soft,
    overflow: 'hidden',
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
  },
  permInfo: {
    flex: 1,
    marginRight: 10,
  },
  permName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  permDesc: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.brandNavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ==================== CUSTOM FEEDBACK POPUP ==================== */
  confirmPopupCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmIconCircleDanger: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmIconCircleSuccess: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.ground,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  confirmDangerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmPrimaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
