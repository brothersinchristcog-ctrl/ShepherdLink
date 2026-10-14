import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { InfoBox } from '../components/InfoBox';
import { Chip } from '../components/Chip';
import { COLORS } from '../constants/theme';

export const DirectoryScreen: React.FC = () => {
  const { pastors, selectPastor, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'officers' | 'ministry'>('all');

  const filteredPastors = pastors.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.churchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.village.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'officers') {
      return p.role === 'PRESIDENT' || p.role === 'SECRETARY' || p.role === 'TREASURER';
    }

    return true;
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Directory</Text>

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
          return (
            <TouchableOpacity
              key={pastor.id}
              style={[styles.memberRow, isLast && styles.memberRowLast]}
              activeOpacity={0.7}
              onPress={() => selectPastor(pastor)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {pastor.name.replace('Pastor ', '').charAt(0)}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{pastor.name}</Text>
                  {pastor.isVerified && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                  )}
                </View>
                <Text style={styles.churchSub}>
                  {pastor.churchName} · {pastor.village}
                </Text>
              </View>

              <Text style={styles.roleLabel}>{pastor.role}</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
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
    minHeight: 72,
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
  roleLabel: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
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
