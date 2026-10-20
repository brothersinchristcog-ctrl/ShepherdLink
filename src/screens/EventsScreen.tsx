import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Share,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AssociationEvent, isPastorAdmin } from '../types';
import { COLORS } from '../constants/theme';
import { EventQRCodeModal } from '../components/EventQRCodeModal';
import { EventQRScannerModal } from '../components/EventQRScannerModal';

const MONTHS_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

// Helper: Calculate if event is Today, Tomorrow, or neither
export const getRelativeDateLabel = (item: AssociationEvent): 'Today' | 'Tomorrow' | null => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  if (item.startDate) {
    const parts = item.startDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const todayMidnight = new Date(currentYear, currentMonth, currentDate).getTime();
      const eventMidnight = new Date(y, m, d).getTime();
      const diffDays = Math.round((eventMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
    }
  }

  const mIndex = MONTHS_MAP[item.month?.toUpperCase()?.trim()];
  if (mIndex !== undefined) {
    const d = parseInt(item.day, 10);
    if (!isNaN(d)) {
      const todayMidnight = new Date(currentYear, currentMonth, currentDate).getTime();
      const eventMidnight = new Date(currentYear, mIndex, d).getTime();
      const diffDays = Math.round((eventMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
    }
  }

  return null;
};

type ScopeFilterType = 'all' | 'private' | 'public' | 'attending';

export const EventsScreen: React.FC = () => {
  const {
    events,
    pastors,
    toggleRSVP,
    selectEventForAttendance,
    navigateTo,
    currentUser,
    loggedPastor,
    toggleAttendance,
    attendanceMap,
    deleteEvent,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilterType>('all');
  const [selectedEventDetails, setSelectedEventDetails] = useState<AssociationEvent | null>(null);

  // Real QR Code and Scanner Modals
  const [scannerEvent, setScannerEvent] = useState<AssociationEvent | null>(null);
  const [qrCodeEvent, setQrCodeEvent] = useState<AssociationEvent | null>(null);

  // Check if current user is an association administrator
  const isAssociationAdmin = Boolean(
    currentUser.isAdmin ||
      currentUser.permissions?.canCreateEvents ||
      (currentUser.role && isPastorAdmin(currentUser.role))
  );

  // Can user track attendance (admins or authorized leaders)
  const canTrackAttendance = Boolean(
    isAssociationAdmin || currentUser.permissions?.canTrackAttendance
  );

  // Filter counts
  const totalCount = events.length;
  const privateCount = useMemo(() => events.filter((e) => e.scope === 'private').length, [events]);
  const publicCount = useMemo(() => events.filter((e) => e.scope === 'public').length, [events]);
  const attendingCount = useMemo(
    () => events.filter((e) => e.rsvp === 'going' || e.rsvp === 'maybe').length,
    [events]
  );

  // Filtered list
  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      // Scope filter
      if (scopeFilter === 'private' && item.scope !== 'private') return false;
      if (scopeFilter === 'public' && item.scope !== 'public') return false;
      if (scopeFilter === 'attending' && item.rsvp !== 'going' && item.rsvp !== 'maybe') return false;

      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchVenue = item.venue.toLowerCase().includes(q);
        const matchBy = item.byAssociation.toLowerCase().includes(q);
        const matchMonth = item.month.toLowerCase().includes(q);
        return matchTitle || matchVenue || matchBy || matchMonth;
      }

      return true;
    });
  }, [events, scopeFilter, searchQuery]);

  const handleShareEvent = async (event: AssociationEvent) => {
    try {
      const message = `📅 *${event.title}*\n` +
        `🗓 Date: ${event.month} ${event.day}\n` +
        `⏰ Time: ${event.time}\n` +
        `📍 Venue: ${event.venue}\n` +
        `⛪ By: ${event.byAssociation}\n\n` +
        `Shared via ShepherdLink Pastors Network`;
      await Share.share({ message });
    } catch {
      // safe fallback
    }
  };

  const handleOpenScanner = (event: AssociationEvent) => {
    setScannerEvent(event);
  };

  const handleDeleteEvent = (event: AssociationEvent) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?\n\nThis will remove the event, its QR pass, and attendance tracking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteEvent(event.id);
            if (selectedEventDetails?.id === event.id) {
              setSelectedEventDetails(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Row - Clean & Uncluttered */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Events</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredEvents.length}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Quick General Scan Button */}
            <TouchableOpacity
              style={styles.iconScanBtn}
              activeOpacity={0.8}
              onPress={() => {
                const target = events.find((e) => e.trackAttendance) || events[0];
                if (target) {
                  handleOpenScanner(target);
                } else {
                  Alert.alert('No Event', 'No active attendance event available to scan.');
                }
              }}
            >
              <Ionicons name="qr-code-outline" size={18} color={COLORS.brandNavy} />
              <Text style={styles.iconScanBtnText}>Scan</Text>
            </TouchableOpacity>

            {/* Create Event button ONLY visible to association admins */}
            {isAssociationAdmin && (
              <TouchableOpacity
                style={styles.createBtn}
                activeOpacity={0.85}
                onPress={() => navigateTo('create')}
              >
                <Ionicons name="add" size={17} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar - Compact */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.brandTeal} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Clean Filter Chips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, scopeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setScopeFilter('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, scopeFilter === 'all' && styles.filterChipTextActive]}>
              All ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, scopeFilter === 'private' && styles.filterChipActive]}
            onPress={() => setScopeFilter('private')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, scopeFilter === 'private' && styles.filterChipTextActive]}>
              Association ({privateCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, scopeFilter === 'public' && styles.filterChipActive]}
            onPress={() => setScopeFilter('public')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, scopeFilter === 'public' && styles.filterChipTextActive]}>
              Public ({publicCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, scopeFilter === 'attending' && styles.filterChipActive]}
            onPress={() => setScopeFilter('attending')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, scopeFilter === 'attending' && styles.filterChipTextActive]}>
              Attending ({attendingCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Minimalist, Elegant Event Cards */}
        <View style={styles.list}>
          {filteredEvents.map((item) => {
            const isGoing = item.rsvp === 'going';
            const isMaybe = item.rsvp === 'maybe';
            const isPublic = item.scope === 'public';
            const relativeDate = getRelativeDateLabel(item);

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.92}
                onPress={() => setSelectedEventDetails(item)}
              >
                {/* Event Thumbnail Banner (Full-bleed 16:9, never cut) */}
                {item.thumbnailUrl && (
                  <View style={styles.cardThumbnailWrapper}>
                    <Image
                      source={{ uri: item.thumbnailUrl }}
                      style={styles.cardThumbnailImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.cardBody}>
                  {/* Top Badge & Admin Action Row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.badgesLine}>
                      <View style={[styles.scopeTag, isPublic ? styles.scopeTagPublic : styles.scopeTagPrivate]}>
                        <Ionicons
                          name={isPublic ? 'globe-outline' : 'shield-checkmark-outline'}
                          size={11}
                          color={isPublic ? '#92400E' : COLORS.brandNavy}
                        />
                        <Text style={[styles.scopeTagText, isPublic ? styles.scopeTagTextPublic : styles.scopeTagTextPrivate]}>
                          {isPublic ? 'Public Event' : 'Association Only'}
                        </Text>
                      </View>

                      {/* Today / Tomorrow Light Text Badge */}
                      {relativeDate && (
                        <View
                          style={[
                            styles.relativeDayBadge,
                            relativeDate === 'Today' ? styles.todayBadge : styles.tomorrowBadge,
                          ]}
                        >
                          <Ionicons
                            name={relativeDate === 'Today' ? 'sparkles' : 'time-outline'}
                            size={10}
                            color={relativeDate === 'Today' ? '#0284C7' : '#7C3AED'}
                          />
                          <Text
                            style={[
                              styles.relativeDayText,
                              relativeDate === 'Today' ? styles.todayText : styles.tomorrowText,
                            ]}
                          >
                            {relativeDate}
                          </Text>
                        </View>
                      )}

                      {item.rsvp && (
                        <View style={[styles.rsvpMiniBadge, isGoing ? styles.rsvpMiniGoing : styles.rsvpMiniMaybe]}>
                          <Text style={[styles.rsvpMiniText, isGoing ? styles.rsvpMiniTextGoing : styles.rsvpMiniTextMaybe]}>
                            {isGoing ? 'Going ✓' : 'Maybe'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Association Admin Quick Delete on Top Right */}
                    {isAssociationAdmin && (
                      <TouchableOpacity
                        style={styles.cardTopDeleteBtn}
                        activeOpacity={0.7}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(item);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Main Card Content */}
                  <View style={styles.cardContentRow}>
                    {/* Clean Date Badge */}
                    <View style={styles.dateBadge}>
                      <View style={styles.dateBadgeHeader}>
                        <Text style={styles.dateBadgeMonth}>{item.month.toUpperCase()}</Text>
                      </View>
                      <View style={styles.dateBadgeBody}>
                        <Text style={styles.dateBadgeDay}>{item.day}</Text>
                        {relativeDate && (
                          <Text
                            style={[
                              styles.dateBadgeRelativeLightText,
                              relativeDate === 'Today' ? styles.todayLightText : styles.tomorrowLightText,
                            ]}
                          >
                            {relativeDate}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Right Details Column */}
                    <View style={styles.cardRightColumn}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {item.title}
                      </Text>

                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={13} color="#64748B" />
                        <Text style={styles.metaText} numberOfLines={1}>{item.venue}</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={13} color="#64748B" />
                        <Text style={styles.metaText} numberOfLines={1}>{item.time}</Text>
                      </View>

                      <Text style={styles.hostText} numberOfLines={1}>
                        Organized by {item.byAssociation.replace(' (yours)', '')}
                      </Text>
                    </View>
                  </View>

                  {/* Subtle Divider */}
                  <View style={styles.cardDivider} />

                  {/* Clean Card Footer: RSVP on Left, Scanner on Right */}
                  <View style={styles.cardFooter}>
                    {/* RSVP Toggle Buttons */}
                    <View style={styles.rsvpButtonGroup}>
                      <TouchableOpacity
                        style={[styles.rsvpBtn, isGoing ? styles.rsvpBtnGoingActive : styles.rsvpBtnInactive]}
                        activeOpacity={0.75}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleRSVP(item.id, 'going');
                        }}
                      >
                        <Ionicons
                          name={isGoing ? 'checkmark-circle' : 'checkmark-outline'}
                          size={13}
                          color={isGoing ? '#FFFFFF' : '#475569'}
                        />
                        <Text style={[styles.rsvpBtnLabel, isGoing && styles.rsvpBtnLabelActive]}>
                          Going
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rsvpBtn, isMaybe ? styles.rsvpBtnMaybeActive : styles.rsvpBtnInactive]}
                        activeOpacity={0.75}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleRSVP(item.id, 'maybe');
                        }}
                      >
                        <Text style={[styles.rsvpBtnLabel, isMaybe && styles.rsvpBtnLabelActive]}>
                          Maybe
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Right Action Buttons */}
                    <View style={styles.actionRightButtons}>
                      {/* QR Scan Button for Attendance Tracking */}
                      {item.trackAttendance && (
                        <TouchableOpacity
                          style={styles.cardScanBtn}
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenScanner(item);
                          }}
                        >
                          <Ionicons name="scan-outline" size={13} color={COLORS.brandTeal} />
                          <Text style={styles.cardScanBtnText}>Scan</Text>
                        </TouchableOpacity>
                      )}

                      {/* Attendance roster for leaders */}
                      {item.trackAttendance && canTrackAttendance && (
                        <TouchableOpacity
                          style={styles.cardRosterBtn}
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e.stopPropagation();
                            selectEventForAttendance(item);
                          }}
                        >
                          <Ionicons name="people-outline" size={13} color={COLORS.brandNavy} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Empty State */}
          {filteredEvents.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.brandTeal} />
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim().length > 0
                  ? `No matches for "${searchQuery}".`
                  : 'No events under this filter.'}
              </Text>
              {(scopeFilter !== 'all' || searchQuery.trim().length > 0) && (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setScopeFilter('all');
                    setSearchQuery('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetFilterBtnText}>Show all</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Real SVG Event QR Code Display Modal */}
      <EventQRCodeModal
        event={qrCodeEvent}
        visible={!!qrCodeEvent}
        onClose={() => setQrCodeEvent(null)}
      />

      {/* Real Camera Event QR Scanner Modal with instant attendance tracking */}
      <EventQRScannerModal
        event={scannerEvent}
        visible={!!scannerEvent}
        onClose={() => setScannerEvent(null)}
        loggedPastor={loggedPastor}
        onRecordAttendance={(eventId, pastorId) => {
          const pid = pastorId || loggedPastor?.id || pastors[0]?.id || 'p-self';
          if (pid && !attendanceMap[pid]) {
            toggleAttendance(pid);
          }
        }}
      />

      {/* Event Details Bottom Sheet / Modal */}
      {selectedEventDetails && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedEventDetails(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setSelectedEventDetails(null)}
            />
            <View style={styles.modalSheet}>
              {/* Modal Drag Handle */}
              <View style={styles.modalHandle} />

              {/* Event Thumbnail Banner in Modal (if present) */}
              {selectedEventDetails.thumbnailUrl && (
                <View style={styles.modalBannerWrapper}>
                  <Image
                    source={{ uri: selectedEventDetails.thumbnailUrl }}
                    style={styles.modalBannerImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderBadgeRow}>
                  <View
                    style={[
                      styles.scopeTag,
                      selectedEventDetails.scope === 'public'
                        ? styles.scopeTagPublic
                        : styles.scopeTagPrivate,
                    ]}
                  >
                    <Text
                      style={[
                        styles.scopeTagText,
                        selectedEventDetails.scope === 'public'
                          ? styles.scopeTagTextPublic
                          : styles.scopeTagTextPrivate,
                      ]}
                    >
                      {selectedEventDetails.scope === 'public' ? 'Public' : 'Association'}
                    </Text>
                  </View>

                  {getRelativeDateLabel(selectedEventDetails) && (
                    <View
                      style={[
                        styles.relativeDayBadge,
                        getRelativeDateLabel(selectedEventDetails) === 'Today'
                          ? styles.todayBadge
                          : styles.tomorrowBadge,
                      ]}
                    >
                      <Ionicons
                        name={
                          getRelativeDateLabel(selectedEventDetails) === 'Today'
                            ? 'sparkles'
                            : 'time-outline'
                        }
                        size={10}
                        color={
                          getRelativeDateLabel(selectedEventDetails) === 'Today'
                            ? '#0284C7'
                            : '#7C3AED'
                        }
                      />
                      <Text
                        style={[
                          styles.relativeDayText,
                          getRelativeDateLabel(selectedEventDetails) === 'Today'
                            ? styles.todayText
                            : styles.tomorrowText,
                        ]}
                      >
                        {getRelativeDateLabel(selectedEventDetails)}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedEventDetails(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Event Title */}
              <Text style={styles.modalEventTitle}>{selectedEventDetails.title}</Text>

              {/* Host Association */}
              <Text style={styles.modalHostText}>
                Organized by {selectedEventDetails.byAssociation}
              </Text>

              {/* Information Cards Grid */}
              <View style={styles.modalDetailsCard}>
                <View style={styles.modalDetailItem}>
                  <Ionicons name="calendar-outline" size={17} color={COLORS.brandNavy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDetailValue}>
                      {selectedEventDetails.startDate && selectedEventDetails.endDate
                        ? selectedEventDetails.startDate === selectedEventDetails.endDate
                          ? `${selectedEventDetails.startDate}`
                          : `${selectedEventDetails.startDate}  →  ${selectedEventDetails.endDate}`
                        : `${selectedEventDetails.month} ${selectedEventDetails.day}, 2026`}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalDetailItem}>
                  <Ionicons name="time-outline" size={17} color={COLORS.brandNavy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDetailValue}>{selectedEventDetails.time}</Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalDetailItem}>
                  <Ionicons name="location-outline" size={17} color={COLORS.brandNavy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDetailValue}>{selectedEventDetails.venue}</Text>
                  </View>
                </View>
              </View>

              {/* Event QR Code & Attendance Check-in Buttons in Modal */}
              {selectedEventDetails.trackAttendance && (
                <View style={styles.modalQrScanRow}>
                  <TouchableOpacity
                    style={styles.modalQrActionBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      const ev = selectedEventDetails;
                      setSelectedEventDetails(null);
                      setQrCodeEvent(ev);
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={16} color={COLORS.brandNavy} />
                    <Text style={styles.modalQrActionBtnText}>View Event QR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalScanActionBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      const ev = selectedEventDetails;
                      setSelectedEventDetails(null);
                      handleOpenScanner(ev);
                    }}
                  >
                    <Ionicons name="scan" size={16} color="#FFFFFF" />
                    <Text style={styles.modalScanActionBtnText}>Scan to Check-in</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Leader Roster Action */}
              {selectedEventDetails.trackAttendance && canTrackAttendance && (
                <TouchableOpacity
                  style={styles.modalRosterActionBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    const ev = selectedEventDetails;
                    setSelectedEventDetails(null);
                    selectEventForAttendance(ev);
                  }}
                >
                  <Ionicons name="people-outline" size={17} color={COLORS.brandNavy} />
                  <Text style={styles.modalRosterActionBtnText}>View Leader Roster</Text>
                </TouchableOpacity>
              )}

              {/* RSVP Action in Modal */}
              <View style={styles.modalRsvpSection}>
                <Text style={styles.modalRsvpTitle}>Your RSVP</Text>
                <View style={styles.modalRsvpRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalRsvpOption,
                      selectedEventDetails.rsvp === 'going' && styles.modalRsvpOptionGoingActive,
                    ]}
                    onPress={() => {
                      toggleRSVP(selectedEventDetails.id, 'going');
                      setSelectedEventDetails((prev) =>
                        prev ? { ...prev, rsvp: prev.rsvp === 'going' ? null : 'going' } : null
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={selectedEventDetails.rsvp === 'going' ? '#FFFFFF' : '#334155'}
                    />
                    <Text
                      style={[
                        styles.modalRsvpOptionText,
                        selectedEventDetails.rsvp === 'going' && styles.modalRsvpOptionTextActive,
                      ]}
                    >
                      Going
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalRsvpOption,
                      selectedEventDetails.rsvp === 'maybe' && styles.modalRsvpOptionMaybeActive,
                    ]}
                    onPress={() => {
                      toggleRSVP(selectedEventDetails.id, 'maybe');
                      setSelectedEventDetails((prev) =>
                        prev ? { ...prev, rsvp: prev.rsvp === 'maybe' ? null : 'maybe' } : null
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="help-circle"
                      size={16}
                      color={selectedEventDetails.rsvp === 'maybe' ? '#FFFFFF' : '#334155'}
                    />
                    <Text
                      style={[
                        styles.modalRsvpOptionText,
                        selectedEventDetails.rsvp === 'maybe' && styles.modalRsvpOptionTextActive,
                      ]}
                    >
                      Maybe
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Actions: Share & Done */}
              <View style={styles.modalBottomActions}>
                <TouchableOpacity
                  style={styles.modalShareBtn}
                  onPress={() => handleShareEvent(selectedEventDetails)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color={COLORS.brandNavy} />
                  <Text style={styles.modalShareBtnText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDoneBtn}
                  onPress={() => setSelectedEventDetails(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Admin Delete Action */}
              {isAssociationAdmin && (
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => handleDeleteEvent(selectedEventDetails)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.modalDeleteBtnText}>Delete Event</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  iconScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.brandTeal,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: COLORS.brandNavy,
    borderColor: COLORS.brandNavy,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#002B5C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardThumbnailWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  cardThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },
  modalBannerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 8,
  },
  modalBannerImage: {
    width: '100%',
    height: '100%',
  },
  relativeDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  todayBadge: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  tomorrowBadge: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  relativeDayText: {
    fontSize: 10,
    fontWeight: '700',
  },
  todayText: {
    color: '#0284C7',
  },
  tomorrowText: {
    color: '#7C3AED',
  },
  dateBadgeRelativeLightText: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  todayLightText: {
    color: '#0284C7',
  },
  tomorrowLightText: {
    color: '#7C3AED',
  },
  cardContentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateBadge: {
    width: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  dateBadgeHeader: {
    width: '100%',
    backgroundColor: COLORS.brandNavy,
    paddingVertical: 3,
    alignItems: 'center',
  },
  dateBadgeMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dateBadgeBody: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  dateBadgeDay: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRightColumn: {
    flex: 1,
    gap: 3,
  },
  badgesLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  scopeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scopeTagPrivate: {
    backgroundColor: '#E6F7F7',
  },
  scopeTagPublic: {
    backgroundColor: '#FEF3C7',
  },
  scopeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scopeTagTextPrivate: {
    color: COLORS.brandTeal,
  },
  scopeTagTextPublic: {
    color: '#92400E',
  },
  attendancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  attendancePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.brandTeal,
  },
  rsvpMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rsvpMiniGoing: {
    backgroundColor: COLORS.greenSoft,
  },
  rsvpMiniMaybe: {
    backgroundColor: '#FEF3C7',
  },
  rsvpMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rsvpMiniTextGoing: {
    color: COLORS.green,
  },
  rsvpMiniTextMaybe: {
    color: '#92400E',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  hostText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  rsvpButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  rsvpBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  rsvpBtnGoingActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  rsvpBtnMaybeActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  rsvpBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  rsvpBtnLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cardQrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  cardScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: '#E6F7F7',
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  cardScanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  cardRosterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.brandNavy,
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
    maxHeight: '90%',
  },
  scannerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
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
  modalHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  modalHostText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -4,
  },
  modalDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  modalQrScanRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalQrActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalQrActionBtnText: {
    color: COLORS.brandNavy,
    fontSize: 13,
    fontWeight: '700',
  },
  modalScanActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.brandTeal,
  },
  modalScanActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalRosterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.brandNavy,
    backgroundColor: '#FFFFFF',
  },
  modalRosterActionBtnText: {
    color: COLORS.brandNavy,
    fontSize: 13,
    fontWeight: '700',
  },
  modalRsvpSection: {
    gap: 6,
    paddingTop: 2,
  },
  modalRsvpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalRsvpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalRsvpOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalRsvpOptionGoingActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  modalRsvpOptionMaybeActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  modalRsvpOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  modalRsvpOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBottomActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.brandNavy,
    backgroundColor: '#FFFFFF',
  },
  modalShareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  modalDoneBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 2,
  },
  modalDeleteBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Scanner Styles */
  scannerModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scannerModalSub: {
    fontSize: 12,
    color: COLORS.brandTeal,
    fontWeight: '600',
    maxWidth: 240,
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewfinderFrame: {
    width: 220,
    height: 200,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cornerReticle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.brandTeal,
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserLine: {
    position: 'absolute',
    top: '48%',
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  viewfinderHint: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 8,
  },
  scannerInstruction: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
  scanConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.brandTeal,
    marginTop: 4,
  },
  scanConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scanSuccessWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  scanSuccessCircle: {
    marginBottom: 4,
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
    paddingHorizontal: 16,
  },
  scanSuccessDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    gap: 4,
    marginTop: 4,
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
    marginTop: 8,
  },
  scanDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
