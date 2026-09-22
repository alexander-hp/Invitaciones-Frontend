import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ExternalGuestStatusResponse, InvitationModel } from '../../core/models';

@Component({
  selector: 'app-guest-activity',
  templateUrl: './guest-activity.component.html',
  styleUrls: ['./guest-activity.component.css']
})
export class GuestActivityComponent implements OnInit, OnDestroy {
  slug = '';
  invitation?: InvitationModel;
  activity?: ExternalGuestStatusResponse;
  identity = '';
  loading = true;
  identifying = false;
  error = '';
  private sessionToken = '';
  private pollingTimer?: ReturnType<typeof setInterval>;

  constructor(private route: ActivatedRoute, private api: ApiService) { }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.sessionToken = sessionStorage.getItem(this.storageKey) || '';
    this.api.getPublicInvitation(this.slug).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        this.loading = false;
        if (this.sessionToken) this.loadStatus();
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo abrir la invitación.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  identify(): void {
    const value = this.identity.trim();
    if (!value) return;
    this.identifying = true;
    this.error = '';
    const payload = value.includes('@') ? { email: value } : { phone: value };
    this.api.checkGuestAccess(this.slug, payload).subscribe({
      next: ({ guestSessionToken }) => {
        this.identifying = false;
        if (!guestSessionToken) {
          this.error = 'No se pudo iniciar una sesión para este invitado.';
          return;
        }
        this.sessionToken = guestSessionToken;
        sessionStorage.setItem(this.storageKey, guestSessionToken);
        this.loadStatus();
      },
      error: (error) => {
        this.identifying = false;
        this.error = error.error?.message || 'No encontramos al invitado.';
      }
    });
  }

  closeSession(): void {
    sessionStorage.removeItem(this.storageKey);
    this.sessionToken = '';
    this.activity = undefined;
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  statusLabel(status?: string): string {
    return ({ pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', played: 'Tocada' } as Record<string, string>)[status || ''] || status || 'Pendiente';
  }

  rsvpLabel(): string {
    const response = this.activity?.rsvp?.response;
    return response === 'confirmed' ? 'Asistencia confirmada' : response === 'declined' ? 'No asistiré' : response === 'maybe' ? 'Tal vez asistiré' : 'Sin confirmar';
  }

  get qrUrl(): string {
    const code = this.activity?.guest.checkInCode || this.activity?.guest.qrCode || '';
    return code ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(code)}` : '';
  }

  private get storageKey(): string {
    return `kyndra_guest_session_${this.slug}`;
  }

  private loadStatus(): void {
    if (!this.sessionToken) return;
    this.api.getInvitationGuestStatus(this.slug, this.sessionToken).subscribe({
      next: (activity) => {
        this.activity = activity;
        this.error = '';
        if (!this.pollingTimer) this.pollingTimer = setInterval(() => this.loadStatus(), 15000);
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo actualizar tu actividad.';
        if (error.status === 401 || error.status === 403) this.closeSession();
      }
    });
  }
}
