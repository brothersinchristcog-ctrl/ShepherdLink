import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface DateBoxProps {
  month: string;
  day: string;
}

export const DateBox: React.FC<DateBoxProps> = ({ month, day }) => {
  return (
    <View style={styles.datebox}>
      <Text style={styles.month}>{month.toUpperCase()}</Text>
      <Text style={styles.day}>{day}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  datebox: {
    width: 58,
    height: 62,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  month: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  day: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.accent,
    marginTop: -2,
  },
});
