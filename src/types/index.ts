export type ScreenName =
  | 'login'
  | 'home'
  | 'directory'
  | 'profile'
  | 'pastor-detail'
  | 'events'
  | 'prayer'
  | 'create'
  | 'attendance'
  | 'donate';

export type TabName = 'home' | 'directory' | 'events' | 'prayer' | 'profile';

export type AdminRole = 'PRESIDENT' | 'SECRETARY' | 'TREASURER';
export type PastorRole = AdminRole | 'MEMBER';

export const ADMIN_ROLES: PastorRole[] = ['PRESIDENT', 'SECRETARY', 'TREASURER'];

export const isPastorAdmin = (role: PastorRole): boolean => {
  return ADMIN_ROLES.includes(role);
};

export interface PastorPermissions {
  canManageMembers: boolean;
  canAssignRoles: boolean;
  canCreateEvents: boolean;
  canTrackAttendance: boolean;
  canManageDonations: boolean;
  canBroadcastNotices: boolean;
}

export const getDefaultPermissionsForRole = (role: PastorRole): PastorPermissions => {
  switch (role) {
    case 'PRESIDENT':
      return {
        canManageMembers: true,
        canAssignRoles: true,
        canCreateEvents: true,
        canTrackAttendance: true,
        canManageDonations: true,
        canBroadcastNotices: true,
      };
    case 'SECRETARY':
      return {
        canManageMembers: true,
        canAssignRoles: true,
        canCreateEvents: true,
        canTrackAttendance: true,
        canManageDonations: false,
        canBroadcastNotices: true,
      };
    case 'TREASURER':
      return {
        canManageMembers: false,
        canAssignRoles: false,
        canCreateEvents: false,
        canTrackAttendance: true,
        canManageDonations: true,
        canBroadcastNotices: false,
      };
    case 'MEMBER':
    default:
      return {
        canManageMembers: false,
        canAssignRoles: false,
        canCreateEvents: false,
        canTrackAttendance: false,
        canManageDonations: false,
        canBroadcastNotices: false,
      };
  }
};

export interface Association {
  id: string;
  name: string;
  code: string;
  country?: string;
  state: string;
  district: string;
  mandal: string;
  village?: string;
  houseNumber?: string;
  logoUrl?: string;
  memberCount: number;
  establishedYear: string;
  isVerified: boolean;
  registrationNumber?: string;
  leaderName?: string;
  leaderPhone?: string;
  createdAt?: string;
}

export interface Pastor {
  id: string;
  name: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
  dateOfBirth?: string;
  associationId: string;
  associationName: string;
  associationCode?: string;
  isVerified: boolean;
  isAdmin?: boolean;
  permissions?: PastorPermissions;
  churchName: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  houseNumber?: string;
  role: PastorRole;
  phone: string;
  churchAddress: string;
  denomination: string;
  ordainedYear: string;
  ministry: string;
  languages: string[];
  avatarUrl?: string;
}

export type EventScope = 'public' | 'private';

export interface AssociationEvent {
  id: string;
  associationId: string;
  title: string;
  month: string;
  day: string;
  time: string;
  venue: string;
  scope: EventScope;
  byAssociation: string;
  isMyAssociation: boolean;
  trackAttendance: boolean;
  rsvp?: 'going' | 'maybe' | null;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface PrayerRequest {
  id: string;
  associationId?: string;
  pastorName: string;
  mandal: string;
  timeAgo: string;
  tag: 'HEALTH' | 'MINISTRY' | 'FAMILY' | 'CHURCH';
  text: string;
  isGlobal: boolean;
  leadersOnly: boolean;
  prayedByMe: boolean;
  prayedCount: number;
}

export interface Notice {
  id: string;
  associationId?: string;
  title: string;
  date: string;
  scope: EventScope;
  summary: string;
}

export interface DonationRecord {
  id: string;
  associationId?: string;
  date: string;
  purpose: string;
  amount: number;
  status: 'success' | 'pending';
  referenceId: string;
}
