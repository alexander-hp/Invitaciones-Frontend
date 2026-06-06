import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthResponse,
  DashboardMetrics,
  EventModel,
  EventPayload,
  InvitationModel,
  InvitationPayload,
  RsvpModel,
  RsvpPayload,
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

  submitRsvp(slug: string, payload: RsvpPayload): Observable<{ rsvp: RsvpModel }> {
    return this.http.post<{ rsvp: RsvpModel }>(`${this.apiUrl}/rsvps/public/${slug}`, payload);
  }
}
