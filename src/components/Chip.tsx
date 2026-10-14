import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface ChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  style?: any;
}

export const Chip: React.FC<ChipProps> = ({ label, isActive, onPress, style }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.chip, isActive && styles.chipActive, style]}
    >
      <Text style={[styles.text, isActive && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.ink,
  },
  textActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
