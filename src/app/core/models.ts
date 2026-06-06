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
