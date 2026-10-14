export type ScreenName =
  | 'login'
  | 'home'
  | 'directory'
  | 'profile'
  | 'events'
  | 'prayer'
  | 'create'
  | 'attendance'
  | 'donate';

export type TabName = 'home' | 'directory' | 'events' | 'prayer' | 'profile';

export type PastorRole = 'PRESIDENT' | 'SECRETARY' | 'TREASURER' | 'MEMBER';

export interface Association {
  id: string;
  name: string;
  code: string;
  state: string;
  district: string;
  mandal: string;
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
  associationId: string;
  associationName: string;
  associationCode?: string;
  isVerified: boolean;
  churchName: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
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
