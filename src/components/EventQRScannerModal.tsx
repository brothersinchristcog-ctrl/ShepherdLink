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
import { useApp } from '../context/AppContext';

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

export type ScanStatus = 'SUCCESS' | 'DUPLICATE' | 'INVALID_EVENT' | 'INVALID_FORMAT';

interface ScanOutcome {
  status: ScanStatus;
  title: string;
  subtitle: string;
  badgeText: string;
  pastorName?: string;
  venue?: string;
  time?: string;
  reason?: string;
  code?: string;
}

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
  const { attendanceMap, pastors, currentUser } = useApp();
  const [scanned, setScanned] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [scannedTokens, setScannedTokens] = useState<Set<string>>(new Set());

  const handleResetScanner = () => {
    setScanned(false);
    setOutcome(null);
  };

  const handleClose = () => {
    setScanned(false);
    setOutcome(null);
    onClose();
  };

  if (!event || !visible) return null;

  const handleScanCode = (code: string) => {
    if (scanned || !code) return;
    const trimmedCode = code.trim();

    let parsed: any = null;
    let isShepherdLinkCode = false;
    let codeEventId: string | null = null;
    let targetPastorId: string | null = null;
    let targetPastorName: string | null = null;
    let passId: string | null = null;

    try {
      parsed = JSON.parse(trimmedCode);
      if (parsed && typeof parsed === 'object') {
        if (parsed.app === 'ShepherdLink' || parsed.type === 'EVENT_CHECKIN' || parsed.eventId) {
          isShepherdLinkCode = true;
          codeEventId = parsed.eventId || null;
          targetPastorId = parsed.pastorId || null;
          targetPastorName = parsed.pastorName || null;
          passId = parsed.passId || null;
        }
      }
    } catch {
      if (trimmedCode.startsWith('SHEP-EV-')) {
        isShepherdLinkCode = true;
        codeEventId = trimmedCode.replace('SHEP-EV-', '').trim();
      } else if (trimmedCode.startsWith('p-')) {
        isShepherdLinkCode = true;
        targetPastorId = trimmedCode;
      }
    }

    // CHECK 1: INVALID FORMAT / UNRECOGNIZED QR
    if (!isShepherdLinkCode) {
      setScanned(true);
      setOutcome({
        status: 'INVALID_FORMAT',
        title: 'Invalid QR Code',
        badgeText: 'INVALID QR · UNRECOGNIZED',
        subtitle: 'This QR code is not recognized as a valid ShepherdLink pass.',
        reason: 'The scanned code is not in the correct format for event attendance check-in.',
        code: trimmedCode.length > 50 ? trimmedCode.substring(0, 47) + '...' : trimmedCode,
      });
      return;
    }

    // CHECK 2: WRONG EVENT PASS
    if (codeEventId && event.id && codeEventId !== event.id) {
      setScanned(true);
      setOutcome({
        status: 'INVALID_EVENT',
        title: 'Wrong Event Pass',
        badgeText: 'INVALID PASS · WRONG EVENT',
        subtitle: 'This QR pass belongs to a different event, not for this check-in session.',
        reason: parsed?.title ? `Pass is for: ${parsed.title}` : `Pass Event ID: ${codeEventId}`,
        code: trimmedCode,
      });
      return;
    }

    // Resolve attendee pastor identity
    const effectivePastorId = targetPastorId || loggedPastor?.id || pastors[0]?.id || 'p-self';
    const foundPastor = pastors.find((p) => p.id === effectivePastorId) || loggedPastor;
    const resolvedName = targetPastorName || foundPastor?.name || currentUser?.name || 'Pastor Member';

    // Unique token representing this specific ticket/attendee check-in
    const passToken = passId || `${event.id}:${effectivePastorId}`;

    // CHECK 3: DUPLICATE QR (Already scanned in this session or pastor already marked present)
    const isAlreadyPresent = !!attendanceMap[effectivePastorId];
    const isTokenAlreadyScanned = scannedTokens.has(passToken) || scannedTokens.has(trimmedCode);

    if (isAlreadyPresent || isTokenAlreadyScanned) {
      setScanned(true);
      setOutcome({
        status: 'DUPLICATE',
        title: 'Duplicate QR Code',
        badgeText: 'DUPLICATE QR · ALREADY CHECKED IN',
        subtitle: `${resolvedName} has already checked in for this event. Duplicate scans are rejected.`,
        pastorName: resolvedName,
        reason: `Attendance is already marked PRESENT for ${event.title}.`,
        code: trimmedCode,
      });
      return;
    }

    // CHECK 4: SUCCESSFUL FIRST-TIME SCAN
    setScannedTokens((prev) => new Set(prev).add(passToken).add(trimmedCode));
    onRecordAttendance(event.id, effectivePastorId);

    setScanned(true);
    setOutcome({
      status: 'SUCCESS',
      title: 'Attendance Counted!',
      badgeText: 'VALID PASS · ATTENDANCE COUNTED',
      subtitle: `${resolvedName} is verified and successfully marked PRESENT.`,
      pastorName: resolvedName,
      venue: event.venue,
      time: event.time,
      code: trimmedCode,
    });
  };

  const handleManualScanSimulation = () => {
    const effectivePastorId = loggedPastor?.id || pastors[0]?.id || 'p-self';
    const sampleCode = JSON.stringify({
      app: 'ShepherdLink',
      type: 'EVENT_CHECKIN',
      eventId: event.id,
      title: event.title,
      pastorId: effectivePastorId,
      pastorName: loggedPastor?.name || currentUser?.name || 'Pastor Member',
      passId: `PASS-${event.id}-${effectivePastorId}`,
    });
    handleScanCode(sampleCode);
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

          {!scanned || !outcome ? (
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
                  ? 'Point camera at the attendee pass QR code to verify and count attendance instantly.'
                  : 'Scan the attendee pass QR code to verify attendance.'}
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
            /* Scanned Outcome State: Success, Duplicate, or Invalid */
            <View style={styles.scanOutcomeWrap}>
              {/* Outcome Status Circle Icon */}
              <View
                style={[
                  styles.outcomeCircle,
                  outcome.status === 'SUCCESS' && styles.outcomeCircleSuccess,
                  outcome.status === 'DUPLICATE' && styles.outcomeCircleDuplicate,
                  (outcome.status === 'INVALID_EVENT' || outcome.status === 'INVALID_FORMAT') &&
                    styles.outcomeCircleInvalid,
                ]}
              >
                <Ionicons
                  name={
                    outcome.status === 'SUCCESS'
                      ? 'checkmark-circle'
                      : outcome.status === 'DUPLICATE'
                      ? 'alert-circle'
                      : 'close-circle'
                  }
                  size={52}
                  color={
                    outcome.status === 'SUCCESS'
                      ? COLORS.green
                      : outcome.status === 'DUPLICATE'
                      ? '#D97706'
                      : '#DC2626'
                  }
                />
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.outcomeBadge,
                  outcome.status === 'SUCCESS' && styles.outcomeBadgeSuccess,
                  outcome.status === 'DUPLICATE' && styles.outcomeBadgeDuplicate,
                  (outcome.status === 'INVALID_EVENT' || outcome.status === 'INVALID_FORMAT') &&
                    styles.outcomeBadgeInvalid,
                ]}
              >
                <Text
                  style={[
                    styles.outcomeBadgeText,
                    outcome.status === 'SUCCESS' && styles.outcomeBadgeTextSuccess,
                    outcome.status === 'DUPLICATE' && styles.outcomeBadgeTextDuplicate,
                    (outcome.status === 'INVALID_EVENT' || outcome.status === 'INVALID_FORMAT') &&
                      styles.outcomeBadgeTextInvalid,
                  ]}
                >
                  {outcome.badgeText}
                </Text>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.outcomeTitle}>{outcome.title}</Text>
              <Text style={styles.outcomeSub}>{outcome.subtitle}</Text>

              {/* Details Card */}
              <View
                style={[
                  styles.outcomeDetailBox,
                  outcome.status === 'SUCCESS' && styles.outcomeDetailBoxSuccess,
                  outcome.status === 'DUPLICATE' && styles.outcomeDetailBoxDuplicate,
                  (outcome.status === 'INVALID_EVENT' || outcome.status === 'INVALID_FORMAT') &&
                    styles.outcomeDetailBoxInvalid,
                ]}
              >
                {outcome.pastorName && (
                  <View style={styles.outcomeDetailRow}>
                    <Ionicons name="person-outline" size={14} color="#475569" />
                    <Text style={styles.outcomeDetailLabel}>Attendee:</Text>
                    <Text style={styles.outcomeDetailVal} numberOfLines={1}>
                      {outcome.pastorName}
                    </Text>
                  </View>
                )}

                <View style={styles.outcomeDetailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#475569" />
                  <Text style={styles.outcomeDetailLabel}>Event:</Text>
                  <Text style={styles.outcomeDetailVal} numberOfLines={1}>
                    {event.title}
                  </Text>
                </View>

                {outcome.status === 'SUCCESS' && (
                  <>
                    <View style={styles.outcomeDetailRow}>
                      <Ionicons name="location-outline" size={14} color="#475569" />
                      <Text style={styles.outcomeDetailLabel}>Venue:</Text>
                      <Text style={styles.outcomeDetailVal} numberOfLines={1}>
                        {event.venue}
                      </Text>
                    </View>
                    <View style={styles.outcomeDetailRow}>
                      <Ionicons name="checkmark-done" size={14} color={COLORS.green} />
                      <Text style={[styles.outcomeDetailVal, { color: COLORS.green, fontWeight: '700' }]}>
                        Status: Marked PRESENT & Synced
                      </Text>
                    </View>
                  </>
                )}

                {outcome.status === 'DUPLICATE' && (
                  <View style={styles.outcomeDetailRow}>
                    <Ionicons name="warning-outline" size={14} color="#B45309" />
                    <Text style={[styles.outcomeDetailVal, { color: '#B45309', fontWeight: '700' }]}>
                      Notice: Attendance already counted
                    </Text>
                  </View>
                )}

                {outcome.reason && (
                  <View style={styles.outcomeDetailRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                    <Text style={[styles.outcomeDetailVal, { color: '#DC2626' }]} numberOfLines={2}>
                      {outcome.reason}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.outcomeActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.scanNextBtn,
                    outcome.status === 'DUPLICATE' && styles.scanNextBtnDuplicate,
                    (outcome.status === 'INVALID_EVENT' || outcome.status === 'INVALID_FORMAT') &&
                      styles.scanNextBtnInvalid,
                  ]}
                  onPress={handleResetScanner}
                  activeOpacity={0.8}
                >
                  <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.scanNextBtnText}>
                    {outcome.status === 'SUCCESS' || outcome.status === 'DUPLICATE'
                      ? 'Scan Next Pass'
                      : 'Try Again'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outcomeDoneBtn}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.outcomeDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
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
  scanOutcomeWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    width: '100%',
  },
  outcomeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  outcomeCircleSuccess: {
    backgroundColor: '#DCFCE7',
  },
  outcomeCircleDuplicate: {
    backgroundColor: '#FEF3C7',
  },
  outcomeCircleInvalid: {
    backgroundColor: '#FEE2E2',
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  outcomeBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  outcomeBadgeDuplicate: {
    backgroundColor: '#FEF3C7',
  },
  outcomeBadgeInvalid: {
    backgroundColor: '#FEE2E2',
  },
  outcomeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  outcomeBadgeTextSuccess: {
    color: '#15803D',
  },
  outcomeBadgeTextDuplicate: {
    color: '#B45309',
  },
  outcomeBadgeTextInvalid: {
    color: '#B91C1C',
  },
  outcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  outcomeSub: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  outcomeDetailBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    width: '100%',
    gap: 6,
    marginTop: 2,
  },
  outcomeDetailBoxSuccess: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  outcomeDetailBoxDuplicate: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  outcomeDetailBoxInvalid: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  outcomeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outcomeDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  outcomeDetailVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  outcomeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 6,
  },
  scanNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.brandTeal,
  },
  scanNextBtnDuplicate: {
    backgroundColor: '#D97706',
  },
  scanNextBtnInvalid: {
    backgroundColor: COLORS.brandNavy,
  },
  scanNextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  outcomeDoneBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeDoneBtnText: {
    color: COLORS.brandNavy,
    fontSize: 14,
    fontWeight: '700',
  },
});
