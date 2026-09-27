import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DedicationModel, ExternalGuestStatusResponse, InvitationModel, RsvpResponse } from '../../core/models';

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
  actionMessage = '';
  actionLoading = false;
  rsvpForm = { response: 'confirmed' as RsvpResponse, companions: 0, companionNames: '', message: '' };
  editingDedicationId = '';
  dedicationDraft = '';
  private rsvpInitialized = false;
  private sessionToken = '';
  private pollingTimer?: ReturnType<typeof setInterval>;

  constructor(private route: ActivatedRoute, private api: ApiService) { }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.sessionToken = sessionStorage.getItem(this.storageKey) || '';
    this.api.getPublicInvitation(this.slug, this.sessionToken || undefined).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        this.loading = false;
        if (this.sessionToken) this.loadStatus();
      },
      error: (error) => {
        this.error = error.status === 401 || error.status === 403
          ? ''
          : error.error?.message || 'No se pudo abrir la invitación.';
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
      next: ({ message }) => {
        this.identifying = false;
        this.actionMessage = message;
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
    this.rsvpInitialized = false;
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  statusLabel(status?: string): string {
    return ({ pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', played: 'Tocada' } as Record<string, string>)[status || ''] || status || 'Pendiente';
  }

  saveRsvp(): void {
    this.runAction(this.api.updateInvitationGuestRsvp(this.slug, this.sessionToken, {
      response: this.rsvpForm.response,
      companions: this.rsvpForm.response === 'confirmed' ? Number(this.rsvpForm.companions || 0) : 0,
      companionNames: this.rsvpForm.response === 'confirmed' ? this.rsvpForm.companionNames.split(',').map((name) => name.trim()).filter(Boolean) : [],
      message: this.rsvpForm.message,
      declineConfirmed: this.rsvpForm.response === 'declined'
    }), 'Confirmación actualizada');
  }

  uploadPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.activity) return;
    this.runAction(this.api.uploadPublicAlbumPhoto(this.slug, {
      file, guest: this.activity.guest.id, name: this.activity.guest.name,
      email: this.activity.guest.email, guestSessionToken: this.sessionToken
    }), 'Fotografía enviada para revisión', () => { input.value = ''; });
  }

  removePhoto(id?: string): void {
    if (!id || !window.confirm('¿Retirar esta fotografía pendiente?')) return;
    this.runAction(this.api.removeInvitationGuestPhoto(this.slug, id, this.sessionToken), 'Fotografía retirada');
  }

  removeSong(id?: string): void {
    if (!id || !window.confirm('¿Cancelar esta solicitud de canción?')) return;
    this.runAction(this.api.removeInvitationGuestSong(this.slug, id, this.sessionToken), 'Solicitud cancelada');
  }

  editDedication(item: DedicationModel): void {
    this.editingDedicationId = item.id || item._id || '';
    this.dedicationDraft = item.message;
  }

  saveDedication(item: DedicationModel): void {
    const id = item.id || item._id;
    if (!id || !this.dedicationDraft.trim()) return;
    this.runAction(this.api.updateInvitationGuestDedication(this.slug, id, this.sessionToken, {
      publicName: item.publicName, message: this.dedicationDraft.trim(), visibility: item.visibility
    }), 'Dedicatoria actualizada', () => { this.editingDedicationId = ''; this.dedicationDraft = ''; });
  }

  removeDedication(id?: string): void {
    if (!id || !window.confirm('¿Retirar esta dedicatoria pendiente?')) return;
    this.runAction(this.api.removeInvitationGuestDedication(this.slug, id, this.sessionToken), 'Dedicatoria retirada');
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
        this.markReviewedActivityAsSeen(activity);
        if (activity.rsvp && !this.rsvpInitialized) {
          this.rsvpForm = {
            response: activity.rsvp.response,
            companions: Number(activity.rsvp.companions || 0),
            companionNames: (activity.rsvp.companionNames || []).join(', '),
            message: activity.rsvp.message || ''
          };
          this.rsvpInitialized = true;
        }
        this.error = '';
        if (!this.pollingTimer) this.pollingTimer = setInterval(() => this.loadStatus(), 15000);
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo actualizar tu actividad.';
        if (error.status === 401 || error.status === 403) this.closeSession();
      }
    });
  }

  private markReviewedActivityAsSeen(activity: ExternalGuestStatusResponse): void {
    const seen: Record<string, string> = {};
    for (const item of activity.albumUploads || []) {
      const id = item.id || item._id;
      if (id && item.status !== 'pending') seen[`album:${id}`] = item.status;
    }
    for (const item of activity.songRequests || []) {
      const id = item.id || item._id;
      if (id && item.status !== 'pending') seen[`song:${id}`] = item.status;
    }
    for (const item of activity.dedications || []) {
      const id = item.id || item._id;
      if (id && item.status !== 'pending') seen[`dedication:${id}`] = item.status;
    }
    localStorage.setItem(`kyndra_activity_seen_${this.slug}_${activity.guest.id}`, JSON.stringify(seen));
  }

  private runAction(request: { subscribe: Function }, successMessage: string, afterSuccess?: () => void): void {
    if (this.actionLoading) return;
    this.actionLoading = true;
    this.error = '';
    this.actionMessage = '';
    request.subscribe({
      next: () => {
        this.actionLoading = false;
        this.actionMessage = successMessage;
        if (afterSuccess) afterSuccess();
        this.loadStatus();
      },
      error: (error: any) => {
        this.actionLoading = false;
        this.error = error.error?.message || 'No se pudo completar la acción.';
      }
    });
  }
}
