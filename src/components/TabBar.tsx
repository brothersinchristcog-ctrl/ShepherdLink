import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TabName } from '../types';
import { COLORS } from '../constants/theme';

interface TabItem {
  id: TabName;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const ACTIVE_COLOR = COLORS.brandTeal; // Unified brand teal (#009B9E)
const INACTIVE_COLOR = '#64748B'; // Sleek slate grey

const TABS: TabItem[] = [
  {
    id: 'home',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    id: 'directory',
    label: 'Directory',
    activeIcon: 'people',
    inactiveIcon: 'people-outline',
  },
  {
    id: 'events',
    label: 'Events',
    activeIcon: 'calendar',
    inactiveIcon: 'calendar-outline',
  },
  {
    id: 'prayer',
    label: 'Prayer',
    activeIcon: 'heart',
    inactiveIcon: 'heart-outline',
  },
  {
    id: 'profile',
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
];

export const TabBar: React.FC = () => {
  const { currentScreen, activeTab, navigateTo, currentUser } = useApp();
  const insets = useSafeAreaInsets();

  // Hide tabbar on login screen matching the prototype
  if (currentScreen === 'login') {
    return null;
  }

  // Filter tabs according to user access permissions (e.g. Directory hidden when canManageMembers is false)
  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === 'directory') {
      return Boolean(currentUser?.permissions?.canManageMembers);
    }
    return true;
  });

  const handleTabPress = (tabId: TabName) => {
    if (tabId === 'profile') {
      navigateTo('profile');
    } else {
      navigateTo(tabId);
    }
  };

  // Dedicated clearance ensuring labels never overlap with device gesture bar or navigation buttons
  const bottomPadding = Platform.OS === 'ios'
    ? (insets.bottom > 0 ? insets.bottom : 20)
    : Math.max(insets.bottom, 20);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabBtn}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={23}
                color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            </View>

            {/* Label */}
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
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  iconWrap: {
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: INACTIVE_COLOR,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
});
