import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DedicationModel, EventModel, GuestAccessResponse, InvitationLocation, InvitationModel, RsvpCustomQuestion, RsvpResponse } from '../../core/models';

@Component({ selector: 'app-public-invitation', templateUrl: './public-invitation.component.html' })
export class PublicInvitationComponent implements OnInit {
  invitation?: InvitationModel;
  event?: EventModel;
  loading = false;
  sending = false;
  checkingGuest = false;
  uploadingAlbum = false;
  error = '';
  success = '';
  albumMessage = '';
  dedicationMessage = '';
  publicAlbumAssets: Array<{ url: string; uploaderName?: string; createdAt?: string }> = [];

  get allAlbumAssets(): Array<{ url: string; uploaderName?: string; createdAt?: string }> {
    const hostPhotos = (this.invitation?.content?.privateAlbum || []).map(url => ({
      url,
      uploaderName: 'Anfitrión'
    }));
    return [...hostPhotos, ...this.publicAlbumAssets];
  }
  dedications: DedicationModel[] = [];
  guestAccessEmail = '';
  selectedAlbumFile?: File;
  declineConfirmed = false;
  verifiedGuest?: GuestAccessResponse['guest'];
  companionNamesText = '';
  customAnswers: Record<string, string | boolean> = {};
  dedication = { publicName: '', message: '', type: 'dedication' };
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
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loading = true;
    this.error = '';
    this.api.getPublicInvitation(slug).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.event = typeof invitation.event === 'string' ? undefined : invitation.event;
        this.loadGuestToken();
        this.loadPublicAlbum();
        this.loadDedications();
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
      companionNames: this.isFinalAttendance ? this.companionNames : [],
      mealPreference: this.isFinalAttendance ? this.rsvp.mealPreference : undefined,
      dietaryRestrictions: this.isFinalAttendance ? this.rsvp.dietaryRestrictions : undefined,
      menuSelection: this.isFinalAttendance ? this.rsvp.menuSelection : undefined,
      customAnswers: this.customQuestionAnswers,
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

  selectAlbumFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedAlbumFile = input.files?.[0] || undefined;
    this.albumMessage = this.selectedAlbumFile ? this.selectedAlbumFile.name : '';
  }

  uploadAlbumPhoto(): void {
    if (!this.invitation || !this.selectedAlbumFile) return;
    this.uploadingAlbum = true;
    this.error = '';
    this.albumMessage = '';
    this.api.uploadPublicAlbumPhoto(this.invitation.slug, {
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
    if (!this.invitation || !this.dedication.message.trim()) return;
    this.sending = true;
    this.error = '';
    this.dedicationMessage = '';
    this.api.createPublicInvitationDedication(this.invitation.slug, {
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

  loadPublicAlbum(): void {
    if (!this.invitation?.content.privateAlbumEnabled) return;
    this.api.listPublicAlbum(this.invitation.slug).subscribe({
      next: ({ assets }) => this.publicAlbumAssets = assets,
      error: () => this.publicAlbumAssets = []
    });
  }

  loadDedications(): void {
    if (this.invitation?.content.dedicationSettings?.enabled === false) return;
    this.api.listPublicInvitationDedications(this.invitation?.slug || '').subscribe({
      next: ({ dedications }) => this.dedications = dedications,
      error: () => this.dedications = []
    });
  }

  resetGuestAccess(): void {
    this.verifiedGuest = undefined;
    this.success = '';
    this.error = '';
    this.declineConfirmed = false;
    this.companionNamesText = '';
    this.customAnswers = {};
    this.rsvp = { name: '', email: '', response: 'confirmed' as RsvpResponse, companions: 0, dietaryRestrictions: '', mealPreference: '', menuSelection: '', message: '', phoneCountryCode: '+52', phoneNationalNumber: '' };
  }

  onResponseChange(): void {
    if (!this.isFinalAttendance) {
      this.rsvp.companions = 0;
      this.rsvp.mealPreference = '';
      this.rsvp.menuSelection = '';
      this.rsvp.dietaryRestrictions = '';
      this.companionNamesText = '';
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

  get companionNames(): string[] {
    return this.companionNamesText.split('\n').map((name) => name.trim()).filter(Boolean);
  }

  get customQuestionAnswers(): Array<{ key: string; label?: string; value?: string | boolean }> {
    return (this.invitation?.rsvpSettings?.customQuestions || []).map((question) => {
      const key = this.getQuestionKey(question);
      return { key, label: question.label, value: this.customAnswers[key] };
    });
  }

  getQuestionKey(question: RsvpCustomQuestion): string {
    return question.key || question.label;
  }

  getCustomAnswer(question: RsvpCustomQuestion): string | boolean {
    return this.customAnswers[this.getQuestionKey(question)] ?? '';
  }

  setCustomAnswer(question: RsvpCustomQuestion, value: string | boolean | null | undefined): void {
    this.customAnswers[this.getQuestionKey(question)] = value ?? '';
  }

  get guestQrUrl(): string {
    const value = this.verifiedGuest?.checkInCode || this.verifiedGuest?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(value)}` : '';
  }

  downloadGuestPass(): void {
    if (!this.verifiedGuest) return;
    const lines = [
      this.event?.title || this.invitation?.content.headline || 'Invitacion',
      `Invitado: ${this.verifiedGuest.name}`,
      `Codigo: ${this.verifiedGuest.checkInCode || this.verifiedGuest.qrCode || 'Pendiente'}`,
      `Mesa: ${this.verifiedGuest.tableName || 'Pendiente'}`,
      this.verifiedGuest.seatLabel ? `Asiento: ${this.verifiedGuest.seatLabel}` : '',
      `Acompanantes permitidos: ${this.verifiedGuest.allowedCompanions}`
    ].filter(Boolean).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pase-${this.verifiedGuest.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  get publicQrUrl(): string {
    return this.publicInvitationUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(this.publicInvitationUrl)}` : '';
  }

  get publicInvitationUrl(): string {
    return this.invitation ? `${window.location.origin}/i/${this.invitation.slug}` : '';
  }

  get countdownLabel(): string {
    if (!this.event?.date) return '';
    const target = new Date(this.event.date).getTime();
    const diff = target - Date.now();
    if (Number.isNaN(target)) return '';
    if (diff <= 0) return 'El evento ya comenzo';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `Faltan ${days} dia(s) y ${hours} hora(s)`;
    return `Faltan ${hours} hora(s)`;
  }

  get calendarUrl(): string {
    if (!this.event?.date) return '';
    const start = new Date(this.event.date);
    if (Number.isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const format = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const details = this.publicInvitationUrl ? `Confirma asistencia: ${this.publicInvitationUrl}` : '';
    const location = [this.event.venue?.name, this.event.venue?.address].filter(Boolean).join(' - ');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.event.title)}&dates=${format(start)}/${format(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  }

  get displayLocations(): InvitationLocation[] {
    const contentLocations = this.invitation?.content.locations || [];
    if (contentLocations.length) return contentLocations;
    const venue = this.event?.venue;
    if (!venue?.name && !venue?.address && !venue?.mapUrl) return [];
    return [{ type: 'principal', name: venue.name || 'Lugar del evento', address: venue.address || '', mapUrl: venue.mapUrl || '' }];
  }

  onMusicPlaybackError(): void {
    this.error = 'La musica no se pudo reproducir. Los anfitriones deben revisar permisos de lectura del archivo.';
  }

  private loadGuestToken(): void {
    const token = this.route.snapshot.queryParamMap.get('t');
    if (!this.invitation || !token) return;
    this.checkingGuest = true;
    this.api.getGuestByToken(this.invitation.slug, token).subscribe({
      next: ({ guest }) => {
        this.verifiedGuest = guest;
        this.rsvp.name = guest.name;
        this.rsvp.email = guest.email || '';
        this.success = `Hola ${guest.name}, tu link personalizado esta listo para confirmar.`;
        this.checkingGuest = false;
      },
      error: () => {
        this.checkingGuest = false;
      }
    });
  }
}
