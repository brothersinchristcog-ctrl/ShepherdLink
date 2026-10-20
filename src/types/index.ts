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

export type AdminRole = 'PRESIDENT' | 'SECRETARY' | 'TREASURER' | 'VICE PRESIDENT';
export type PastorRole = string;

export const DEFAULT_ADMIN_ROLES: string[] = [
  'PRESIDENT',
  'VICE PRESIDENT',
  'SECRETARY',
  'TREASURER',
];
export const ADMIN_ROLES: string[] = DEFAULT_ADMIN_ROLES;

export const isPastorAdmin = (role: PastorRole, customIsAdmin?: boolean): boolean => {
  if (customIsAdmin !== undefined) return Boolean(customIsAdmin);
  const clean = (role || '').trim().toUpperCase();
  return DEFAULT_ADMIN_ROLES.includes(clean);
};

export interface PastorPermissions {
  canManageMembers: boolean;
  canAssignRoles: boolean;
  canCreateEvents: boolean;
  canTrackAttendance: boolean;
  canManageDonations: boolean;
  canBroadcastNotices: boolean;
}

export const getDefaultPermissionsForRole = (
  role: PastorRole,
  isAdmin?: boolean
): PastorPermissions => {
  const clean = (role || '').trim().toUpperCase();
  switch (clean) {
    case 'PRESIDENT':
    case 'VICE PRESIDENT':
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
      if (isAdmin) {
        return {
          canManageMembers: true,
          canAssignRoles: false,
          canCreateEvents: true,
          canTrackAttendance: true,
          canManageDonations: false,
          canBroadcastNotices: true,
        };
      }
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
  thumbnailUrl?: string;
}

export interface PrayerComment {
  id: string;
  authorName: string;
  text: string;
  timeAgo: string;
}

export type PrayerTag =
  | 'HEALTH'
  | 'MINISTRY'
  | 'FAMILY'
  | 'CHURCH'
  | 'THANKSGIVING'
  | 'MISSIONS'
  | (string & {});

export interface PrayerRequest {
  id: string;
  associationId?: string;
  pastorName: string;
  mandal: string;
  timeAgo: string;
  tag: PrayerTag;
  text: string;
  isGlobal: boolean;
  leadersOnly: boolean;
  prayedByMe: boolean;
  prayedCount: number;
  isUrgent?: boolean;
  comments?: PrayerComment[];
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
