import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DedicationModel, EventModel, GuestAccessResponse, InvitationLocation, InvitationModel, RsvpCustomQuestion, RsvpResponse } from '../../core/models';
import { generateGuestPassHtml } from './guest-pass-template';

@Component({
  selector: 'app-new-public-invitation',
  templateUrl: './new-public-invitation.component.html',
  styleUrls: ['./new-public-invitation.component.css']
})
export class NewPublicInvitationComponent implements OnInit, OnDestroy {
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
  toastMessage = '';
  activeLightboxImage: string | null = null;
  isPlayingMusic = false;
  currentActiveSection = 'hero';
  currentPlayingTrackUrl = '';
  private audioRef?: HTMLAudioElement;
  private observer?: IntersectionObserver;
  private timerInterval?: any;

  countdown = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false
  };

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
  guestAccessPhone = '';
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

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.audioRef) {
      this.audioRef.pause();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
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

        console.log('🎵 [PublicInvitation] Loaded invitation payload:', invitation);
        console.log('🎵 [PublicInvitation] content:', invitation?.content);
        console.log('🎵 [PublicInvitation] musicUrl:', invitation?.content?.musicUrl);
        console.log('🎵 [PublicInvitation] sectionMusic:', invitation?.content?.sectionMusic);

        this.loadGuestToken();
        this.loadPublicAlbum();
        this.loadDedications();
        this.startCountdown();
        this.initAudio();
        this.setupSectionObserver();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Invitación no disponible.';
        this.loading = false;
      }
    });
  }

  private startCountdown(): void {
    if (!this.event?.date) return;
    this.updateCountdown();
    this.timerInterval = setInterval(() => this.updateCountdown(), 1000);
  }

  private updateCountdown(): void {
    if (!this.event?.date) return;
    const target = new Date(this.event.date).getTime();
    const now = Date.now();
    const diff = target - now;

    if (Number.isNaN(target) || diff <= 0) {
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
      return;
    }

    this.countdown = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isOver: false
    };
  }

  hasMusicTrack(): boolean {
    if (this.invitation?.content?.musicUrl) return true;
    const secMusic = this.invitation?.content?.sectionMusic;
    if (!secMusic) return false;
    if (typeof (secMusic as any).values === 'function') {
      return Array.from((secMusic as any).values()).some(Boolean);
    }
    return Boolean(typeof secMusic === 'object' && Object.values(secMusic).some(Boolean));
  }

  getSectionSpecificMusicUrl(sectionKey: string): string {
    const secMusic = this.invitation?.content?.sectionMusic;
    if (secMusic) {
      if (typeof (secMusic as any).get === 'function') {
        const val = (secMusic as any).get(sectionKey);
        if (val && typeof val === 'string') return val.trim();
      } else if (typeof secMusic === 'object' && (secMusic as Record<string, string>)[sectionKey]) {
        const val = (secMusic as Record<string, string>)[sectionKey];
        if (val && typeof val === 'string') return val.trim();
      }
    }
    return '';
  }

  hasSectionMusic(sectionKey: string): boolean {
    return Boolean(this.getSectionSpecificMusicUrl(sectionKey));
  }

  isSectionMusicPlaying(sectionKey: string): boolean {
    if (!this.isPlayingMusic || !this.audioRef) return false;
    const targetUrl = this.getSectionSpecificMusicUrl(sectionKey) || this.getAudioUrlForSection(sectionKey);
    return Boolean(targetUrl && this.currentPlayingTrackUrl === targetUrl && !this.audioRef.paused);
  }

  toggleSectionMusic(sectionKey: string): void {
    const targetUrl = this.getSectionSpecificMusicUrl(sectionKey) || this.getAudioUrlForSection(sectionKey);
    if (!targetUrl) return;

    this.currentActiveSection = sectionKey;

    if (this.isPlayingMusic && this.currentPlayingTrackUrl === targetUrl && this.audioRef && !this.audioRef.paused) {
      this.audioRef.pause();
      this.isPlayingMusic = false;
      return;
    }

    this.playTrackUrl(targetUrl, true);
  }

  getAudioUrlForSection(sectionKey: string): string {
    const specific = this.getSectionSpecificMusicUrl(sectionKey);
    if (specific) return specific;
    return this.invitation?.content?.musicUrl || '';
  }

  private initAudio(): void {
    const initialUrl = this.getAudioUrlForSection('hero') || this.invitation?.content.musicUrl;
    if (!initialUrl) return;
    this.currentPlayingTrackUrl = initialUrl;
    this.audioRef = new Audio(initialUrl);
    this.audioRef.loop = true;
    this.audioRef.onerror = () => {
      this.isPlayingMusic = false;
    };
  }

  private setupSectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          const sectionKey = entry.target.getAttribute('data-section-key');
          if (sectionKey && sectionKey !== this.currentActiveSection) {
            this.currentActiveSection = sectionKey;
            this.onSectionFocusChange(sectionKey);
          }
        }
      });
    }, { threshold: [0.2] });

    setTimeout(() => {
      const sectionElements = document.querySelectorAll('[data-section-key]');
      sectionElements.forEach(el => this.observer?.observe(el));
    }, 600);
  }

  onSectionFocusChange(sectionKey: string): void {
    if (!this.invitation || !this.isPlayingMusic) return;
    const targetUrl = this.getAudioUrlForSection(sectionKey);
    if (targetUrl && targetUrl !== this.currentPlayingTrackUrl) {
      this.playTrackUrl(targetUrl);
    }
  }

  playTrackUrl(url: string, forcePlay: boolean = false): void {
    if (!url) return;
    this.currentPlayingTrackUrl = url;
    if (!this.audioRef) {
      this.audioRef = new Audio(url);
      this.audioRef.loop = true;
      this.audioRef.onerror = () => { this.isPlayingMusic = false; };
    } else {
      this.audioRef.pause();
      this.audioRef.src = url;
      this.audioRef.currentTime = 0;
      this.audioRef.load();
    }

    const shouldPlay = forcePlay || this.isPlayingMusic;
    if (shouldPlay) {
      this.audioRef.play().then(() => {
        this.isPlayingMusic = true;
      }).catch(() => {
        this.isPlayingMusic = false;
      });
    }
  }

  toggleMusic(): void {
    const targetUrl = this.getAudioUrlForSection(this.currentActiveSection) || this.invitation?.content.musicUrl || '';
    if (!this.audioRef && targetUrl) {
      this.playTrackUrl(targetUrl, true);
      return;
    }
    if (!this.audioRef) return;

    if (this.isPlayingMusic) {
      this.audioRef.pause();
      this.isPlayingMusic = false;
    } else {
      this.audioRef.play().then(() => {
        this.isPlayingMusic = true;
      }).catch(() => {
        this.showToast('Haz clic de nuevo para reproducir la música.');
        this.isPlayingMusic = false;
      });
    }
  }

  submit(): void {
    if (!this.invitation) return;
    if (this.requiresGuestValidation && !this.verifiedGuest) {
      this.error = 'Valida tu correo o teléfono antes de enviar tu RSVP.';
      return;
    }
    if (this.rsvp.response === 'declined' && this.requiresDeclineConfirmation && !this.declineConfirmed) {
      this.error = 'Confirma que no asistirás antes de enviar tu respuesta.';
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
        this.success = response.updated ? '¡Tu respuesta fue actualizada con éxito!' : '¡Muchas gracias! Tu respuesta fue registrada.';
        this.sending = false;
        this.showToast(this.success);
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo enviar tu RSVP.';
        this.sending = false;
      }
    });
  }

  checkGuestAccess(): void {
    if (!this.invitation || (!this.guestAccessEmail && !this.guestAccessPhone)) return;
    this.checkingGuest = true;
    this.error = '';
    this.success = '';
    this.api.checkGuestAccess(this.invitation.slug, { email: this.guestAccessEmail || undefined, phone: this.guestAccessPhone || undefined }).subscribe({
      next: ({ guest }) => {
        this.verifiedGuest = guest;
        this.rsvp.name = guest.name;
        this.rsvp.email = guest.email || this.guestAccessEmail;
        if (!guest.email && this.guestAccessPhone) this.rsvp.phoneNationalNumber = this.guestAccessPhone.replace(/\D/g, '');
        this.rsvp.companions = 0;
        this.success = `¡Hola ${guest.name}! Ya puedes confirmar tu asistencia.`;
        this.checkingGuest = false;
      },
      error: (error) => {
        this.verifiedGuest = undefined;
        this.error = error.error?.message || 'Este invitado no está en la lista registrada.';
        this.checkingGuest = false;
      }
    });
  }

  submitRsvp(): void {
    this.submit();
  }

  submitDedicationFromData(data: { publicName: string; message: string }): void {
    this.dedication.publicName = data.publicName;
    this.dedication.message = data.message;
    this.submitDedication();
  }

  onFileSelectedDirect(file: File): void {
    this.selectedAlbumFile = file;
    this.uploadAlbumPhoto();
  }

  checkGuestAccessByCredentials(email: string, phone: string): void {
    if (email) this.guestAccessEmail = email;
    if (phone) this.guestAccessPhone = phone;
    this.checkGuestAccess();
  }

  selectAlbumFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedAlbumFile = input.files?.[0] || undefined;
    this.albumMessage = this.selectedAlbumFile ? `Archivo: ${this.selectedAlbumFile.name}` : '';
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
        this.albumMessage = '¡Foto enviada para revisión!';
        this.selectedAlbumFile = undefined;
        this.uploadingAlbum = false;
        this.showToast('Foto enviada con éxito');
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
        this.dedicationMessage = '¡Gracias! Tu dedicatoria fue enviada para revisión.';
        this.dedication = { publicName: '', message: '', type: 'dedication' };
        this.sending = false;
        this.showToast('Dedicatoria recibida');
        this.loadDedications();
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
    this.guestAccessPhone = '';
    this.success = '';
    this.error = '';
    this.declineConfirmed = false;
    this.companionNamesText = '';
    this.customAnswers = {};
    this.rsvp = { name: '', email: '', response: 'confirmed' as RsvpResponse, companions: 0, dietaryRestrictions: '', mealPreference: '', menuSelection: '', message: '', phoneCountryCode: '+52', phoneNationalNumber: '' };
  }

  downloadGuestPass(): void {
    if (!this.verifiedGuest || !this.invitation) return;

    const passHtml = generateGuestPassHtml({
      guestName: this.verifiedGuest.name,
      tableName: this.verifiedGuest.tableName,
      seatLabel: this.verifiedGuest.seatLabel,
      allowedCompanions: this.verifiedGuest.allowedCompanions || 1,
      qrCodeUrl: this.guestQrUrl || '',
      headline: this.invitation.content.headline || 'Invitación Digital',
      subheadline: this.invitation.content.subheadline || 'Pase de Entrada VIP',
      eventDateFormatted: this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
      locationAddress: this.invitation.content.locations?.[0]?.address || this.invitation.content.locations?.[0]?.name,
      dressCode: this.invitation.content.dressCode,
      brandLogoUrl: this.invitation.content.brandLogoUrl,
      coverImageUrl: this.invitation.content.coverImageUrl,
      primaryColor: this.invitation.content.palette?.primary,
      accentColor: this.invitation.content.palette?.accent
    });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(passHtml);
      printWin.document.close();
    }
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

  copyText(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`¡${label} copiado al portapapeles!`);
    }).catch(() => {
      this.showToast(`No se pudo copiar ${label}`);
    });
  }

  openLightbox(url: string): void {
    this.activeLightboxImage = url;
  }

  closeLightbox(): void {
    this.activeLightboxImage = null;
  }

  shareWhatsApp(): void {
    const text = encodeURIComponent(`¡Te invito a mi evento! Abre nuestra invitación digital aquí: ${this.publicInvitationUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = '';
      }
    }, 3500);
  }

  get currentTemplate(): string {
    return (this.invitation?.content as any)?.template || this.invitation?.template || 'envelope-cards';
  }

  isEnvelopeCardsTemplate(): boolean {
    const t = this.currentTemplate;
    return t === 'envelope-cards' || t === 'mobile-cards' || t === 'envelope';
  }

  get requiresGuestValidation(): boolean {
    return this.invitation?.accessMode === 'guest_list' || this.invitation?.accessMode === 'specific_users';
  }

  get isGuestList(): boolean {
    return this.requiresGuestValidation;
  }

  get maxCompanions(): number | null {
    if (this.verifiedGuest) return this.verifiedGuest.allowedCompanions;
    const settings = this.invitation?.rsvpSettings;
    return settings?.allowCompanionsDefault ? Number(settings.defaultAllowedCompanions || 0) : 0;
  }

  get canIdentifyByEmail(): boolean {
    const methods = this.invitation?.rsvpSettings?.identityMethods || ['email', 'phone'];
    return methods.includes('email');
  }

  get canIdentifyByPhone(): boolean {
    const methods = this.invitation?.rsvpSettings?.identityMethods || ['email', 'phone'];
    return methods.includes('phone');
  }

  sectionEnabled(section: keyof NonNullable<InvitationModel['content']['sectionSettings']>): boolean {
    return this.invitation?.content.sectionSettings?.[section] !== false;
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
    return deadline ? new Date(deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
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
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}` : '';
  }

  get publicQrUrl(): string {
    return this.publicInvitationUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.publicInvitationUrl)}` : '';
  }

  get publicInvitationUrl(): string {
    return this.invitation ? `${window.location.origin}/new/i/${this.invitation.slug}` : '';
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

  getItineraryIcon(title?: string): string {
    const t = (title || '').toLowerCase();
    if (t.includes('misa') || t.includes('ceremonia') || t.includes('religios')) return '💒';
    if (t.includes('recep') || t.includes('cóctel') || t.includes('coctel') || t.includes('bienvenida')) return '🍸';
    if (t.includes('cena') || t.includes('comida') || t.includes('banquete')) return '🍽️';
    if (t.includes('baile') || t.includes('fiesta') || t.includes('party') || t.includes('vals')) return '💃';
    if (t.includes('pastel') || t.includes('brindis')) return '🥂';
    return '✨';
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
        this.success = `¡Hola ${guest.name}! Tu pase personalizado está listo.`;
        this.checkingGuest = false;
      },
      error: () => {
        this.checkingGuest = false;
      }
    });
  }
}
