import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface TagProps {
  label: string;
  type?: 'mine' | 'global' | 'role' | 'default';
  size?: 'sm' | 'md';
}

export const Tag: React.FC<TagProps> = ({ label, type = 'mine', size = 'sm' }) => {
  const isMine = type === 'mine';
  const isGlobal = type === 'global';

  return (
    <View
      style={[
        styles.tag,
        isMine && styles.tagMine,
        isGlobal && styles.tagGlobal,
        size === 'md' && styles.tagMd,
      ]}
    >
      <Text
        style={[
          styles.text,
          isMine && styles.textMine,
          isGlobal && styles.textGlobal,
          size === 'md' && styles.textMd,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.soft,
  },
  tagMine: {
    backgroundColor: COLORS.accentSoft,
  },
  tagGlobal: {
    backgroundColor: COLORS.warmSoft,
  },
  tagMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  text: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: 0.5,
  },
  textMine: {
    color: COLORS.accent,
  },
  textGlobal: {
    color: COLORS.warm,
  },
  textMd: {
    fontSize: 11,
  },
});
