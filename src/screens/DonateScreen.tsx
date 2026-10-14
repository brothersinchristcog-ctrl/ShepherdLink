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
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Chip } from '../components/Chip';
import { COLORS } from '../constants/theme';

export const DonateScreen: React.FC = () => {
  const { donations, addDonation, navigateTo } = useApp();
  const [purpose, setPurpose] = useState('Association fund');
  const [amount, setAmount] = useState('1000');
  const [anonymous, setAnonymous] = useState(false);

  const purposeOptions = ['Association fund', 'Pastor welfare', 'Event: Convention'];
  const presetAmounts = ['500', '1000', '2000'];

  const handlePayUpi = () => {
    const parsed = parseInt(amount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please specify a valid contribution amount.');
      return;
    }

    addDonation(purpose, parsed, anonymous);
    Alert.alert(
      'Donation Successful',
      `Contribution of ₹${parsed} towards ${purpose} received via UPI! An SMS receipt has been sent.`
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateTo('home')}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Donate</Text>
      </View>

      {/* Give towards section */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Give towards</Text>
        <View style={styles.chipsRow}>
          {purposeOptions.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              isActive={purpose === opt}
              onPress={() => setPurpose(opt)}
            />
          ))}
        </View>
      </View>

      {/* Amount presets */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountGrid}>
          {presetAmounts.map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[styles.amtChip, amount === amt && styles.amtChipActive]}
              onPress={() => setAmount(amt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.amtChipText, amount === amt && styles.amtChipTextActive]}>
                ₹{Number(amt).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.amtChip,
              !presetAmounts.includes(amount) && styles.amtChipActive,
            ]}
            onPress={() => setAmount('')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.amtChipText,
                !presetAmounts.includes(amount) && styles.amtChipTextActive,
              ]}
            >
              Other
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.amountInputRow}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            value={amount}
            placeholder="0"
            placeholderTextColor={COLORS.muted}
            onChangeText={setAmount}
          />
        </View>
      </View>

      {/* Anonymity Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setAnonymous(!anonymous)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, anonymous && styles.checkboxChecked]}>
          {anonymous && <Feather name="check" size={13} color="#FFFFFF" />}
        </View>
        <Text style={styles.checkboxLabel}>Give anonymously</Text>
      </TouchableOpacity>

      {/* UPI Payment Button */}
      <TouchableOpacity
        style={styles.payBtn}
        onPress={handlePayUpi}
        activeOpacity={0.8}
      >
        <FontAwesome5 name="shield-alt" size={16} color="#FFFFFF" />
        <Text style={styles.payBtnText}>Pay with UPI</Text>
      </TouchableOpacity>

      <Text style={styles.receiptHint}>
        A receipt is sent by SMS and saved in your history.
      </Text>

      {/* My donations history */}
      <Text style={[styles.label, { marginTop: 8 }]}>My donations</Text>
      <View style={styles.historyCard}>
        {donations.map((d, index) => {
          const isLast = index === donations.length - 1;
          return (
            <View
              key={d.id}
              style={[styles.historyRow, isLast && styles.historyRowLast]}
            >
              <Text style={styles.historyMeta}>
                {d.date} · {d.purpose}
              </Text>
              <Text style={styles.historyAmount}>₹{d.amount.toLocaleString()} ✓</Text>
            </View>
          );
        })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amountGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  amtChip: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amtChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  amtChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  amtChipTextActive: {
    color: '#FFFFFF',
  },
  amountInputRow: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.field,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 14,
    color: COLORS.ink,
    fontWeight: '500',
  },
  payBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  receiptHint: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: -4,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.soft,
  },
  historyRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyMeta: {
    fontSize: 14,
    color: COLORS.muted,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
});
