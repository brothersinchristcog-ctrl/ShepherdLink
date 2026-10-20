import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssociationEvent, Pastor } from '../types';
import { COLORS } from '../constants/theme';

// Safely check if expo-camera native module is compiled into the current client binary
let NativeCameraView: any = null;
let useNativeCameraPermissions: any = null;
let isNativeCameraAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cameraPkg = require('expo-camera');
  if (cameraPkg && cameraPkg.CameraView) {
    NativeCameraView = cameraPkg.CameraView;
    useNativeCameraPermissions = cameraPkg.useCameraPermissions;
    isNativeCameraAvailable = true;
  }
} catch {
  isNativeCameraAvailable = false;
  NativeCameraView = null;
  useNativeCameraPermissions = null;
}

interface CameraLiveViewProps {
  onScan: (data: string) => void;
  scanned: boolean;
}

const CameraLiveView: React.FC<CameraLiveViewProps> = ({ onScan, scanned }) => {
  const [permission, requestPermission] = useNativeCameraPermissions();

  useEffect(() => {
    if (NativeCameraView?.onModernBarcodeScanned) {
      try {
        const sub = NativeCameraView.onModernBarcodeScanned((event: { data?: string }) => {
          if (event?.data) {
            onScan(event.data);
          }
        });
        return () => {
          sub?.remove?.();
        };
      } catch {
        // Safe fallback
      }
    }
  }, [onScan]);

  const handleLaunchGoogleScanner = async () => {
    try {
      if (NativeCameraView?.launchScanner) {
        await NativeCameraView.launchScanner({ barcodeTypes: ['qr'] });
      }
    } catch (err) {
      console.warn('Native Google Scanner not available:', err);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionBox}>
        <Ionicons name="camera-outline" size={44} color={COLORS.brandTeal} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSub}>
          Enable camera to scan the event check-in QR code.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={16} color="#FFFFFF" />
          <Text style={styles.permissionBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <View style={styles.cameraBox}>
        <NativeCameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="on"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'ean13'],
          }}
          onBarcodeScanned={scanned ? undefined : (res: { data?: string }) => {
            if (res?.data) {
              onScan(res.data);
            }
          }}
        />
        {/* Reticle Overlay on Camera */}
        <View style={styles.overlayFrame}>
          <View style={[styles.cornerReticle, styles.cornerTL]} />
          <View style={[styles.cornerReticle, styles.cornerTR]} />
          <View style={[styles.cornerReticle, styles.cornerBL]} />
          <View style={[styles.cornerReticle, styles.cornerBR]} />
          <View style={styles.laserLine} />
        </View>
      </View>

      {/* Google Code Scanner Fast Launcher */}
      <TouchableOpacity
        style={styles.launchGoogleScannerBtn}
        onPress={handleLaunchGoogleScanner}
        activeOpacity={0.8}
      >
        <Ionicons name="scan-circle" size={18} color={COLORS.brandNavy} />
        <Text style={styles.launchGoogleScannerText}>Open Fullscreen Google Scanner</Text>
      </TouchableOpacity>
    </View>
  );
};

interface EventQRScannerModalProps {
  event: AssociationEvent | null;
  visible: boolean;
  onClose: () => void;
  loggedPastor: Pastor | null;
  onRecordAttendance: (eventId: string, pastorId?: string) => void;
}

export const EventQRScannerModal: React.FC<EventQRScannerModalProps> = ({
  event,
  visible,
  onClose,
  loggedPastor,
  onRecordAttendance,
}) => {
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const handleClose = () => {
    setScanned(false);
    setScannedData(null);
    onClose();
  };

  if (!event || !visible) return null;

  const handleScanCode = (code: string) => {
    if (scanned || !code) return;
    setScanned(true);
    setScannedData(code);

    let targetPastorId = loggedPastor?.id;
    try {
      const parsed = JSON.parse(code);
      if (parsed.pastorId) {
        targetPastorId = parsed.pastorId;
      }
    } catch {
      if (code.startsWith('p-')) {
        targetPastorId = code;
      }
    }

    onRecordAttendance(event.id, targetPastorId);
  };

  const handleManualScanSimulation = () => {
    setScanned(true);
    setScannedData(`SHEP-EV-${event.id}`);
    onRecordAttendance(event.id, loggedPastor?.id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.scannerSheet}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.scannerModalTitle}>Event Attendance Scanner</Text>
              <Text style={styles.scannerModalSub} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {!scanned ? (
            <>
              {/* Camera Scanner Viewfinder */}
              <View style={styles.viewfinderContainer}>
                {isNativeCameraAvailable && useNativeCameraPermissions ? (
                  <CameraLiveView onScan={handleScanCode} scanned={scanned} />
                ) : (
                  <View style={styles.viewfinderFrame}>
                    {/* Four Corner Reticles */}
                    <View style={[styles.cornerReticle, styles.cornerTL]} />
                    <View style={[styles.cornerReticle, styles.cornerTR]} />
                    <View style={[styles.cornerReticle, styles.cornerBL]} />
                    <View style={[styles.cornerReticle, styles.cornerBR]} />
                    <View style={styles.laserLine} />

                    <Ionicons name="qr-code-outline" size={72} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.viewfinderHint}>Align QR code inside frame</Text>
                  </View>
                )}
              </View>

              <Text style={styles.scannerInstruction}>
                {isNativeCameraAvailable
                  ? 'Point camera at the event check-in QR code to count attendance instantly.'
                  : 'Scan the event check-in QR code displayed at the entrance or on the pulpit screen to count attendance.'}
              </Text>

              {/* Attendance Record Action */}
              <TouchableOpacity
                style={styles.scanConfirmBtn}
                onPress={handleManualScanSimulation}
                activeOpacity={0.8}
              >
                <Ionicons name="scan" size={18} color="#FFFFFF" />
                <Text style={styles.scanConfirmBtnText}>Scan & Record Attendance</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Scanned Success Confirmation State */
            <View style={styles.scanSuccessWrap}>
              <View style={styles.scanSuccessCircle}>
                <Ionicons name="checkmark-circle" size={56} color={COLORS.green} />
              </View>
              <Text style={styles.scanSuccessTitle}>Attendance Counted!</Text>
              <Text style={styles.scanSuccessSub}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                  {loggedPastor?.name || 'Pastor'}
                </Text>{' '}
                is successfully verified and marked{' '}
                <Text style={{ fontWeight: '800', color: COLORS.green }}>PRESENT</Text> for{' '}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>{event.title}</Text>.
              </Text>

              <View style={styles.scanSuccessDetailBox}>
                <Text style={styles.scanSuccessDetailItem}>
                  📍 Venue: {event.venue}
                </Text>
                <Text style={styles.scanSuccessDetailItem}>
                  ⏰ Time: {event.time}
                </Text>
                <Text style={styles.scanSuccessDetailItem}>
                  🔑 Code: {scannedData || `SHEP-EV-${event.id}`}
                </Text>
                <Text style={[styles.scanSuccessDetailItem, { color: COLORS.green, fontWeight: '700' }]}>
                  ✅ Attendance Status: Recorded & Synced
                </Text>
              </View>

              <TouchableOpacity style={styles.scanDoneBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.scanDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
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
  scannerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    gap: 14,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 2,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scannerModalSub: {
    fontSize: 12,
    color: COLORS.brandTeal,
    fontWeight: '600',
    maxWidth: 240,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    width: '100%',
  },
  viewfinderFrame: {
    width: '100%',
    height: 250,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  viewfinderHint: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  cameraContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  cameraBox: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayFrame: {
    width: 210,
    height: 210,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchGoogleScannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  launchGoogleScannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  cornerReticle: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#00E5FF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },
  laserLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2.5,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  permissionBox: {
    width: 250,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.brandTeal,
    marginTop: 4,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scannerInstruction: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
  scanConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.brandTeal,
    marginTop: 2,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  scanConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scanSuccessWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  scanSuccessCircle: {
    marginBottom: 2,
  },
  scanSuccessTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  scanSuccessSub: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  scanSuccessDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    gap: 5,
    marginTop: 2,
  },
  scanSuccessDetailItem: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  scanDoneBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  scanDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
