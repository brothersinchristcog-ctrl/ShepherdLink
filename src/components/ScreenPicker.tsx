import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { ScreenName } from '../types';
import { COLORS } from '../constants/theme';

interface ScreenOption {
  key: ScreenName;
  label: string;
}

const SCREENS: ScreenOption[] = [
  { key: 'login', label: '1 · Login' },
  { key: 'home', label: '2 · Home' },
  { key: 'directory', label: '3 · Directory' },
  { key: 'profile', label: '4 · Pastor profile' },
  { key: 'events', label: '5 · Events' },
  { key: 'prayer', label: '6 · Prayer' },
  { key: 'create', label: '7 · Create event' },
  { key: 'attendance', label: '8 · Attendance' },
  { key: 'donate', label: '9 · Donate' },
];

export const ScreenPicker: React.FC = () => {
  const { currentScreen, navigateTo, showPrototypePicker, togglePrototypePicker } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle}>ShepherdLink · Clickable Prototype</Text>
          <Text style={styles.subtext}>Tap through or jump directly to any screen</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={togglePrototypePicker}
          activeOpacity={0.7}
        >
          <Feather
            name={showPrototypePicker ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.muted}
          />
        </TouchableOpacity>
      </View>

      {showPrototypePicker && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
        >
          {SCREENS.map((s) => {
            const isActive = currentScreen === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.7}
                onPress={() => navigateTo(s.key)}
                style={[styles.btn, isActive && styles.btnActive]}
              >
                <Text style={[styles.btnText, isActive && styles.btnTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.page,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  subtext: {
    fontSize: 11,
    color: COLORS.muted,
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.field,
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 6,
    flexDirection: 'row',
  },
  btn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.ink,
  },
  btnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
