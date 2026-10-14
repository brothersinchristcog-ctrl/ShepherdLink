import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Tag } from '../components/Tag';
import { COLORS } from '../constants/theme';

export const PrayerScreen: React.FC = () => {
  const { prayers, togglePrayer, addPrayer } = useApp();
  const [activeScope, setActiveScope] = useState<'mine' | 'global'>('mine');
  const [requestText, setRequestText] = useState('');
  const [leadersOnly, setLeadersOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<'HEALTH' | 'MINISTRY' | 'FAMILY' | 'CHURCH'>('HEALTH');

  const filteredPrayers = prayers.filter((p) => {
    if (activeScope === 'mine') {
      return !p.isGlobal;
    }
    return p.isGlobal;
  });

  const handlePost = () => {
    if (!requestText.trim()) {
      Alert.alert('Empty Request', 'Please enter a prayer need before posting.');
      return;
    }
    addPrayer(requestText.trim(), selectedTag, leadersOnly);
    setRequestText('');
    Alert.alert('Shared', 'Your prayer request has been posted to the fellowship.');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Prayer requests</Text>

      {/* Segmented Control */}
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segBtn, activeScope === 'mine' && styles.segBtnActive]}
          onPress={() => setActiveScope('mine')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segText, activeScope === 'mine' && styles.segTextActive]}>
            My association
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, activeScope === 'global' && styles.segBtnActive]}
          onPress={() => setActiveScope('global')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segText, activeScope === 'global' && styles.segTextActive]}>
            Global
          </Text>
        </TouchableOpacity>
      </View>

      {/* Share a Prayer Need Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Share a prayer need</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Write your request…"
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={3}
          value={requestText}
          onChangeText={setRequestText}
        />

        {/* Category tags selector */}
        <View style={styles.tagChips}>
          {(['HEALTH', 'MINISTRY', 'FAMILY', 'CHURCH'] as const).map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
              onPress={() => setSelectedTag(tag)}
            >
              <Text style={[styles.tagChipText, selectedTag === tag && styles.tagChipTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.postActionRow}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setLeadersOnly(!leadersOnly)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, leadersOnly && styles.checkboxChecked]}>
              {leadersOnly && <Feather name="check" size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Leaders only</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.postBtn} onPress={handlePost} activeOpacity={0.8}>
            <Text style={styles.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Prayer Feed */}
      <View style={styles.feed}>
        {filteredPrayers.map((item) => (
          <View key={item.id} style={styles.prayerCard}>
            <View style={styles.prayerHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.pastorName.replace('Pastor ', '').charAt(0)}
                </Text>
              </View>

              <View style={styles.pastorInfo}>
                <Text style={styles.pastorName}>{item.pastorName}</Text>
                <Text style={styles.metaText}>
                  {item.mandal} · {item.timeAgo}
                </Text>
              </View>

              <Tag label={item.tag} type="mine" />
            </View>

            <Text style={styles.prayerBody}>{item.text}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.prayBtn, item.prayedByMe && styles.prayBtnActive]}
                onPress={() => togglePrayer(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.prayedByMe ? 'heart' : 'heart-outline'}
                  size={16}
                  color={item.prayedByMe ? '#FFFFFF' : COLORS.accent}
                />
                <Text style={[styles.prayBtnText, item.prayedByMe && styles.prayBtnTextActive]}>
                  {item.prayedByMe ? `Praying (${item.prayedCount}) ✓` : `I prayed (${item.prayedCount})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commentBtn}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Encouragement', 'Type an encouraging scripture or message for Pastor.')}
              >
                <Feather name="message-circle" size={16} color={COLORS.ink} />
                <Text style={styles.commentBtnText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredPrayers.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No requests in this scope yet.</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  textArea: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: COLORS.field,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: COLORS.ink,
    textAlignVertical: 'top',
  },
  tagChips: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
  },
  tagChipActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  tagChipTextActive: {
    color: COLORS.accent,
  },
  postActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.field,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkboxLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  feed: {
    gap: 12,
  },
  prayerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  pastorInfo: {
    flex: 1,
  },
  pastorName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  prayerBody: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  prayBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayBtnActive: {
    backgroundColor: COLORS.accent,
  },
  prayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  prayBtnTextActive: {
    color: '#FFFFFF',
  },
  commentBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.ink,
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
