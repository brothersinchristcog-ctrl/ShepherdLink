import {
  Association,
  Pastor,
  AssociationEvent,
  PrayerRequest,
  Notice,
  DonationRecord,
} from '../types';

export const INITIAL_ASSOCIATIONS: Association[] = [];
export const INITIAL_PASTORS: Pastor[] = [];
export const INITIAL_EVENTS: AssociationEvent[] = [
  {
    id: 'ev-1',
    associationId: '',
    title: 'Monthly Association Pastors Fellowship & Prayer',
    month: 'NOV',
    day: '18',
    time: '10:00 AM – 1:30 PM',
    venue: 'Grace Baptist Chapel, Mustabad Center',
    scope: 'private',
    byAssociation: 'Pastors Association',
    isMyAssociation: true,
    trackAttendance: true,
    rsvp: 'going',
  },
  {
    id: 'ev-2',
    associationId: 'global',
    title: 'Statewide United Pastors Gospel Convention 2026',
    month: 'DEC',
    day: '12',
    time: '5:30 PM – 9:00 PM',
    venue: 'Bible Mission Convention Grounds, NH-16 Highway',
    scope: 'public',
    byAssociation: 'United Christian Forum & Regional Pastors Fellowship',
    isMyAssociation: false,
    trackAttendance: false,
    rsvp: null,
  },
  {
    id: 'ev-3',
    associationId: '',
    title: 'Joint 24-Hour Chain Fasting Prayer & Intercession',
    month: 'NOV',
    day: '28',
    time: '9:30 AM – 3:00 PM',
    venue: 'Bethel Gospel Church, Kothapeta',
    scope: 'private',
    byAssociation: 'Pastors Association',
    isMyAssociation: true,
    trackAttendance: true,
    rsvp: 'maybe',
  },
  {
    id: 'ev-4',
    associationId: 'global',
    title: 'Church Leadership & Biblical Counseling Conference',
    month: 'DEC',
    day: '05',
    time: '9:00 AM – 4:30 PM',
    venue: 'Zion Faith Tabernacle, Main Auditorium',
    scope: 'public',
    byAssociation: 'National Pastors Network',
    isMyAssociation: false,
    trackAttendance: false,
    rsvp: null,
  },
];
export const INITIAL_PRAYERS: PrayerRequest[] = [];
export const INITIAL_NOTICES: Notice[] = [];
export const INITIAL_DONATIONS: DonationRecord[] = [];

