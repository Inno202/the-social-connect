export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EVENT_MANAGER' | 'FINANCE' | 'TICKET_SCANNER' | 'USER';
export const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'EVENT_MANAGER', 'FINANCE', 'TICKET_SCANNER', 'USER'];
export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  EVENT_MANAGER: 'Event manager',
  FINANCE: 'Finance',
  TICKET_SCANNER: 'Door scanner',
  USER: 'Customer',
};

export type Category = 'festival' | 'activation' | 'family' | 'comedy';
export const CATEGORY_LABEL: Record<Category, string> = {
  festival: 'Festival',
  activation: 'Activation',
  family: 'Family',
  comedy: 'Comedy',
};

export type SellMode = 'site' | 'external' | 'none';

export interface LineupItem {
  name: string;
  group?: string;
  photo?: string;
}

export interface TicketType {
  id: string;
  group: string;
  name: string;
  /** Price in whole rands. 0 means a free ticket. */
  price: number;
  /** People admitted. 1 for a normal ticket, 4 or 8 for a VIP table. */
  seats: number;
  includes: string[];
  /** How many can be sold online (tables for a table type). 0 = not sold online. */
  capacity: number;
  sold: number;
  order: number;
  /** The release that must sell out before this one opens. */
  prevId: string | null;
  comingSoon: boolean;
  lastOrderId?: string;
}

export interface MsbEvent {
  id: string;
  title: string;
  shortTitle: string;
  category: Category;
  /** ISO date-time with +02:00 offset (SAST). */
  startsAt: string;
  /** Start of the last day for events over several days. */
  endsAt?: string | null;
  gatesOpen: string | null;
  timeTbc: boolean;
  venue: string;
  address: string;
  town: string;
  mapQuery: string;
  /** Path or URL without extension for local posters ("/posters/x"), or a full https URL. */
  poster: string;
  posterColor: string;
  is18Plus: boolean;
  description: string;
  houseRules: string[];
  amenities: string[];
  refundPolicy: string;
  lineup: LineupItem[];
  sellMode: SellMode;
  externalUrl: string;
  externalSeller: string;
  gatePrice: number | null;
  status: 'published' | 'draft' | 'cancelled';
  ticketTypes?: TicketType[];
}

export interface Ticket {
  id: string;
  uid: string;
  orderId: string;
  eventId: string;
  typeId: string;
  typeName: string;
  seatLabel: string;
  holderName: string;
  eventTitle: string;
  eventStartsAt: string;
  venue: string;
  poster: string;
  price: number;
  status: 'valid' | 'used' | 'cancelled';
  createdAt?: unknown;
  usedAt?: unknown;
  usedBy?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  group: string;
  /** 0 when the year is not known. */
  year: number;
  order: number;
}

export interface CartLine {
  eventId: string;
  typeId: string;
  qty: number;
}
