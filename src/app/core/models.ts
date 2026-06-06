export type EventType = 'boda' | 'xv' | 'graduacion' | 'cumpleanos' | 'bautizo' | 'otro';
export type EventStatus = 'draft' | 'published' | 'archived';
export type InvitationStatus = 'draft' | 'published' | 'unpublished';
export type RsvpResponse = 'confirmed' | 'declined';

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: 'client' | 'organizer' | 'admin';
  plan?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardMetrics {
  events: number;
  invitations: number;
  guests: number;
  confirmed: number;
  declined: number;
  pending: number;
  companions: number;
}

export interface EventAgendaItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventModel {
  _id?: string;
  id?: string;
  type: EventType;
  title: string;
  hosts: string[];
  date: string;
  venue: {
    name?: string;
    address?: string;
    mapUrl?: string;
  };
  agenda?: EventAgendaItem[];
  status: EventStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventPayload {
  type: EventType;
  title: string;
  hosts?: string[];
  date: string;
  venue?: {
    name?: string;
    address?: string;
    mapUrl?: string;
  };
  agenda?: EventAgendaItem[];
  status?: EventStatus;
}

export interface InvitationContent {
  headline?: string;
  subheadline?: string;
  message?: string;
  palette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  musicUrl?: string;
  coverImageUrl?: string;
  gallery?: string[];
}

export interface InvitationModel {
  _id?: string;
  id?: string;
  owner?: string;
  event: string | EventModel;
  template?: string;
  slug: string;
  status: InvitationStatus;
  content: InvitationContent;
  premiumLocked?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvitationPayload {
  event: string;
  template?: string;
  slug?: string;
  content?: InvitationContent;
}

export interface RsvpPayload {
  guest?: string;
  name: string;
  email?: string;
  response: RsvpResponse;
  companions?: number;
  mealPreference?: string;
  message?: string;
}

export interface RsvpModel extends RsvpPayload {
  _id?: string;
  id?: string;
  invitation: string;
  event: string;
  createdAt?: string;
}

export type GuestStatus = 'pending' | 'confirmed' | 'declined';

export interface GuestModel {
  _id?: string;
  id?: string;
  event: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
  allowedCompanions: number;
  qrCode?: string;
  status: GuestStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuestPayload {
  event: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
  allowedCompanions?: number;
}

export type TemplateTier = 'free' | 'premium';

export interface TemplateModel {
  _id?: string;
  id?: string;
  name: string;
  eventType: EventType;
  tier: TemplateTier;
  previewImageUrl?: string;
  config?: {
    palette?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    layout?: string;
    [key: string]: unknown;
  };
  active: boolean;
}

export interface ImportGuestsResponse {
  imported: number;
  invalidRows: number;
  guests: GuestModel[];
}

export interface UploadUrlResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export type AssetFolder = 'covers' | 'gallery' | 'music' | 'assets';
export type PaymentPackage = 'basic' | 'premium' | 'organizer';

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}