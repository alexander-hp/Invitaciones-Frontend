import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, GuestAccessResponse, InvitationModel, RsvpResponse } from '../../core/models';

@Component({ selector: 'app-public-invitation', templateUrl: './public-invitation.component.html' })
export class PublicInvitationComponent implements OnInit {
  invitation?: InvitationModel;
  event?: EventModel;
  loading = false;
  sending = false;
  checkingGuest = false;
  error = '';
  success = '';
  guestAccessEmail = '';
  declineConfirmed = false;
  verifiedGuest?: GuestAccessResponse['guest'];
  rsvp = {
    name: '',
    email: '',
    response: 'confirmed' as RsvpResponse,
    companions: 0,
    mealPreference: '',
    message: '',
    phoneCountryCode: '+52',
    phoneNationalNumber: ''
  };

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loading = true;
    this.error = '';
    this.api.getPublicInvitation(slug).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.event = typeof invitation.event === 'string' ? undefined : invitation.event;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Invitacion no disponible.';
        this.loading = false;
      }
    });
  }

  submit(): void {
    if (!this.invitation) return;
    if (this.isGuestList && !this.verifiedGuest) {
      this.error = 'Valida tu email antes de enviar tu RSVP.';
      return;
    }
    if (this.rsvp.response === 'declined' && this.requiresDeclineConfirmation && !this.declineConfirmed) {
      this.error = 'Confirma que no asistiras antes de enviar tu respuesta.';
      return;
    }
    this.sending = true;
    this.error = '';
    this.success = '';
    const { phoneCountryCode, phoneNationalNumber, ...rsvpBase } = this.rsvp;
    const phonePayload = phoneNationalNumber
      ? { phoneCountryCode: this.rsvp.phoneCountryCode || '+52', phoneNationalNumber: this.rsvp.phoneNationalNumber }
      : {};
    const payload = {
      ...rsvpBase,
      ...phonePayload,
      guest: this.verifiedGuest?.id,
      name: this.verifiedGuest?.name || this.rsvp.name,
      email: this.verifiedGuest?.email || this.rsvp.email,
      companions: this.isFinalAttendance ? Number(this.rsvp.companions || 0) : 0,
      mealPreference: this.isFinalAttendance ? this.rsvp.mealPreference : undefined,
      declineConfirmed: this.declineConfirmed
    };
    this.api.submitRsvp(this.invitation.slug, payload).subscribe({
      next: (response) => {
        this.success = response.updated ? 'Tu respuesta fue actualizada.' : 'Gracias, tu respuesta fue registrada.';
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo enviar tu RSVP.';
        this.sending = false;
      }
    });
  }

  checkGuestAccess(): void {
    if (!this.invitation || !this.guestAccessEmail) return;
    this.checkingGuest = true;
    this.error = '';
    this.success = '';
    this.api.checkGuestAccess(this.invitation.slug, { email: this.guestAccessEmail }).subscribe({
      next: ({ guest }) => {
        this.verifiedGuest = guest;
        this.rsvp.name = guest.name;
        this.rsvp.email = guest.email || this.guestAccessEmail;
        this.rsvp.companions = 0;
        this.success = `Hola ${guest.name}, ya puedes confirmar tu asistencia.`;
        this.checkingGuest = false;
      },
      error: (error) => {
        this.verifiedGuest = undefined;
        this.error = error.error?.message || 'Este correo no esta en la lista de invitados.';
        this.checkingGuest = false;
      }
    });
  }

  resetGuestAccess(): void {
    this.verifiedGuest = undefined;
    this.success = '';
    this.error = '';
    this.declineConfirmed = false;
    this.rsvp = { name: '', email: '', response: 'confirmed' as RsvpResponse, companions: 0, mealPreference: '', message: '', phoneCountryCode: '+52', phoneNationalNumber: '' };
  }

  onResponseChange(): void {
    if (!this.isFinalAttendance) {
      this.rsvp.companions = 0;
      this.rsvp.mealPreference = '';
    }
    if (this.rsvp.response !== 'declined') {
      this.declineConfirmed = false;
    }
  }

  get isGuestList(): boolean {
    return this.invitation?.accessMode === 'guest_list';
  }

  get maxCompanions(): number | null {
    return this.verifiedGuest ? this.verifiedGuest.allowedCompanions : null;
  }

  get isFinalAttendance(): boolean {
    return this.rsvp.response === 'confirmed';
  }

  get canUseMaybe(): boolean {
    return this.invitation?.rsvpSettings?.allowMaybe !== false;
  }

  get requiresDeclineConfirmation(): boolean {
    return this.invitation?.rsvpSettings?.declineRequiresConfirmation !== false;
  }

  get deadlineLabel(): string {
    const deadline = this.invitation?.rsvpSettings?.deadline;
    return deadline ? new Date(deadline).toLocaleString() : '';
  }
}
