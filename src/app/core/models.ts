export type EventType = 'boda' | 'xv' | 'graduacion' | 'cumpleanos' | 'bautizo' | 'otro';
export type EventStatus = 'draft' | 'published' | 'archived';
export type InvitationStatus = 'draft' | 'published' | 'unpublished';
export type RsvpResponse = 'confirmed' | 'declined' | 'maybe';
export type InvitationAccessMode = 'open' | 'guest_list';

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: 'client' | 'organizer' | 'admin';
  plan?: PaymentPackage | 'basic' | 'premium' | 'organizer';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
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
  itinerary?: Array<{ time?: string; title?: string; description?: string }>;
  dressCode?: string;
  giftRegistry?: Array<{ label?: string; url?: string }>;
  lodging?: Array<{ name?: string; description?: string; url?: string }>;
  privateAlbum?: string[];
  privateAlbumEnabled?: boolean;
}

export interface RsvpSettings {
  deadline?: string;
  allowMaybe?: boolean;
  allowChangesUntilDeadline?: boolean;
  declineRequiresConfirmation?: boolean;
  reminderDaysBeforeDeadline?: number;
  customQuestions?: RsvpCustomQuestion[];
}

export interface RsvpCustomQuestion {
  key?: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
}

export interface InvitationModel {
  _id?: string;
  id?: string;
  owner?: string;
  event: string | EventModel;
  template?: string;
  slug: string;
  accessMode?: InvitationAccessMode;
  rsvpSettings?: RsvpSettings;
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
  accessMode?: InvitationAccessMode;
  rsvpSettings?: RsvpSettings;
  content?: InvitationContent;
}

export interface RsvpPayload {
  guest?: string;
  name: string;
  email?: string;
  response: RsvpResponse;
  companions?: number;
  companionNames?: string[];
  dietaryRestrictions?: string;
  mealPreference?: string;
  menuSelection?: string;
  customAnswers?: Array<{ key: string; label?: string; value?: string | number | boolean | null }>;
  message?: string;
  declineConfirmed?: boolean;
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
}

export interface RsvpModel extends RsvpPayload {
  _id?: string;
  id?: string;
  invitation: string;
  event: string;
  attendingCount?: number;
  phoneE164?: string;
  phoneVerified?: boolean;
  phoneVerificationStatus?: 'not_started' | 'pending' | 'verified' | 'failed';
  updatedAt?: string;
  createdAt?: string;
}

export type GuestStatus = 'pending' | 'confirmed' | 'declined';
export type GuestCommunicationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'opened' | 'failed' | 'confirmed';
export type GuestMessageType = 'invitation' | 'reminder' | 'event_reminder' | 'location_change' | 'thanks';
export type GuestMessageChannel = 'whatsapp' | 'email';
export type WhatsAppProvider = 'disabled' | 'meta' | 'openwa';

export interface GuestModel {
  _id?: string;
  id?: string;
  event: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
  tableName?: string;
  seatLabel?: string;
  companions?: GuestCompanion[];
  allowedCompanions: number;
  invitationToken?: string;
  personalizedLinkGeneratedAt?: string;
  invitationOpenedAt?: string;
  lastLinkCopiedAt?: string;
  qrCode?: string;
  checkInCode?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  status: GuestStatus;
  communicationStatus?: GuestCommunicationStatus;
  lastMessageType?: GuestMessageType;
  lastMessageChannel?: GuestMessageChannel;
  lastMessageSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppStatusResponse {
  provider: WhatsAppProvider;
  enabled: boolean;
}

export interface WhatsAppSendResponse {
  guest: GuestModel;
  provider: WhatsAppProvider;
  status: 'pending' | 'skipped' | 'sent' | 'delivered' | 'read' | 'failed';
  manualText?: string;
  messageLog?: {
    _id?: string;
    id?: string;
    status: string;
    provider: WhatsAppProvider;
    messageId?: string;
  };
}

export interface WhatsAppBulkResponse {
  provider: WhatsAppProvider;
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  results: Array<{ guest: string; status: string; provider?: WhatsAppProvider; error?: string }>;
}

export interface GuestPayload {
  event: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
  tableName?: string;
  seatLabel?: string;
  companions?: GuestCompanion[];
  allowedCompanions?: number;
}

export interface GuestCompanion {
  name?: string;
  tableName?: string;
  seatLabel?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
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

export interface GuestAccessResponse {
  guest: {
    id: string;
    name: string;
    email?: string;
    allowedCompanions: number;
    status: GuestStatus;
    checkInCode?: string;
    qrCode?: string;
    tableName?: string;
    seatLabel?: string;
    companions?: GuestCompanion[];
  };
}

export interface ImportGuestsResponse {
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  imported: number;
  invalidRows: number;
  duplicateRows?: number;
  duplicates?: Array<{
    row: number;
    field: 'email' | 'phone' | 'plan';
    value: string;
    guestName: string;
  }>;
  guests: GuestModel[];
}

export interface UploadUrlResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export type AssetFolder = 'covers' | 'gallery' | 'music' | 'assets';
export type PaymentPackage = 'free' | 'event' | 'pro';

export interface PlanDefinition {
  key: PaymentPackage;
  name: string;
  amount: number;
  limits: {
    guests: number;
    galleryImages: number;
    music: boolean;
    premiumTemplates: boolean;
    exportData: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
  };
}

export interface CheckoutResponse {
  checkoutUrl: string | null;
  sessionId: string | null;
  manualPayment?: boolean;
  message?: string;
}

export interface EventTableModel {
  _id?: string;
  id?: string;
  name: string;
  capacity: number;
  notes?: string;
  order?: number;
  occupied?: number;
  available?: number;
  overCapacity?: boolean;
  guests?: Array<{
    id: string;
    name: string;
    group?: string;
    seatLabel?: string;
    seats: number;
    checkedIn?: boolean;
  }>;
}

export interface StaffCheckInSession {
  event: Pick<EventModel, 'title' | 'date' | 'venue'>;
  guests: GuestModel[];
  expiresAt: string;
}

export interface AlbumAssetModel {
  _id?: string;
  id?: string;
  uploaderName?: string;
  uploaderEmail?: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}
