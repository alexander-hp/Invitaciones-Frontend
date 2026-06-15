import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, DedicationModel, EventModel, GuestAccessResponse, RsvpResponse } from '../../core/models';

@Component({ selector: 'app-external-portal', templateUrl: './external-portal.component.html' })
export class ExternalPortalComponent implements OnInit {
  event?: EventModel;
  loading = false;
  sending = false;
  checkingGuest = false;
  uploadingAlbum = false;
  error = '';
  success = '';
  albumMessage = '';
  dedicationMessage = '';
  guestAccessEmail = '';
  verifiedGuest?: GuestAccessResponse['guest'];
  selectedAlbumFile?: File;
  albumAssets: AlbumAssetModel[] = [];
  dedications: DedicationModel[] = [];
  dedication = { publicName: '', message: '', type: 'dedication' };
  companionNamesText = '';
  rsvp = {
    name: '',
    email: '',
    response: 'confirmed' as RsvpResponse,
    companions: 0,
    dietaryRestrictions: '',
    mealPreference: '',
    menuSelection: '',
    message: '',
    phoneCountryCode: '+52',
    phoneNationalNumber: ''
  };

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getExternalConfig(this.portalSlug).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loadGuestToken();
        this.loadAlbum();
        this.loadDedications();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Portal no disponible.';
        this.loading = false;
      }
    });
  }

  checkGuestAccess(): void {
    if (!this.guestAccessEmail) return;
    this.checkingGuest = true;
    this.error = '';
    this.api.checkExternalGuestAccess(this.portalSlug, { email: this.guestAccessEmail }).subscribe({
      next: ({ guest }) => {
        this.verifiedGuest = guest;
        this.rsvp.name = guest.name;
        this.rsvp.email = guest.email || this.guestAccessEmail;
        this.success = `Hola ${guest.name}, ya puedes confirmar.`;
        this.checkingGuest = false;
      },
      error: (error) => {
        this.verifiedGuest = undefined;
        this.error = error.error?.message || 'Este correo no esta en la lista.';
        this.checkingGuest = false;
      }
    });
  }

  submit(): void {
    if (!this.verifiedGuest) {
      this.error = 'Valida tu correo antes de responder.';
      return;
    }
    const { phoneCountryCode, phoneNationalNumber, ...rsvpBase } = this.rsvp;
    const phonePayload = phoneNationalNumber ? { phoneCountryCode, phoneNationalNumber } : {};
    this.sending = true;
    this.error = '';
    this.success = '';
    this.api.submitExternalRsvp(this.portalSlug, {
      ...rsvpBase,
      ...phonePayload,
      guest: this.verifiedGuest.id,
      name: this.verifiedGuest.name,
      email: this.verifiedGuest.email || this.rsvp.email,
      companions: this.rsvp.response === 'confirmed' ? Number(this.rsvp.companions || 0) : 0,
      companionNames: this.rsvp.response === 'confirmed' ? this.companionNames : [],
      mealPreference: this.rsvp.response === 'confirmed' ? this.rsvp.mealPreference : undefined,
      dietaryRestrictions: this.rsvp.response === 'confirmed' ? this.rsvp.dietaryRestrictions : undefined,
      menuSelection: this.rsvp.response === 'confirmed' ? this.rsvp.menuSelection : undefined
    }).subscribe({
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

  selectAlbumFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedAlbumFile = input.files?.[0] || undefined;
    this.albumMessage = this.selectedAlbumFile ? this.selectedAlbumFile.name : '';
  }

  uploadAlbumPhoto(): void {
    if (!this.selectedAlbumFile) return;
    this.uploadingAlbum = true;
    this.error = '';
    this.api.uploadPublicExternalAlbumPhoto(this.portalSlug, {
      file: this.selectedAlbumFile,
      name: this.verifiedGuest?.name || this.rsvp.name,
      email: this.verifiedGuest?.email || this.rsvp.email || this.guestAccessEmail,
      guest: this.verifiedGuest?.id
    }).subscribe({
      next: () => {
        this.albumMessage = 'Foto enviada para revision.';
        this.selectedAlbumFile = undefined;
        this.uploadingAlbum = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo subir la foto.';
        this.uploadingAlbum = false;
      }
    });
  }

  submitDedication(): void {
    if (!this.dedication.message.trim()) return;
    this.sending = true;
    this.error = '';
    this.dedicationMessage = '';
    this.api.createExternalDedication(this.portalSlug, {
      guest: this.verifiedGuest?.id,
      publicName: this.dedication.publicName || this.verifiedGuest?.name || this.rsvp.name,
      email: this.verifiedGuest?.email || this.rsvp.email || this.guestAccessEmail,
      message: this.dedication.message,
      type: this.dedication.type
    }).subscribe({
      next: () => {
        this.dedicationMessage = 'Dedicatoria enviada para revision.';
        this.dedication = { publicName: '', message: '', type: 'dedication' };
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo enviar la dedicatoria.';
        this.sending = false;
      }
    });
  }

  loadAlbum(): void {
    if (this.event?.externalPortalSettings?.albumEnabled === false) return;
    this.api.listPublicExternalAlbum(this.portalSlug).subscribe({
      next: ({ assets }) => this.albumAssets = assets,
      error: () => this.albumAssets = []
    });
  }

  loadDedications(): void {
    if (this.event?.externalContent?.dedicationSettings?.enabled === false) return;
    this.api.listExternalDedications(this.portalSlug).subscribe({
      next: ({ dedications }) => this.dedications = dedications,
      error: () => this.dedications = []
    });
  }

  get companionNames(): string[] {
    return this.companionNamesText.split('\n').map((name) => name.trim()).filter(Boolean);
  }

  get portalSlug(): string {
    return this.route.snapshot.paramMap.get('portalSlug') || '';
  }

  get portalUrl(): string {
    return `${window.location.origin}/e/${this.portalSlug}`;
  }

  get guestQrUrl(): string {
    const value = this.verifiedGuest?.checkInCode || this.verifiedGuest?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(value)}` : '';
  }

  get calendarUrl(): string {
    if (!this.event?.date) return '';
    const start = new Date(this.event.date);
    if (Number.isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const format = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const location = [this.event.venue?.name, this.event.venue?.address].filter(Boolean).join(' - ');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.event.title)}&dates=${format(start)}/${format(end)}&details=${encodeURIComponent(this.portalUrl)}&location=${encodeURIComponent(location)}`;
  }

  private loadGuestToken(): void {
    const token = this.route.snapshot.queryParamMap.get('t');
    if (!token) return;
    this.checkingGuest = true;
    this.api.getExternalGuestByToken(this.portalSlug, token).subscribe({
      next: ({ guest }) => {
        this.verifiedGuest = guest;
        this.rsvp.name = guest.name;
        this.rsvp.email = guest.email || '';
        this.success = `Hola ${guest.name}, tu pase esta listo.`;
        this.checkingGuest = false;
      },
      error: () => this.checkingGuest = false
    });
  }
}
