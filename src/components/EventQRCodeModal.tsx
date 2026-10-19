import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { AssociationEvent } from '../types';
import { COLORS } from '../constants/theme';

interface EventQRCodeModalProps {
  event: AssociationEvent | null;
  visible: boolean;
  onClose: () => void;
}

export const EventQRCodeModal: React.FC<EventQRCodeModalProps> = ({
  event,
  visible,
  onClose,
}) => {
  if (!event) return null;

  // Real scannable payload: JSON with prefix
  const qrPayload = JSON.stringify({
    app: 'ShepherdLink',
    type: 'EVENT_CHECKIN',
    eventId: event.id,
    title: event.title,
    venue: event.venue,
    date: `${event.month} ${event.day}`,
    associationId: event.associationId,
  });

  const handleShare = async () => {
    try {
      const message = `📋 *ShepherdLink Event Check-in QR*\n` +
        `📅 *${event.title}*\n` +
        `🗓 Date: ${event.month} ${event.day}\n` +
        `⏰ Time: ${event.time}\n` +
        `📍 Venue: ${event.venue}\n` +
        `🔑 Event Code: SHEP-EV-${event.id}\n\n` +
        `Scan this code with ShepherdLink at the venue entrance to record your attendance.`;
      await Share.share({ message });
    } catch {
      // safe fallback
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Event Check-in QR</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* QR Code Container with real SVG QR */}
          <View style={styles.qrWrapper}>
            <View style={styles.qrWhiteBox}>
              <QRCode
                value={qrPayload}
                size={200}
                color={COLORS.brandNavy}
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.eventCodeText}>CODE: SHEP-EV-{event.id}</Text>
          </View>

          {/* Event Quick Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.brandTeal} />
              <Text style={styles.detailText}>{event.month} {event.day} · {event.time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.brandTeal} />
              <Text style={styles.detailText} numberOfLines={1}>{event.venue}</Text>
            </View>
          </View>

          <Text style={styles.instructionText}>
            Display this QR code at the church entrance or on the pulpit screen. Member pastors scan it to record their attendance instantly.
          </Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={16} color={COLORS.brandNavy} />
              <Text style={styles.shareBtnText}>Share Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 14,
    alignItems: 'center',
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.brandTeal,
    fontWeight: '600',
    maxWidth: 240,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  qrWhiteBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#002B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  eventCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  detailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  instructionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.brandNavy,
    backgroundColor: '#FFFFFF',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  doneBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
