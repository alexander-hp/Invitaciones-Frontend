import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AlbumAssetModel,
  AssetFolder,
  AuthResponse,
  AutoAssignTablesPayload,
  AutoAssignTablesResponse,
  CheckoutResponse,
  ContactPayload,
  DashboardMetrics,
  DedicationModel,
  DedicationStatus,
  EmailBulkResponse,
  EmailSendResponse,
  EventModel,
  EventMemberModel,
  EventMemberPayload,
  EventPermission,
  EventAccessLinkModel,
  EventAccessRole,
  EventAccessSession,
  EventPayload,
  EventTableModel,
  EventType,
  EmbedManifestResponse,
  ExternalAssetsResponse,
  ExternalConfigResponse,
  ExternalGuestStatusResponse,
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
  PaymentStatusResponse,
  PlanDefinition,
  RsvpModel,
  RsvpPayload,
  SocialLoginPayload,
  SongRequestPayload,
  SongRequestModel,
  SongRequestStatus,
  SongLookupResponse,
  StaffCheckInSession,
  TemplateModel,
  TemplateTier,
  UploadUrlResponse,
  User,
  WhatsAppBulkResponse,
  WhatsAppMediaInspection,
  WhatsAppMediaAssetModel,
  WhatsAppMediaPayload,
  WhatsAppSendResponse,
  WhatsAppStatusResponse
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  register(payload: { name: string; email: string; password: string; role?: User['role']; accountType?: User['accountType'] }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, payload);
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, payload);
  }

  socialLogin(payload: SocialLoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/social`, payload);
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

  getEventDashboard(eventId: string): Observable<{ metrics: Partial<DashboardMetrics> }> {
    return this.http.get<{ metrics: Partial<DashboardMetrics> }>(`${this.apiUrl}/dashboard/event/${eventId}`);
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

  getPublicExternalEvent(portalSlug: string): Observable<{ event: EventModel }> {
    return this.http.get<{ event: EventModel }>(`${this.apiUrl}/events/public/${portalSlug}`);
  }

  getExternalConfig(portalSlug: string): Observable<ExternalConfigResponse> {
    return this.http.get<ExternalConfigResponse>(`${this.apiUrl}/external/${portalSlug}/config`);
  }

  getExternalAssets(portalSlug: string, type: 'cover' | 'carousel' | 'gallery' | 'audio' | 'map' | 'all' = 'all'): Observable<ExternalAssetsResponse> {
    return this.http.get<ExternalAssetsResponse>(`${this.apiUrl}/external/${portalSlug}/assets`, { params: new HttpParams().set('type', type) });
  }

  getExternalGifts(portalSlug: string): Observable<{ gifts: { giftRegistry?: unknown[]; digitalEnvelope?: Record<string, unknown>; giftSettings?: Record<string, unknown> } }> {
    return this.http.get<{ gifts: { giftRegistry?: unknown[]; digitalEnvelope?: Record<string, unknown>; giftSettings?: Record<string, unknown> } }>(`${this.apiUrl}/external/${portalSlug}/gifts`);
  }

  identifyExternalGuest(portalSlug: string, payload: { email?: string; phone?: string; token?: string }): Observable<GuestAccessResponse> {
    return this.http.post<GuestAccessResponse>(`${this.apiUrl}/external/${portalSlug}/guest/identify`, payload);
  }

  getExternalGuestStatus(portalSlug: string, guestSessionToken: string): Observable<ExternalGuestStatusResponse> {
    return this.http.get<ExternalGuestStatusResponse>(`${this.apiUrl}/external/${portalSlug}/my-status`, {
      headers: { Authorization: `Bearer ${guestSessionToken}` }
    });
  }

  submitExternalApiRsvp(portalSlug: string, payload: RsvpPayload): Observable<{ rsvp: RsvpModel; updated?: boolean }> {
    return this.http.post<{ rsvp: RsvpModel; updated?: boolean }>(`${this.apiUrl}/external/${portalSlug}/rsvp`, payload);
  }

  lookupExternalSong(portalSlug: string, payload: { query?: string; url?: string; title?: string; artist?: string }): Observable<SongLookupResponse> {
    return this.http.post<SongLookupResponse>(`${this.apiUrl}/external/${portalSlug}/song-lookup`, payload);
  }

  createExternalSongRequest(portalSlug: string, payload: SongRequestPayload): Observable<{ songRequest: SongRequestModel }> {
    return this.http.post<{ songRequest: SongRequestModel }>(`${this.apiUrl}/external/${portalSlug}/song-requests`, payload);
  }

  listExternalDedications(portalSlug: string): Observable<{ dedications: DedicationModel[] }> {
    return this.http.get<{ dedications: DedicationModel[] }>(`${this.apiUrl}/external/${portalSlug}/dedications`);
  }

  createExternalDedication(portalSlug: string, payload: { guest?: string; publicName?: string; email?: string; message: string; type?: string; visibility?: string }, guestSessionToken?: string): Observable<{ dedication: DedicationModel }> {
    const options = guestSessionToken ? { headers: { Authorization: `Bearer ${guestSessionToken}` } } : {};
    return this.http.post<{ dedication: DedicationModel }>(`${this.apiUrl}/external/${portalSlug}/dedications`, payload, options);
  }

  getExternalEmbedManifest(portalSlug: string): Observable<EmbedManifestResponse> {
    return this.http.get<EmbedManifestResponse>(`${this.apiUrl}/external/${portalSlug}/embed-manifest`);
  }

  listSongRequests(eventId: string): Observable<{ songRequests: SongRequestModel[] }> {
    return this.http.get<{ songRequests: SongRequestModel[] }>(`${this.apiUrl}/events/${eventId}/song-requests`);
  }

  updateSongRequest(eventId: string, songRequestId: string, payload: SongRequestStatus | { status?: SongRequestStatus; sortOrder?: number }): Observable<{ songRequest: SongRequestModel }> {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return this.http.patch<{ songRequest: SongRequestModel }>(`${this.apiUrl}/events/${eventId}/song-requests/${songRequestId}`, body);
  }

  listDedications(eventId: string): Observable<{ dedications: DedicationModel[] }> {
    return this.http.get<{ dedications: DedicationModel[] }>(`${this.apiUrl}/events/${eventId}/dedications`);
  }

  updateDedication(eventId: string, dedicationId: string, status: DedicationStatus): Observable<{ dedication: DedicationModel }> {
    return this.http.patch<{ dedication: DedicationModel }>(`${this.apiUrl}/events/${eventId}/dedications/${dedicationId}`, { status });
  }

  checkExternalGuestAccess(portalSlug: string, payload: { email?: string; phone?: string }): Observable<GuestAccessResponse> {
    return this.http.post<GuestAccessResponse>(`${this.apiUrl}/events/public/${portalSlug}/guest-access`, payload);
  }

  getExternalGuestByToken(portalSlug: string, token: string): Observable<GuestAccessResponse> {
    return this.http.get<GuestAccessResponse>(`${this.apiUrl}/events/public/${portalSlug}/guest-token/${encodeURIComponent(token)}`);
  }

  listPublicExternalAlbum(portalSlug: string): Observable<{ assets: AlbumAssetModel[] }> {
    return this.http.get<{ assets: AlbumAssetModel[] }>(`${this.apiUrl}/external/${portalSlug}/album`);
  }

  uploadPublicExternalAlbumPhoto(portalSlug: string, payload: { file: File; name?: string; email?: string; guest?: string; guestSessionToken?: string }): Observable<{ asset: AlbumAssetModel }> {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.name) formData.append('name', payload.name);
    if (payload.email) formData.append('email', payload.email);
    if (payload.guest) formData.append('guest', payload.guest);
    const options = payload.guestSessionToken ? { headers: { Authorization: `Bearer ${payload.guestSessionToken}` } } : {};
    return this.http.post<{ asset: AlbumAssetModel }>(`${this.apiUrl}/external/${portalSlug}/album`, formData, options);
  }

  listEventAccessLinks(eventId: string): Observable<{ links: EventAccessLinkModel[] }> {
    return this.http.get<{ links: EventAccessLinkModel[] }>(`${this.apiUrl}/events/${eventId}/access-links`);
  }

  createEventAccessLink(eventId: string, payload: { role: EventAccessRole; label?: string; days?: number }): Observable<{ link: EventAccessLinkModel }> {
    return this.http.post<{ link: EventAccessLinkModel }>(`${this.apiUrl}/events/${eventId}/access-links`, payload);
  }

  revokeEventAccessLink(eventId: string, linkId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/events/${eventId}/access-links/${linkId}`);
  }

  listEventMembers(eventId: string): Observable<{ members: EventMemberModel[]; permissions: EventPermission[]; rolePermissions: Record<string, EventPermission[]> }> {
    return this.http.get<{ members: EventMemberModel[]; permissions: EventPermission[]; rolePermissions: Record<string, EventPermission[]> }>(`${this.apiUrl}/events/${eventId}/members`);
  }

  createEventMember(eventId: string, payload: EventMemberPayload): Observable<{ member: EventMemberModel }> {
    return this.http.post<{ member: EventMemberModel }>(`${this.apiUrl}/events/${eventId}/members`, payload);
  }

  updateEventMember(eventId: string, memberId: string, payload: Partial<EventMemberPayload> & { status?: EventMemberModel['status'] }): Observable<{ member: EventMemberModel }> {
    return this.http.patch<{ member: EventMemberModel }>(`${this.apiUrl}/events/${eventId}/members/${memberId}`, payload);
  }

  removeEventMember(eventId: string, memberId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/events/${eventId}/members/${memberId}`);
  }

  getEventAccessSession(token: string): Observable<EventAccessSession> {
    return this.http.get<EventAccessSession>(`${this.apiUrl}/event-access/${token}`);
  }

  eventAccessCheckIn(token: string, code: string): Observable<{ guest: GuestModel }> {
    return this.http.post<{ guest: GuestModel }>(`${this.apiUrl}/event-access/${token}/check-in`, { code });
  }

  updateEventAccessAlbum(token: string, assetId: string, status: AlbumAssetModel['status']): Observable<{ asset: AlbumAssetModel }> {
    return this.http.patch<{ asset: AlbumAssetModel }>(`${this.apiUrl}/event-access/${token}/album/${assetId}`, { status });
  }

  updateEventAccessSong(token: string, songRequestId: string, payload: SongRequestStatus | { status?: SongRequestStatus; sortOrder?: number }): Observable<{ songRequest: SongRequestModel }> {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return this.http.patch<{ songRequest: SongRequestModel }>(`${this.apiUrl}/event-access/${token}/song-requests/${songRequestId}`, body);
  }

  updateEventAccessSongRequest(token: string, songRequestId: string, status: SongRequestStatus): Observable<{ songRequest: SongRequestModel }> {
    return this.updateEventAccessSong(token, songRequestId, status);
  }

  createCheckInLink(eventId: string, payload: { label?: string; days?: number }): Observable<{ token: string; url: string; expiresAt: string }> {
    return this.http.post<{ token: string; url: string; expiresAt: string }>(`${this.apiUrl}/events/${eventId}/check-in-link`, payload);
  }

  listTables(eventId: string): Observable<{ tables: EventTableModel[] }> {
    return this.http.get<{ tables: EventTableModel[] }>(`${this.apiUrl}/events/${eventId}/tables`);
  }

  createTable(eventId: string, payload: { name: string; capacity: number; notes?: string; order?: number; x?: number; y?: number; shape?: string; width?: number; height?: number; floor?: number; floorName?: string }): Observable<{ table: EventTableModel }> {
    return this.http.post<{ table: EventTableModel }>(`${this.apiUrl}/events/${eventId}/tables`, payload);
  }

  updateTable(eventId: string, tableId: string, payload: Partial<EventTableModel>): Observable<{ table: EventTableModel }> {
    return this.http.patch<{ table: EventTableModel }>(`${this.apiUrl}/events/${eventId}/tables/${tableId}`, payload);
  }

  deleteTable(eventId: string, tableId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/events/${eventId}/tables/${tableId}`);
  }

  autoAssignTables(eventId: string, payload: AutoAssignTablesPayload): Observable<AutoAssignTablesResponse> {
    return this.http.post<AutoAssignTablesResponse>(`${this.apiUrl}/events/${eventId}/tables/auto-assign`, payload);
  }

  listAlbum(eventId: string): Observable<{ assets: AlbumAssetModel[] }> {
    return this.http.get<{ assets: AlbumAssetModel[] }>(`${this.apiUrl}/events/${eventId}/album`);
  }

  updateAlbumAsset(eventId: string, assetId: string, status: AlbumAssetModel['status']): Observable<{ asset: AlbumAssetModel }> {
    return this.http.patch<{ asset: AlbumAssetModel }>(`${this.apiUrl}/events/${eventId}/album/${assetId}`, { status });
  }

  listPublicAlbum(slug: string): Observable<{ assets: AlbumAssetModel[] }> {
    return this.http.get<{ assets: AlbumAssetModel[] }>(`${this.apiUrl}/invitations/public/${slug}/album`);
  }

  listPublicInvitationDedications(slug: string): Observable<{ dedications: DedicationModel[] }> {
    return this.http.get<{ dedications: DedicationModel[] }>(`${this.apiUrl}/invitations/public/${slug}/dedications`);
  }

  createPublicInvitationDedication(slug: string, payload: { guest?: string; publicName?: string; email?: string; message: string; type?: string; visibility?: string }): Observable<{ dedication: DedicationModel }> {
    return this.http.post<{ dedication: DedicationModel }>(`${this.apiUrl}/invitations/public/${slug}/dedications`, payload);
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

  publishInvitation(id: string): Observable<{ invitation: InvitationModel; publicUrl: string; message?: string; warning?: string }> {
    return this.http.post<{ invitation: InvitationModel; publicUrl: string; message?: string; warning?: string }>(`${this.apiUrl}/invitations/${id}/publish`, {});
  }

  deleteInvitation(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/invitations/${id}`);
  }

  getPublicInvitation(slug: string): Observable<{ invitation: InvitationModel }> {
    return this.http.get<{ invitation: InvitationModel }>(`${this.apiUrl}/invitations/public/${slug}`);
  }

  checkGuestAccess(slug: string, payload: { email?: string; phone?: string }): Observable<GuestAccessResponse> {
    return this.http.post<GuestAccessResponse>(`${this.apiUrl}/invitations/public/${slug}/guest-access`, payload);
  }

  getGuestByToken(slug: string, token: string): Observable<GuestAccessResponse> {
    return this.http.get<GuestAccessResponse>(`${this.apiUrl}/invitations/public/${slug}/guest-token/${encodeURIComponent(token)}`);
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

  getWhatsAppStatus(): Observable<WhatsAppStatusResponse> {
    return this.http.get<WhatsAppStatusResponse>(`${this.apiUrl}/guests/whatsapp/status`);
  }

  sendGuestWhatsApp(id: string, payload: { messageType: GuestMessageType; text?: string; media?: WhatsAppMediaPayload }): Observable<WhatsAppSendResponse> {
    return this.http.post<WhatsAppSendResponse>(`${this.apiUrl}/guests/${id}/whatsapp`, payload);
  }

  sendBulkWhatsApp(eventId: string, payload: { confirm: boolean; messageType: GuestMessageType; media?: WhatsAppMediaPayload; guestIds?: string[]; filters?: { search?: string; status?: string; communicationStatus?: string; group?: string } }): Observable<WhatsAppBulkResponse> {
    return this.http.post<WhatsAppBulkResponse>(`${this.apiUrl}/guests/event/${eventId}/whatsapp/bulk`, payload);
  }

  sendGuestEmail(id: string, payload: { messageType?: GuestMessageType }): Observable<EmailSendResponse> {
    return this.http.post<EmailSendResponse>(`${this.apiUrl}/guests/${id}/send-email`, payload);
  }

  sendBulkEmail(eventId: string, payload: { confirm: boolean; messageType?: GuestMessageType; guestIds?: string[] }): Observable<EmailBulkResponse> {
    return this.http.post<EmailBulkResponse>(`${this.apiUrl}/events/${eventId}/send-email`, payload);
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

  createUploadUrl(payload: { fileName: string; contentType: string; folder: AssetFolder; event?: string; size?: number }): Observable<UploadUrlResponse> {
    return this.http.post<UploadUrlResponse>(`${this.apiUrl}/assets/upload-url`, payload);
  }

  inspectAssetUrl(url: string): Observable<WhatsAppMediaInspection> {
    return this.http.post<WhatsAppMediaInspection>(`${this.apiUrl}/assets/inspect-url`, { url });
  }

  uploadAsset(uploadUrl: string, file: File): Observable<unknown> {
    return this.http.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
  }

  listWhatsAppMedia(eventId: string): Observable<{ assets: WhatsAppMediaAssetModel[] }> {
    return this.http.get<{ assets: WhatsAppMediaAssetModel[] }>(`${this.apiUrl}/assets/events/${eventId}/whatsapp-media`);
  }

  createWhatsAppMedia(eventId: string, payload: {
    key: string;
    url: string;
    type: WhatsAppMediaPayload['type'];
    fileName: string;
    mimetype: string;
    size?: number;
    caption?: string;
  }): Observable<{ asset: WhatsAppMediaAssetModel }> {
    return this.http.post<{ asset: WhatsAppMediaAssetModel }>(`${this.apiUrl}/assets/events/${eventId}/whatsapp-media`, payload);
  }

  deleteWhatsAppMedia(eventId: string, assetId: string): Observable<{ asset: WhatsAppMediaAssetModel }> {
    return this.http.delete<{ asset: WhatsAppMediaAssetModel }>(`${this.apiUrl}/assets/events/${eventId}/whatsapp-media/${assetId}`);
  }

  listPlans(): Observable<{ plans: PlanDefinition[] }> {
    return this.http.get<{ plans: PlanDefinition[] }>(`${this.apiUrl}/payments/plans`);
  }

  getPaymentStatus(eventId?: string): Observable<PaymentStatusResponse> {
    const options = eventId ? { params: new HttpParams().set('eventId', eventId) } : {};
    return this.http.get<PaymentStatusResponse>(`${this.apiUrl}/payments/status`, options);
  }

  createCheckout(payload: { package: Exclude<PaymentPackage, 'free'>; event?: string; billingCycle?: 'monthly' | 'yearly'; invitation?: string }): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/payments/checkout`, payload);
  }

  submitRsvp(slug: string, payload: RsvpPayload): Observable<{ rsvp: RsvpModel; updated?: boolean }> {
    return this.http.post<{ rsvp: RsvpModel; updated?: boolean }>(`${this.apiUrl}/rsvps/public/${slug}`, payload);
  }

  submitExternalRsvp(portalSlug: string, payload: RsvpPayload): Observable<{ rsvp: RsvpModel; updated?: boolean }> {
    return this.http.post<{ rsvp: RsvpModel; updated?: boolean }>(`${this.apiUrl}/rsvps/public-event/${portalSlug}`, payload);
  }

  searchPlaces(query: string): Observable<Array<{ name: string; address: string; lat: number; lon: number; mapUrl: string; wazeUrl: string }>> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return of([]);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&addressdetails=1&limit=5`;
    return this.http.get<any[]>(url).pipe(
      map(results => results.map(item => {
        const addressObj = item.address || {};
        const rawName = item.name || (item.display_name ? item.display_name.split(',')[0] : trimmed);
        const name = rawName.trim();
        const parts = [
          addressObj.road || addressObj.pedestrian || addressObj.suburb,
          addressObj.city || addressObj.town || addressObj.village || addressObj.county,
          addressObj.state,
          addressObj.country
        ].filter(Boolean);
        const address = parts.join(', ') || item.display_name || '';
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        return {
          name,
          address,
          lat,
          lon,
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
          wazeUrl: `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`
        };
      })),
      catchError(() => of([]))
    );
  }

  reverseGeocode(lat: number, lon: number): Observable<{ name?: string; address: string }> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    return this.http.get<any>(url).pipe(
      map(item => {
        const addressObj = item.address || {};
        const name = item.name || addressObj.amenity || addressObj.building || addressObj.tourism || '';
        const parts = [
          addressObj.road || addressObj.pedestrian,
          addressObj.suburb,
          addressObj.city || addressObj.town || addressObj.village,
          addressObj.state,
          addressObj.country
        ].filter(Boolean);
        const address = parts.join(', ') || item.display_name || '';
        return { name, address };
      }),
      catchError(() => of({ address: '' }))
    );
  }

  async parseGoogleMapsUrl(mapUrl: string): Promise<{ name?: string; address?: string; lat?: number; lon?: number; wazeUrl?: string }> {
    const trimmed = mapUrl.trim();
    if (!trimmed) return {};

    let targetUrl = trimmed;
    let htmlContent = '';

    // Check if shortened link maps.app.goo.gl or goo.gl/maps
    if (trimmed.includes('goo.gl') || trimmed.includes('maps.app.goo.gl')) {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(trimmed)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const data = await res.json();
          htmlContent = data.contents || '';

          const ogUrlMatch = htmlContent.match(/property="og:url"\s+content="([^"]+)"/i) ||
                             htmlContent.match(/content="([^"]+)"\s+property="og:url"/i) ||
                             htmlContent.match(/href="(https:\/\/[^"]*google\.com\/maps[^"]*)"/i) ||
                             htmlContent.match(/(https:\/\/[^"]*google\.com\/maps\/place\/[^"'\s]+)/i);
          if (ogUrlMatch && ogUrlMatch[1]) {
            targetUrl = ogUrlMatch[1];
          }
        }
      } catch (e) {
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(trimmed)}`);
          if (res.ok) {
            htmlContent = await res.text();
            const ogUrlMatch = htmlContent.match(/href="(https:\/\/[^"]*google\.com\/maps[^"]*)"/i) ||
                               htmlContent.match(/(https:\/\/[^"]*google\.com\/maps\/place\/[^"'\s]+)/i);
            if (ogUrlMatch && ogUrlMatch[1]) {
              targetUrl = ogUrlMatch[1];
            }
          }
        } catch (err) {}
      }
    }

    let lat: number | undefined;
    let lon: number | undefined;
    let name: string | undefined;

    // Extract exact pin coordinates !3dLAT!4dLON from URL or HTML content
    const dataPinMatch = (targetUrl + ' ' + htmlContent).match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataPinMatch) {
      lat = parseFloat(dataPinMatch[1]);
      lon = parseFloat(dataPinMatch[2]);
    }

    // Pattern 1: /place/Nombre+Lugar/@19.4326,-99.1332
    const placeMatch = targetUrl.match(/\/place\/([^/]+)\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch) {
      name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      if (lat === undefined || lon === undefined) {
        lat = parseFloat(placeMatch[2]);
        lon = parseFloat(placeMatch[3]);
      }
    } else {
      // Pattern 2: @19.4326,-99.1332
      if (lat === undefined || lon === undefined) {
        const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) {
          lat = parseFloat(atMatch[1]);
          lon = parseFloat(atMatch[2]);
        } else {
          // Pattern 3: query=19.4326,-99.1332
          const qMatch = targetUrl.match(/(?:query|q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (qMatch) {
            lat = parseFloat(qMatch[1]);
            lon = parseFloat(qMatch[2]);
          }
        }
      }

      const nameMatch = targetUrl.match(/\/place\/([^/@?]+)/);
      if (nameMatch) {
        name = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
      }
    }

    // If name not extracted from path, try og:title or <title> in HTML content
    if (!name && htmlContent) {
      const ogTitleMatch = htmlContent.match(/property="og:title"\s+content="([^"]+)"/i) ||
                           htmlContent.match(/content="([^"]+)"\s+property="og:title"/i) ||
                           htmlContent.match(/<title>([^<]+)<\/title>/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        const extractedTitle = ogTitleMatch[1].split('·')[0].split('-')[0].replace(/Google Maps/i, '').trim();
        if (extractedTitle && extractedTitle.length > 1) {
          name = extractedTitle;
        }
      }
    }

    let address: string | undefined;
    if (lat !== undefined && lon !== undefined) {
      try {
        const rev = await this.reverseGeocode(lat, lon).toPromise();
        if (rev) {
          address = rev.address;
          if (!name && rev.name) name = rev.name;
        }
      } catch (e) {}
    }

    const wazeUrl = (lat !== undefined && lon !== undefined)
      ? `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`
      : undefined;

    return { name, address, lat, lon, wazeUrl };
  }
}

