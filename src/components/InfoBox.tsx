import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface InfoBoxProps {
  type?: 'blue' | 'amber';
  icon?: keyof typeof Feather.glyphMap;
  text: string;
  boldPrefix?: string;
}

export const InfoBox: React.FC<InfoBoxProps> = ({
  type = 'blue',
  icon,
  text,
  boldPrefix,
}) => {
  const isAmber = type === 'amber';
  const defaultIcon = isAmber ? 'lock' : 'info';

  return (
    <View style={[styles.box, isAmber ? styles.boxAmber : styles.boxBlue]}>
      <Feather
        name={icon || defaultIcon}
        size={17}
        color={isAmber ? COLORS.noteInk : COLORS.accent}
        style={styles.icon}
      />
      <Text style={[styles.text, isAmber ? styles.textAmber : styles.textBlue]}>
        {boldPrefix && <Text style={styles.bold}>{boldPrefix} </Text>}
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    marginVertical: 4,
  },
  boxBlue: {
    backgroundColor: COLORS.accentSoft,
  },
  boxAmber: {
    backgroundColor: COLORS.noteBg,
  },
  icon: {
    marginTop: 2,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  textBlue: {
    color: COLORS.accent,
  },
  textAmber: {
    color: COLORS.noteInk,
  },
  bold: {
    fontWeight: '700',
  },
});
