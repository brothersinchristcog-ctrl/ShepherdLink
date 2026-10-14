import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TabName } from '../types';
import { COLORS } from '../constants/theme';

interface TabItem {
  id: TabName;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'directory', label: 'Directory', icon: 'users' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'prayer', label: 'Prayer', icon: 'heart' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

export const TabBar: React.FC = () => {
  const { currentScreen, activeTab, navigateTo } = useApp();

  // Hide tabbar on login screen matching the prototype
  if (currentScreen === 'login') {
    return null;
  }

  const handleTabPress = (tabId: TabName) => {
    if (tabId === 'profile') {
      navigateTo('profile');
    } else {
      navigateTo(tabId);
    }
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabBtn}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Feather
              name={tab.icon}
              size={22}
              color={isActive ? COLORS.accent : COLORS.muted}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 20,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabBtn: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.muted,
  },
  tabLabelActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
});
