import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { ScreenName, isPastorAdmin } from '../types';
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
  const {
    currentScreen,
    navigateTo,
    showPrototypePicker,
    togglePrototypePicker,
    associations,
    currentAssociation,
    switchAssociation,
    currentUser,
  } = useApp();

  const isAssociationAdmin = Boolean(
    currentUser.isAdmin ||
      currentUser.permissions?.canCreateEvents ||
      (currentUser.role && isPastorAdmin(currentUser.role))
  );

  const visibleScreens = SCREENS.filter((s) => {
    if (s.key === 'create' && !isAssociationAdmin) return false;
    return true;
  });


  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle}>ShepherdLink · Multi-Association Demo</Text>
          <Text style={styles.subtext}>One Fold, One Shepherd • Switch associations below</Text>
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
        <>
          {/* Screen Picker Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {visibleScreens.map((s) => {
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

          {/* Association Switcher Row */}
          <View style={styles.assocRow}>
            <View style={styles.assocLabelWrap}>
              <FontAwesome5 name="church" size={11} color={COLORS.brandTeal} />
              <Text style={styles.assocLabel}>Active Association:</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.assocList}
            >
              {associations.map((assoc) => {
                const isSelected = currentAssociation.id === assoc.id;
                return (
                  <TouchableOpacity
                    key={assoc.id}
                    activeOpacity={0.7}
                    onPress={() => switchAssociation(assoc.id)}
                    style={[styles.assocPill, isSelected && styles.assocPillSelected]}
                  >
                    <Text
                      style={[
                        styles.assocPillText,
                        isSelected && styles.assocPillTextSelected,
                      ]}
                    >
                      {assoc.name.replace(' Pastors Association', '').replace(' Pastors Fellowship', '').replace(' Pastors Alliance', '')} ({assoc.district})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
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
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
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
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
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
  assocRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingHorizontal: 16,
  },
  assocLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  assocLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  assocList: {
    gap: 6,
    flexDirection: 'row',
  },
  assocPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  assocPillSelected: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  assocPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.ink,
  },
  assocPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
