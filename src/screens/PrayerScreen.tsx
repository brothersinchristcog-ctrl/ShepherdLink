import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';
import { PrayerRequest, PrayerTag } from '../types';

type ScopeFilter = 'all' | 'mine' | 'global' | 'urgent' | 'my-posts';

type TagConfigItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  border: string;
  text: string;
};

const DEFAULT_TAG_CONFIG: Record<string, TagConfigItem> = {
  HEALTH: {
    label: 'Health',
    icon: 'medical',
    bg: '#FFE4E6',
    border: '#FECDD3',
    text: '#BE123C',
  },
  MINISTRY: {
    label: 'Ministry',
    icon: 'book',
    bg: '#E0F2FE',
    border: '#BAE6FD',
    text: '#0369A1',
  },
  FAMILY: {
    label: 'Family',
    icon: 'people',
    bg: '#F3E8FF',
    border: '#E9D5FF',
    text: '#7E22CE',
  },
  CHURCH: {
    label: 'Church',
    icon: 'business',
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#B45309',
  },
  THANKSGIVING: {
    label: 'Thanksgiving',
    icon: 'sparkles',
    bg: '#DCFCE7',
    border: '#BBF7D0',
    text: '#15803D',
  },
  MISSIONS: {
    label: 'Missions',
    icon: 'globe',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1D4ED8',
  },
};

const DYNAMIC_PALETTES = [
  { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C', icon: 'flame' as const },
  { bg: '#FEF9C3', border: '#FEF08A', text: '#A16207', icon: 'sunny' as const },
  { bg: '#EDE9FE', border: '#DDD6FE', text: '#6D28D9', icon: 'ribbon' as const },
  { bg: '#E0E7FF', border: '#C7D2FE', text: '#4338CA', icon: 'pricetag' as const },
  { bg: '#CCFBF1', border: '#99F6E4', text: '#0F766E', icon: 'heart' as const },
  { bg: '#FCE7F3', border: '#FBCFE8', text: '#BE185D', icon: 'rose' as const },
];

function getTagConfig(tag: string): TagConfigItem {
  const normalizedKey = tag.toUpperCase().replace(/\s+/g, '_');
  if (DEFAULT_TAG_CONFIG[normalizedKey]) {
    return DEFAULT_TAG_CONFIG[normalizedKey];
  }

  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chosen = DYNAMIC_PALETTES[Math.abs(hash) % DYNAMIC_PALETTES.length];

  const label = tag
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    label,
    icon: chosen.icon,
    bg: chosen.bg,
    border: chosen.border,
    text: chosen.text,
  };
}

const AVAILABLE_CATEGORY_ICONS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'sparkles', label: 'Spiritual' },
  { icon: 'flame', label: 'Revival' },
  { icon: 'heart', label: 'Love' },
  { icon: 'globe', label: 'Outreach' },
  { icon: 'shield-checkmark', label: 'Deliverance' },
  { icon: 'cash', label: 'Finance' },
  { icon: 'school', label: 'Youth' },
  { icon: 'sunny', label: 'Thanksgiving' },
];

const SCRIPTURE_PROMPTS = [
  'Standing in faith with you, Pastor! Jeremiah 30:17',
  'Philippians 4:19 — God shall supply all your need.',
  'Praying with our congregation for complete victory!',
  'Isaiah 41:10 — Fear not, for the Lord is with you.',
];

const AVATAR_PALETTES = [
  { bg: '#002B5C', text: '#FFFFFF' },
  { bg: '#009B9E', text: '#FFFFFF' },
  { bg: '#4F46E5', text: '#FFFFFF' },
  { bg: '#D97706', text: '#FFFFFF' },
  { bg: '#059669', text: '#FFFFFF' },
  { bg: '#9333EA', text: '#FFFFFF' },
];

function getAvatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export const PrayerScreen: React.FC = () => {
  const {
    prayers,
    togglePrayer,
    addPrayer,
    deletePrayer,
    addPrayerComment,
    deletePrayerComment,
    currentUser,
    loggedPastor,
  } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [tagFilter, setTagFilter] = useState<string>('ALL');

  // Categories list (defaults + dynamically added)
  const [userCategories, setUserCategories] = useState<string[]>([
    'HEALTH',
    'MINISTRY',
    'FAMILY',
    'CHURCH',
    'THANKSGIVING',
    'MISSIONS',
  ]);

  // Merge categories from state and any existing tags on loaded prayers
  const allCategories = useMemo(() => {
    const set = new Set<string>(userCategories);
    prayers.forEach((p) => {
      if (p.tag) {
        set.add(p.tag.toUpperCase());
      }
    });
    return Array.from(set);
  }, [userCategories, prayers]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [selectedTag, setSelectedTag] = useState<PrayerTag>('HEALTH');
  const [isGlobalScope, setIsGlobalScope] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [leadersOnly, setLeadersOnly] = useState(false);

  // Add New Category Modal State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState<keyof typeof Ionicons.glyphMap>('sparkles');
  const [addCategoryContext, setAddCategoryContext] = useState<'filter' | 'compose'>('filter');

  // Encourage / Comments Modal State
  const [activeCommentPrayer, setActiveCommentPrayer] = useState<PrayerRequest | null>(null);
  const [commentInput, setCommentInput] = useState('');

  // Counts
  const counts = useMemo(() => {
    return {
      all: prayers.length,
      mine: prayers.filter((p) => !p.isGlobal).length,
      global: prayers.filter((p) => p.isGlobal).length,
      urgent: prayers.filter((p) => p.isUrgent).length,
      myPosts: prayers.filter((p) => {
        const myName = loggedPastor?.name || currentUser.name;
        return myName && p.pastorName.toLowerCase() === myName.toLowerCase();
      }).length,
    };
  }, [prayers, loggedPastor, currentUser]);

  // Filtered list
  const filteredPrayers = useMemo(() => {
    return prayers.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchText = p.text.toLowerCase().includes(query);
        const matchPastor = p.pastorName.toLowerCase().includes(query);
        const matchMandal = p.mandal.toLowerCase().includes(query);
        const matchTag = p.tag.toLowerCase().includes(query);
        if (!matchText && !matchPastor && !matchMandal && !matchTag) {
          return false;
        }
      }

      // 2. Scope Filter
      if (scopeFilter === 'mine' && p.isGlobal) return false;
      if (scopeFilter === 'global' && !p.isGlobal) return false;
      if (scopeFilter === 'urgent' && !p.isUrgent) return false;
      if (scopeFilter === 'my-posts') {
        const myName = loggedPastor?.name || currentUser.name;
        if (!myName || p.pastorName.toLowerCase() !== myName.toLowerCase()) {
          return false;
        }
      }

      // 3. Category Tag Filter
      if (tagFilter !== 'ALL' && p.tag.toUpperCase() !== tagFilter.toUpperCase()) {
        return false;
      }

      return true;
    });
  }, [prayers, searchQuery, scopeFilter, tagFilter, loggedPastor, currentUser]);

  const handleOpenAddCategory = (context: 'filter' | 'compose') => {
    setAddCategoryContext(context);
    setNewCategoryName('');
    setSelectedCategoryIcon('sparkles');
    setShowAddCategoryModal(true);
  };

  const handleSaveNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert('Category Name Required', 'Please type a name for the new category.');
      return;
    }

    const key = trimmed.toUpperCase().replace(/\s+/g, '_');

    // Register into userCategories if not exists
    if (!userCategories.includes(key)) {
      setUserCategories((prev) => [...prev, key]);
    }

    // Auto select based on where the user opened the modal
    if (addCategoryContext === 'compose') {
      setSelectedTag(key);
    } else {
      setTagFilter(key);
    }

    setShowAddCategoryModal(false);
    setNewCategoryName('');
    Alert.alert('Category Added', `"${trimmed}" is now available in categories.`);
  };

  const handleDeleteCategory = (catKey: string) => {
    const config = getTagConfig(catKey);
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete the category "${config.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setUserCategories((prev) =>
              prev.filter((c) => c.toUpperCase() !== catKey.toUpperCase())
            );
            if (tagFilter.toUpperCase() === catKey.toUpperCase()) {
              setTagFilter('ALL');
            }
            if (selectedTag.toUpperCase() === catKey.toUpperCase()) {
              setSelectedTag('HEALTH');
            }
          },
        },
      ]
    );
  };

  const handlePostPrayer = () => {
    if (!requestText.trim()) {
      Alert.alert('Empty Request', 'Please describe your prayer need before posting.');
      return;
    }
    addPrayer(
      requestText.trim(),
      selectedTag,
      leadersOnly,
      isGlobalScope,
      isUrgent
    );
    setRequestText('');
    setIsUrgent(false);
    setLeadersOnly(false);
    setShowCreateModal(false);
    Alert.alert('Shared in Faith', 'Your prayer request has been posted to the fellowship.');
  };

  const handleDelete = (prayer: PrayerRequest) => {
    Alert.alert(
      'Delete Prayer Request',
      `Are you sure you want to remove this prayer request from ${prayer.pastorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePrayer(prayer.id),
        },
      ]
    );
  };

  const handleDeleteComment = (prayerId: string, commentId: string) => {
    Alert.alert(
      'Delete Encouragement',
      'Are you sure you want to remove this encouraging comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePrayerComment(prayerId, commentId);
            setActiveCommentPrayer((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                comments: (prev.comments || []).filter((c) => c.id !== commentId),
              };
            });
          },
        },
      ]
    );
  };

  const handleShare = async (prayer: PrayerRequest) => {
    try {
      await Share.share({
        message: `🙏 Prayer Request from ${prayer.pastorName} (${prayer.mandal}):\n\n"${prayer.text}"\n\nJoin us in prayer on ShepherdLink.`,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !activeCommentPrayer) return;
    addPrayerComment(activeCommentPrayer.id, commentInput.trim());
    setCommentInput('');
    setActiveCommentPrayer((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        comments: [
          ...(prev.comments || []),
          {
            id: `pc-${Date.now()}`,
            authorName: loggedPastor?.name || currentUser.name || 'Fellow Pastor',
            text: commentInput.trim(),
            timeAgo: 'Just now',
          },
        ],
      };
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modern Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Prayer Requests</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredPrayers.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerCreateBtn}
            activeOpacity={0.85}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.headerCreateBtnText}>Request</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.brandTeal} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search needs, pastors, mandals..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Primary Scope Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scopeChipsScroll}
        >
          <TouchableOpacity
            style={[styles.scopeChip, scopeFilter === 'all' && styles.scopeChipActive]}
            onPress={() => setScopeFilter('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.scopeChipText, scopeFilter === 'all' && styles.scopeChipTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeChip, scopeFilter === 'mine' && styles.scopeChipActive]}
            onPress={() => setScopeFilter('mine')}
            activeOpacity={0.75}
          >
            <Text style={[styles.scopeChipText, scopeFilter === 'mine' && styles.scopeChipTextActive]}>
              Association ({counts.mine})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeChip, scopeFilter === 'global' && styles.scopeChipActive]}
            onPress={() => setScopeFilter('global')}
            activeOpacity={0.75}
          >
            <Text style={[styles.scopeChipText, scopeFilter === 'global' && styles.scopeChipTextActive]}>
              Global ({counts.global})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeChip, scopeFilter === 'urgent' && styles.scopeChipActive]}
            onPress={() => setScopeFilter('urgent')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="flash"
              size={12}
              color={scopeFilter === 'urgent' ? '#FFFFFF' : '#EF4444'}
            />
            <Text style={[styles.scopeChipText, scopeFilter === 'urgent' && styles.scopeChipTextActive]}>
              Urgent ({counts.urgent})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeChip, scopeFilter === 'my-posts' && styles.scopeChipActive]}
            onPress={() => setScopeFilter('my-posts')}
            activeOpacity={0.75}
          >
            <Text style={[styles.scopeChipText, scopeFilter === 'my-posts' && styles.scopeChipTextActive]}>
              My Requests ({counts.myPosts})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Category Tag Chips Row with + New Category Button */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagChipsScroll}
        >
          {/* "All Needs" Chip */}
          <TouchableOpacity
            style={[styles.categoryTagChip, tagFilter === 'ALL' && styles.categoryTagChipActive]}
            onPress={() => setTagFilter('ALL')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.categoryTagChipText,
                tagFilter === 'ALL' && styles.categoryTagChipTextActive,
              ]}
            >
              All Needs
            </Text>
          </TouchableOpacity>

          {/* Dynamic Category Chips */}
          {allCategories.map((catKey) => {
            const isSelected = tagFilter.toUpperCase() === catKey.toUpperCase();
            const config = getTagConfig(catKey);
            const isCustom = !['HEALTH', 'MINISTRY', 'FAMILY', 'CHURCH'].includes(
              catKey.toUpperCase()
            );

            return (
              <TouchableOpacity
                key={catKey}
                style={[styles.categoryTagChip, isSelected && styles.categoryTagChipActive]}
                onPress={() => setTagFilter(catKey)}
                onLongPress={() => {
                  if (isCustom) {
                    handleDeleteCategory(catKey);
                  }
                }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={config.icon}
                  size={11}
                  color={isSelected ? '#0F172A' : config.text}
                />
                <Text
                  style={[
                    styles.categoryTagChipText,
                    isSelected && styles.categoryTagChipTextActive,
                  ]}
                >
                  {config.label}
                </Text>

                {isCustom && (
                  <TouchableOpacity
                    style={styles.categoryChipDeleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(catKey);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={13}
                      color={isSelected ? '#0F172A' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {/* "+ New" Category Button */}
          <TouchableOpacity
            style={styles.addCategoryChip}
            onPress={() => handleOpenAddCategory('filter')}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={13} color={COLORS.brandTeal} />
            <Text style={styles.addCategoryChipText}>New</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Quick Prayer Invitation Banner Card */}
        <TouchableOpacity
          style={styles.invitationCard}
          activeOpacity={0.88}
          onPress={() => setShowCreateModal(true)}
        >
          <View style={styles.invitationIconCircle}>
            <Ionicons name="heart-circle" size={26} color={COLORS.brandTeal} />
          </View>
          <View style={styles.invitationContent}>
            <Text style={styles.invitationTitle}>Need Prayer or Thanksgiving?</Text>
            <Text style={styles.invitationSub}>
              Share with fellow pastors to stand in united faith
            </Text>
          </View>
          <View style={styles.invitationPostBtn}>
            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
            <Text style={styles.invitationPostBtnText}>Post</Text>
          </View>
        </TouchableOpacity>

        {/* Prayer Feed List */}
        <View style={styles.feed}>
          {filteredPrayers.map((item) => {
            const palette = getAvatarPalette(item.pastorName);
            const tagInfo = getTagConfig(item.tag);
            const commentsCount = item.comments?.length || 0;

            return (
              <View key={item.id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: palette.bg }]}>
                    <Text style={[styles.avatarText, { color: palette.text }]}>
                      {item.pastorName.replace('Pastor ', '').charAt(0)}
                    </Text>
                  </View>

                  <View style={styles.headerInfoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.pastorName} numberOfLines={1}>
                        {item.pastorName}
                      </Text>
                      {item.isUrgent && (
                        <View style={styles.urgentBadge}>
                          <Ionicons name="flash" size={10} color="#DC2626" />
                          <Text style={styles.urgentBadgeText}>Urgent</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.mandal} · {item.timeAgo}
                    </Text>
                  </View>

                  {/* Top-Right Badges & Actions */}
                  <View style={styles.cardHeaderRight}>
                    <View
                      style={[
                        styles.tagPill,
                        { backgroundColor: tagInfo.bg, borderColor: tagInfo.border },
                      ]}
                    >
                      <Ionicons name={tagInfo.icon} size={10} color={tagInfo.text} />
                      <Text style={[styles.tagPillText, { color: tagInfo.text }]}>
                        {tagInfo.label}
                      </Text>
                    </View>

                    {/* Delete Option on Prayer Card */}
                    <TouchableOpacity
                      style={styles.trashBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDelete(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Scope & Privacy Micro Badges */}
                {(item.isGlobal || item.leadersOnly) && (
                  <View style={styles.microBadgesRow}>
                    {item.isGlobal && (
                      <View style={styles.microBadge}>
                        <Ionicons name="globe-outline" size={10} color="#0369A1" />
                        <Text style={styles.microBadgeText}>Global Request</Text>
                      </View>
                    )}
                    {item.leadersOnly && (
                      <View style={styles.microBadgeLeaders}>
                        <Ionicons name="lock-closed-outline" size={10} color="#7C3AED" />
                        <Text style={styles.microBadgeTextLeaders}>Leaders Only</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Prayer Request Body */}
                <Text style={styles.prayerBody}>{item.text}</Text>

                {/* Subtle Divider */}
                <View style={styles.cardDivider} />

                {/* Card Action Footer */}
                <View style={styles.cardFooter}>
                  {/* Stand in Prayer / Prayed Button */}
                  <TouchableOpacity
                    style={[
                      styles.prayBtn,
                      item.prayedByMe ? styles.prayBtnActive : styles.prayBtnInactive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => togglePrayer(item.id)}
                  >
                    <Ionicons
                      name={item.prayedByMe ? 'heart' : 'heart-outline'}
                      size={15}
                      color={item.prayedByMe ? '#FFFFFF' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.prayBtnLabel,
                        item.prayedByMe && styles.prayBtnLabelActive,
                      ]}
                    >
                      {item.prayedByMe
                        ? `Praying (${item.prayedCount}) ✓`
                        : `I Prayed (${item.prayedCount})`}
                    </Text>
                  </TouchableOpacity>

                  {/* Right Actions: Encourage & Share */}
                  <View style={styles.footerRightActions}>
                    <TouchableOpacity
                      style={styles.encourageBtn}
                      activeOpacity={0.75}
                      onPress={() => {
                        setActiveCommentPrayer(item);
                        setCommentInput('');
                      }}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={14}
                        color={COLORS.brandNavy}
                      />
                      <Text style={styles.encourageBtnText}>
                        {commentsCount > 0 ? `Encourage (${commentsCount})` : 'Encourage'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareIconBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleShare(item)}
                    >
                      <Ionicons name="share-social-outline" size={15} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

          {filteredPrayers.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="heart-dislike-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Prayer Requests Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'No results matched your search terms.'
                  : 'There are no prayer requests in this scope yet.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setSearchQuery('');
                  setScopeFilter('all');
                  setTagFilter('ALL');
                }}
              >
                <Text style={styles.emptyResetBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modern Share Prayer Request Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setShowCreateModal(false)}
            />
            <View style={styles.modalSheet}>
              {/* Modal Handle */}
              <View style={styles.modalHandle} />

              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>Share a Prayer Need</Text>
                  <Text style={styles.modalSub}>
                    Pastors across the fellowship will pray in agreement
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowCreateModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.modalScroll}
              >
                {/* Need Description Text Area */}
                <Text style={styles.fieldLabel}>Your Prayer Request *</Text>
                <TextInput
                  style={styles.modalTextArea}
                  placeholder="Describe the prayer need, healing request, or praise report..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  value={requestText}
                  onChangeText={setRequestText}
                />

                {/* Category Tag Selector with + New button */}
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.fieldLabelNoMargin}>Category</Text>
                  <TouchableOpacity
                    style={styles.addCategoryModalBtn}
                    onPress={() => handleOpenAddCategory('compose')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="add" size={13} color={COLORS.brandTeal} />
                    <Text style={styles.addCategoryModalBtnText}>New Category</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalTagGrid}>
                  {allCategories.map((catKey) => {
                    const isSelected = selectedTag.toUpperCase() === catKey.toUpperCase();
                    const config = getTagConfig(catKey);

                    return (
                      <TouchableOpacity
                        key={catKey}
                        style={[
                          styles.modalTagCard,
                          isSelected && styles.modalTagCardActive,
                        ]}
                        onPress={() => setSelectedTag(catKey)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={config.icon}
                          size={14}
                          color={isSelected ? '#FFFFFF' : config.text}
                        />
                        <Text
                          style={[
                            styles.modalTagCardText,
                            isSelected && styles.modalTagCardTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Scope Selection */}
                <Text style={styles.fieldLabel}>Fellowship Scope</Text>
                <View style={styles.scopeToggleRow}>
                  <TouchableOpacity
                    style={[styles.scopeToggleBtn, !isGlobalScope && styles.scopeToggleBtnActive]}
                    onPress={() => setIsGlobalScope(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="people-outline"
                      size={15}
                      color={!isGlobalScope ? '#002B5C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.scopeToggleText,
                        !isGlobalScope && styles.scopeToggleTextActive,
                      ]}
                    >
                      My Association
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.scopeToggleBtn, isGlobalScope && styles.scopeToggleBtnActive]}
                    onPress={() => setIsGlobalScope(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={15}
                      color={isGlobalScope ? '#002B5C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.scopeToggleText,
                        isGlobalScope && styles.scopeToggleTextActive,
                      ]}
                    >
                      Global Fellowship
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Urgent & Leaders Options */}
                <View style={styles.optionToggles}>
                  <TouchableOpacity
                    style={styles.optionRow}
                    activeOpacity={0.75}
                    onPress={() => setIsUrgent(!isUrgent)}
                  >
                    <View style={[styles.checkbox, isUrgent && styles.checkboxUrgent]}>
                      {isUrgent && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text style={styles.optionTitle}>Mark as Urgent Need</Text>
                      <Text style={styles.optionSub}>
                        Highlights this request for immediate pastoral intercession
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionRow}
                    activeOpacity={0.75}
                    onPress={() => setLeadersOnly(!leadersOnly)}
                  >
                    <View style={[styles.checkbox, leadersOnly && styles.checkboxChecked]}>
                      {leadersOnly && <Feather name="check" size={13} color="#FFFFFF" />}
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text style={styles.optionTitle}>Leaders / Pastors Only</Text>
                      <Text style={styles.optionSub}>
                        Visible only to ordained pastoral leadership
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  activeOpacity={0.85}
                  onPress={handlePostPrayer}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.modalSubmitBtnText}>Post Prayer Request</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add New Category Interactive Modal */}
      <Modal
        visible={showAddCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.categoryBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAddCategoryModal(false)}
            />
            <View style={styles.categoryCardModal}>
              <View style={styles.categoryModalHeader}>
                <View style={styles.categoryModalTitleWrap}>
                  <View style={styles.categoryIconBadge}>
                    <Ionicons name="pricetags" size={18} color={COLORS.brandTeal} />
                  </View>
                  <View>
                    <Text style={styles.categoryModalTitle}>Categories</Text>
                    <Text style={styles.categoryModalSub}>
                      Add or manage prayer request categories
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowAddCategoryModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <Text style={styles.fieldLabel}>Category Name *</Text>
              <TextInput
                style={styles.categoryNameInput}
                placeholder="e.g. Youth, Deliverance, Outreach, Finances..."
                placeholderTextColor="#94A3B8"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />

              {/* Icon Picker Chips */}
              <Text style={styles.fieldLabel}>Choose an Icon</Text>
              <View style={styles.iconChipsGrid}>
                {AVAILABLE_CATEGORY_ICONS.map((item) => {
                  const isChosen = selectedCategoryIcon === item.icon;
                  return (
                    <TouchableOpacity
                      key={item.icon}
                      style={[
                        styles.iconChipOption,
                        isChosen && styles.iconChipOptionActive,
                      ]}
                      onPress={() => setSelectedCategoryIcon(item.icon)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={isChosen ? '#FFFFFF' : '#475569'}
                      />
                      <Text
                        style={[
                          styles.iconChipOptionText,
                          isChosen && styles.iconChipOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.categoryModalActions}>
                <TouchableOpacity
                  style={styles.categoryCancelBtn}
                  onPress={() => setShowAddCategoryModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.categoryConfirmBtn}
                  onPress={handleSaveNewCategory}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.categoryConfirmBtnText}>Add Category</Text>
                </TouchableOpacity>
              </View>

              {/* Manage Custom Categories Section */}
              {userCategories.filter(
                (c) => !['HEALTH', 'MINISTRY', 'FAMILY', 'CHURCH'].includes(c.toUpperCase())
              ).length > 0 && (
                <View style={styles.manageCategorySection}>
                  <Text style={styles.manageCategoryHeader}>Custom Categories</Text>
                  <View style={styles.customCategoryList}>
                    {userCategories
                      .filter(
                        (c) =>
                          !['HEALTH', 'MINISTRY', 'FAMILY', 'CHURCH'].includes(c.toUpperCase())
                      )
                      .map((cKey) => {
                        const conf = getTagConfig(cKey);
                        return (
                          <View key={cKey} style={styles.customCategoryRow}>
                            <View style={styles.customCategoryRowLeft}>
                              <Ionicons name={conf.icon} size={14} color={conf.text} />
                              <Text style={styles.customCategoryRowLabel}>{conf.label}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.deleteCategoryBtn}
                              onPress={() => handleDeleteCategory(cKey)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="trash-outline" size={13} color="#EF4444" />
                              <Text style={styles.deleteCategoryBtnText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Encouragements & Comments Modal */}
      <Modal
        visible={!!activeCommentPrayer}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveCommentPrayer(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setActiveCommentPrayer(null)}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>Prayers & Encouragements</Text>
                  <Text style={styles.modalSub}>
                    Standing with {activeCommentPrayer?.pastorName}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setActiveCommentPrayer(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Snippet of the original request */}
              {activeCommentPrayer && (
                <View style={styles.commentPrayerSnippet}>
                  <Text style={styles.commentPrayerText} numberOfLines={2}>
                    {`"${activeCommentPrayer.text}"`}
                  </Text>
                </View>
              )}

              {/* Comments List */}
              <ScrollView
                style={styles.commentsListScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {activeCommentPrayer?.comments && activeCommentPrayer.comments.length > 0 ? (
                  activeCommentPrayer.comments.map((c) => {
                    const cPal = getAvatarPalette(c.authorName);
                    return (
                      <View key={c.id} style={styles.commentItem}>
                        <View style={[styles.commentAvatar, { backgroundColor: cPal.bg }]}>
                          <Text style={[styles.commentAvatarText, { color: cPal.text }]}>
                            {c.authorName.replace('Pastor ', '').charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.commentBubble}>
                          <View style={styles.commentAuthorRow}>
                            <Text style={styles.commentAuthorName}>{c.authorName}</Text>
                            <View style={styles.commentRightMeta}>
                              <Text style={styles.commentTimeAgo}>{c.timeAgo}</Text>
                              <TouchableOpacity
                                style={styles.commentTrashBtn}
                                onPress={() =>
                                  activeCommentPrayer &&
                                  handleDeleteComment(activeCommentPrayer.id, c.id)
                                }
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="trash-outline" size={12} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={styles.commentContentText}>{c.text}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.noCommentsWrap}>
                    <Ionicons name="chatbubbles-outline" size={28} color="#94A3B8" />
                    <Text style={styles.noCommentsText}>
                      No comments yet. Send a scripture or word of faith to Pastor.
                    </Text>
                  </View>
                )}

                {/* Quick Scripture Suggestions */}
                <Text style={styles.quickPromptLabel}>Quick Scripture Encouragements:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickPromptsScroll}
                >
                  {SCRIPTURE_PROMPTS.map((prompt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.promptPill}
                      onPress={() => setCommentInput(prompt)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.promptPillText} numberOfLines={1}>
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </ScrollView>

              {/* Comment Input Footer */}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentTextInput}
                  placeholder="Type an encouraging prayer or scripture..."
                  placeholderTextColor="#94A3B8"
                  value={commentInput}
                  onChangeText={setCommentInput}
                />
                <TouchableOpacity
                  style={[
                    styles.commentSendBtn,
                    !commentInput.trim() && styles.commentSendBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                  disabled={!commentInput.trim()}
                  onPress={handleAddComment}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingTop: 16,
    paddingBottom: 36,
    gap: 12,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#E6F7F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  headerCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brandTeal,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },

  /* Scope Filters */
  scopeChipsScroll: {
    gap: 6,
    paddingRight: 10,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scopeChipActive: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  scopeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Tag Filters */
  tagChipsScroll: {
    gap: 6,
    paddingRight: 10,
    paddingBottom: 2,
  },
  categoryTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTagChipActive: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
  },
  categoryTagChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryTagChipTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  categoryChipDeleteBtn: {
    marginLeft: 3,
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E6F7F7',
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  addCategoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },

  /* Invitation Card */
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 10,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  invitationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitationContent: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  invitationSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  invitationPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.brandNavy,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  invitationPostBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Feed List */
  feed: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#002B5C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pastorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trashBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  microBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -4,
  },
  microBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  microBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369A1',
  },
  microBadgeLeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  microBadgeTextLeaders: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7C3AED',
  },
  prayerBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#1E293B',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 6,
    borderWidth: 1,
  },
  prayBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  prayBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  prayBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  prayBtnLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  encourageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  encourageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  shareIconBtn: {
    padding: 5,
  },

  /* Empty State */
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 6,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.brandNavy,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Modals Common */
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    marginTop: 10,
  },
  fieldLabelNoMargin: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalTextArea: {
    minHeight: 85,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
  },

  /* Modal Tag Grid */
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  addCategoryModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E6F7F7',
  },
  addCategoryModalBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  modalTagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTagCardActive: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
  },
  modalTagCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalTagCardTextActive: {
    color: '#FFFFFF',
  },

  /* Scope Toggle */
  scopeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scopeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  scopeToggleBtnActive: {
    backgroundColor: '#E6F7F7',
    borderColor: COLORS.brandTeal,
  },
  scopeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeToggleTextActive: {
    color: COLORS.brandNavy,
    fontWeight: '700',
  },

  /* Option Checkboxes */
  optionToggles: {
    gap: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
  },
  checkboxUrgent: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brandNavy,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Add Category Modal */
  categoryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  categoryCardModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  categoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryModalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryModalSub: {
    fontSize: 11,
    color: '#64748B',
  },
  categoryNameInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  iconChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  iconChipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconChipOptionActive: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
  },
  iconChipOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  iconChipOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  categoryCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryConfirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Manage Custom Categories */
  manageCategorySection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    gap: 6,
  },
  manageCategoryHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  customCategoryList: {
    gap: 6,
    maxHeight: 120,
  },
  customCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customCategoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customCategoryRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  deleteCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteCategoryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  /* Comments Modal Styles */
  commentPrayerSnippet: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brandTeal,
    marginBottom: 12,
  },
  commentPrayerText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  commentsListScroll: {
    maxHeight: 260,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  commentRightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentTimeAgo: {
    fontSize: 10,
    color: '#94A3B8',
  },
  commentTrashBtn: {
    padding: 2,
  },
  commentContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  noCommentsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  noCommentsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 16,
  },
  quickPromptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  quickPromptsScroll: {
    gap: 6,
    paddingBottom: 8,
  },
  promptPill: {
    backgroundColor: '#E6F7F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    maxWidth: 280,
  },
  promptPillText: {
    fontSize: 11,
    color: COLORS.brandTeal,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  commentTextInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  commentSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
