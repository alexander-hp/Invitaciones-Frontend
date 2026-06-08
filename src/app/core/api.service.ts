import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AlbumAssetModel,
  AssetFolder,
  AuthResponse,
  CheckoutResponse,
  ContactPayload,
  DashboardMetrics,
  EventModel,
  EventPayload,
  EventTableModel,
  EventType,
  GuestModel,
  GuestAccessResponse,
  GuestCommunicationStatus,
  GuestMessageChannel,
  GuestMessageType,
  GuestPayload,
  ImportGuestsResponse,
  InvitationModel,
  InvitationPayload,
  MessageResponse,
  PaymentPackage,
  PlanDefinition,
  RsvpModel,
  RsvpPayload,
  StaffCheckInSession,
  TemplateModel,
  TemplateTier,
  UploadUrlResponse,
  User
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  register(payload: { name: string; email: string; password: string; role?: 'client' | 'organizer' }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, payload);
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, payload);
  }

  me(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/auth/me`);
  }

  requestPasswordReset(payload: { email: string }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/password-reset`, payload);
  }

  confirmPasswordReset(payload: { token: string; password: string }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/password-reset/confirm`, payload);
  }

  sendContact(payload: ContactPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/contact`, payload);
  }

  getDashboard(): Observable<{ metrics: DashboardMetrics }> {
    return this.http.get<{ metrics: DashboardMetrics }>(`${this.apiUrl}/dashboard/summary`);
  }

  listEvents(): Observable<{ events: EventModel[] }> {
    return this.http.get<{ events: EventModel[] }>(`${this.apiUrl}/events`);
  }

  createEvent(payload: EventPayload): Observable<{ event: EventModel }> {
    return this.http.post<{ event: EventModel }>(`${this.apiUrl}/events`, payload);
  }

  getEvent(id: string): Observable<{ event: EventModel }> {
    return this.http.get<{ event: EventModel }>(`${this.apiUrl}/events/${id}`);
  }

  updateEvent(id: string, payload: Partial<EventPayload>): Observable<{ event: EventModel }> {
    return this.http.patch<{ event: EventModel }>(`${this.apiUrl}/events/${id}`, payload);
  }

  createCheckInLink(eventId: string, payload: { label?: string; days?: number }): Observable<{ token: string; url: string; expiresAt: string }> {
    return this.http.post<{ token: string; url: string; expiresAt: string }>(`${this.apiUrl}/events/${eventId}/check-in-link`, payload);
  }

  listTables(eventId: string): Observable<{ tables: EventTableModel[] }> {
    return this.http.get<{ tables: EventTableModel[] }>(`${this.apiUrl}/events/${eventId}/tables`);
  }

  createTable(eventId: string, payload: { name: string; capacity: number; notes?: string; order?: number }): Observable<{ table: EventTableModel }> {
    return this.http.post<{ table: EventTableModel }>(`${this.apiUrl}/events/${eventId}/tables`, payload);
  }

  updateTable(eventId: string, tableId: string, payload: Partial<EventTableModel>): Observable<{ table: EventTableModel }> {
    return this.http.patch<{ table: EventTableModel }>(`${this.apiUrl}/events/${eventId}/tables/${tableId}`, payload);
  }

  deleteTable(eventId: string, tableId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/events/${eventId}/tables/${tableId}`);
  }

  listAlbum(eventId: string): Observable<{ assets: AlbumAssetModel[] }> {
    return this.http.get<{ assets: AlbumAssetModel[] }>(`${this.apiUrl}/events/${eventId}/album`);
  }

  updateAlbumAsset(eventId: string, assetId: string, status: AlbumAssetModel['status']): Observable<{ asset: AlbumAssetModel }> {
    return this.http.patch<{ asset: AlbumAssetModel }>(`${this.apiUrl}/events/${eventId}/album/${assetId}`, { status });
  }

  listInvitations(): Observable<{ invitations: InvitationModel[] }> {
    return this.http.get<{ invitations: InvitationModel[] }>(`${this.apiUrl}/invitations`);
  }

  createInvitation(payload: InvitationPayload): Observable<{ invitation: InvitationModel; publicUrl: string }> {
    return this.http.post<{ invitation: InvitationModel; publicUrl: string }>(`${this.apiUrl}/invitations`, payload);
  }

  updateInvitation(id: string, payload: Partial<InvitationPayload>): Observable<{ invitation: InvitationModel }> {
    return this.http.patch<{ invitation: InvitationModel }>(`${this.apiUrl}/invitations/${id}`, payload);
  }

  publishInvitation(id: string): Observable<{ invitation: InvitationModel; publicUrl: string }> {
    return this.http.post<{ invitation: InvitationModel; publicUrl: string }>(`${this.apiUrl}/invitations/${id}/publish`, {});
  }

  getPublicInvitation(slug: string): Observable<{ invitation: InvitationModel }> {
    return this.http.get<{ invitation: InvitationModel }>(`${this.apiUrl}/invitations/public/${slug}`);
  }

  checkGuestAccess(slug: string, payload: { email: string }): Observable<GuestAccessResponse> {
    return this.http.post<GuestAccessResponse>(`${this.apiUrl}/invitations/public/${slug}/guest-access`, payload);
  }

  uploadPublicAlbumPhoto(slug: string, payload: { file: File; name?: string; email?: string; guest?: string }): Observable<{ asset: { id: string; status: string } }> {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.name) formData.append('name', payload.name);
    if (payload.email) formData.append('email', payload.email);
    if (payload.guest) formData.append('guest', payload.guest);
    return this.http.post<{ asset: { id: string; status: string } }>(`${this.apiUrl}/invitations/public/${slug}/album-upload`, formData);
  }

  getStaffCheckInSession(token: string): Observable<StaffCheckInSession> {
    return this.http.get<StaffCheckInSession>(`${this.apiUrl}/check-in/${token}`);
  }

  staffCheckIn(token: string, code: string): Observable<{ guest: GuestModel }> {
    return this.http.post<{ guest: GuestModel }>(`${this.apiUrl}/check-in/${token}`, { code });
  }

  listGuests(eventId: string, filters?: { search?: string; status?: string; communicationStatus?: string; group?: string }): Observable<{ guests: GuestModel[] }> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.communicationStatus) params = params.set('communicationStatus', filters.communicationStatus);
    if (filters?.group) params = params.set('group', filters.group);
    return this.http.get<{ guests: GuestModel[] }>(`${this.apiUrl}/guests/event/${eventId}`, { params });
  }

  listRsvps(eventId: string): Observable<{ rsvps: RsvpModel[] }> {
    return this.http.get<{ rsvps: RsvpModel[] }>(`${this.apiUrl}/rsvps/event/${eventId}`);
  }

  createGuest(payload: GuestPayload): Observable<{ guest: GuestModel }> {
    return this.http.post<{ guest: GuestModel }>(`${this.apiUrl}/guests`, payload);
  }

  updateGuest(id: string, payload: Partial<GuestPayload>): Observable<{ guest: GuestModel }> {
    return this.http.patch<{ guest: GuestModel }>(`${this.apiUrl}/guests/${id}`, payload);
  }

  deleteGuest(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/guests/${id}`);
  }

  checkInGuest(code: string): Observable<{ guest: GuestModel }> {
    return this.http.post<{ guest: GuestModel }>(`${this.apiUrl}/guests/check-in`, { code });
  }

  markGuestCommunication(id: string, payload: { communicationStatus: GuestCommunicationStatus; messageType?: GuestMessageType; channel?: GuestMessageChannel }): Observable<{ guest: GuestModel }> {
    return this.http.patch<{ guest: GuestModel }>(`${this.apiUrl}/guests/${id}/communication`, payload);
  }

  importGuests(eventId: string, file: File): Observable<ImportGuestsResponse> {
    const formData = new FormData();
    formData.append('event', eventId);
    formData.append('file', file);
    return this.http.post<ImportGuestsResponse>(`${this.apiUrl}/guests/import`, formData);
  }

  exportGuests(eventId: string, filters?: { search?: string; status?: string; communicationStatus?: string; group?: string }): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.communicationStatus) params = params.set('communicationStatus', filters.communicationStatus);
    if (filters?.group) params = params.set('group', filters.group);
    return this.http.get(`${this.apiUrl}/guests/event/${eventId}/export`, { params, responseType: 'blob' });
  }

  exportRsvps(eventId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/rsvps/event/${eventId}/export`, { responseType: 'blob' });
  }

  listTemplates(eventType?: EventType, tier?: TemplateTier): Observable<{ templates: TemplateModel[] }> {
    let params = new HttpParams();
    if (eventType) params = params.set('eventType', eventType);
    if (tier) params = params.set('tier', tier);
    return this.http.get<{ templates: TemplateModel[] }>(`${this.apiUrl}/templates`, { params });
  }

  createUploadUrl(payload: { fileName: string; contentType: string; folder: AssetFolder; size?: number }): Observable<UploadUrlResponse> {
    return this.http.post<UploadUrlResponse>(`${this.apiUrl}/assets/upload-url`, payload);
  }

  uploadAsset(uploadUrl: string, file: File): Observable<unknown> {
    return this.http.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
  }

  listPlans(): Observable<{ plans: PlanDefinition[] }> {
    return this.http.get<{ plans: PlanDefinition[] }>(`${this.apiUrl}/payments/plans`);
  }

  createCheckout(payload: { package: Exclude<PaymentPackage, 'free'>; invitation?: string }): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/payments/checkout`, payload);
  }

  submitRsvp(slug: string, payload: RsvpPayload): Observable<{ rsvp: RsvpModel; updated?: boolean }> {
    return this.http.post<{ rsvp: RsvpModel; updated?: boolean }>(`${this.apiUrl}/rsvps/public/${slug}`, payload);
  }
}
