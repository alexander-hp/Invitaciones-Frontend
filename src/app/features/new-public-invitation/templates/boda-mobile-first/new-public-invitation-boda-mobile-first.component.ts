import { Component, EventEmitter, Input, OnInit, AfterViewInit, OnDestroy, Output, NgZone } from '@angular/core';
import * as AOS from 'aos';
import * as confettiNamespace from 'canvas-confetti';
const confetti: any = (confettiNamespace as any).default || confettiNamespace;
import { gsap } from 'gsap';
import {
  DedicationModel,
  EventModel,
  GuestAccessResponse,
  InvitationLocation,
  InvitationModel,
  RsvpCustomQuestion,
  RsvpResponse
} from '../../../../core/models';

@Component({
  selector: 'app-new-public-invitation-boda-mobile-first',
  templateUrl: './new-public-invitation-boda-mobile-first.component.html',
  styleUrls: ['./new-public-invitation-boda-mobile-first.component.css']
})
export class NewPublicInvitationBodaMobileFirstComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() invitation?: InvitationModel;
  @Input() event?: EventModel;
  @Input() countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false };
  @Input() verifiedGuest?: GuestAccessResponse['guest'];
  @Input() publicAlbumAssets: Array<{ url: string; uploaderName?: string; createdAt?: string }> = [];
  @Input() dedications: DedicationModel[] = [];
  @Input() isPlayingMusic = false;
  @Input() currentPlayingTrackUrl = '';
  @Input() currentActiveSection = 'hero';
  @Input() sending = false;
  @Input() checkingGuest = false;
  @Input() uploadingAlbum = false;
  @Input() error = '';
  @Input() success = '';
  @Input() dedicationMessage = '';
  @Input() albumMessage = '';
  @Input() rsvp = {
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
  @Input() companionNamesText = '';
  @Input() customAnswers: Record<string, string | boolean> = {};
  @Input() declineConfirmed = false;

  // DJ Song Requests inputs
  @Input() songSearchQuery = '';
  @Input() songSearchResults: Array<{ title: string; artist: string; sourceUrl: string; thumbnailUrl: string; previewUrl?: string }> = [];
  @Input() searchingSongs = false;
  @Input() songRequest = { title: '', artist: '', dedication: '', sourceUrl: '', thumbnailUrl: '' };
  @Input() songRequestSending = false;
  @Input() songRequestMessage = '';
  @Input() maxSongRequestsAllowed = 3;
  @Input() guestSubmittedSongsCount = 0;
  @Input() requireSongApproval = true;
  @Input() allowDedicationsEnabled = true;
  @Input() isOpeningVipEnvelope = false;
  @Input() guestAccessPhone = '';
  @Input() guestAccessEmail = '';

  @Output('toggleMusic') toggleMusicOutput = new EventEmitter<void>();
  @Output('toggleSectionMusic') toggleSectionMusicOutput = new EventEmitter<string>();
  @Output('verifyGuestAccess') verifyGuestAccessOutput = new EventEmitter<{ email: string; phone: string }>();
  @Output('submitRsvp') submitRsvpOutput = new EventEmitter<void>();
  @Output('submitDedication') submitDedicationOutput = new EventEmitter<{ publicName: string; message: string; type?: string }>();
  @Output('uploadPhoto') uploadPhotoOutput = new EventEmitter<File>();
  @Output('openLightbox') openLightboxOutput = new EventEmitter<string>();
  @Output('searchSong') searchSongOutput = new EventEmitter<string>();
  @Output('selectSong') selectSongOutput = new EventEmitter<any>();
  @Output('requestSong') requestSongOutput = new EventEmitter<void>();
  @Output('resetGuest') resetGuestOutput = new EventEmitter<void>();
  @Output('downloadPass') downloadPassOutput = new EventEmitter<void>();

  // Internal state
  guestAccessSingleInput = '';
  copiedClabe = false;
  copiedAccount = false;
  selectedAlbumFile?: File;
  dedication = { publicName: '', message: '', type: 'dedication' };

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    if (this.verifiedGuest) {
      this.rsvp.name = this.verifiedGuest.name || '';
      if (this.verifiedGuest.email) this.rsvp.email = this.verifiedGuest.email;
    }
  }

  ngAfterViewInit(): void {
    try {
      AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 40
      });
      setTimeout(() => {
        AOS.refresh();
      }, 500);
    } catch (err) {
      console.warn('AOS initialization error:', err);
    }

    try {
      gsap.fromTo(
        '.bmf-wax-seal',
        { scale: 0.95, boxShadow: '0 4px 15px rgba(184, 134, 11, 0.4)' },
        { scale: 1.05, boxShadow: '0 8px 25px rgba(212, 175, 55, 0.7)', repeat: -1, yoyo: true, duration: 1.8, ease: 'sine.inOut' }
      );
    } catch (e) {}
  }

  ngOnDestroy(): void {}

  triggerCelebrationConfetti(): void {
    try {
      this.ngZone.runOutsideAngular(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#c59b6c', '#d4af37', '#fbf8f1', '#e8d4b3', '#a77c38']
        });
        setTimeout(() => {
          confetti({
            particleCount: 45,
            angle: 60,
            spread: 55,
            origin: { x: 0.05, y: 0.7 },
            colors: ['#c59b6c', '#dfba87', '#ffd700']
          });
          confetti({
            particleCount: 45,
            angle: 120,
            spread: 55,
            origin: { x: 0.95, y: 0.7 },
            colors: ['#c59b6c', '#dfba87', '#ffd700']
          });
        }, 250);
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  validateAndOpenEnvelope(): void {
    if (!this.guestAccessSingleInput.trim()) return;
    const val = this.guestAccessSingleInput.trim();
    const isEmail = val.includes('@');
    this.triggerCelebrationConfetti();
    this.verifyGuestAccessOutput.emit({
      email: isEmail ? val : '',
      phone: isEmail ? '' : val
    });
  }

  shareWhatsApp(): void {
    if (!this.invitation) return;
    const title = this.invitation.content.headline || this.event?.title || 'Invitación de Boda';
    const text = encodeURIComponent(`¡Estás cordialmente invitado(a) a nuestra boda: ${title}! Consulta los detalles aquí: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  openLightbox(url: string): void {
    this.openLightboxOutput.emit(url);
  }

  downloadGuestPass(): void {
    this.downloadPassOutput.emit();
  }

  resetGuestAccess(): void {
    this.resetGuestOutput.emit();
  }

  toggleMusic(): void {
    this.toggleMusicOutput.emit();
  }

  hasMusicTrack(): boolean {
    return Boolean(this.invitation?.content?.musicUrl || this.currentPlayingTrackUrl);
  }

  isSectionActive(key: string): boolean {
    if (!this.invitation) return false;
    const settings = this.invitation.content?.sectionSettings;
    if (key === 'songRequests' || key === 'dj') {
      if (settings && (settings as any).songRequests === false) return false;
      return Boolean(this.event?.externalContent?.songRequestSettings?.enabled !== false);
    }
    if (!settings) return true;
    return (settings as any)[key] !== false;
  }

  hasSectionMusic(sectionKey: string): boolean {
    if (!this.invitation) return false;
    const specific = this.getSectionSpecificMusicUrl(sectionKey);
    return Boolean(specific || this.invitation.content?.musicUrl);
  }

  getSectionSpecificMusicUrl(sectionKey: string): string {
    const list = (this.invitation?.content as any)?.sectionMusicList || [];
    const item = list.find((m: any) => m.sectionKey === sectionKey);
    return (item && item.audioUrl) ? item.audioUrl : '';
  }

  getAudioUrlForSection(sectionKey: string): string {
    const specific = this.getSectionSpecificMusicUrl(sectionKey);
    if (specific) return specific;
    return this.invitation?.content?.musicUrl || '';
  }

  isSectionMusicPlaying(sectionKey: string): boolean {
    if (!this.isPlayingMusic) return false;
    const targetUrl = this.getSectionSpecificMusicUrl(sectionKey) || this.getAudioUrlForSection(sectionKey);
    return Boolean(targetUrl && this.currentPlayingTrackUrl === targetUrl);
  }

  toggleSectionMusic(sectionKey: string): void {
    this.toggleSectionMusicOutput.emit(sectionKey);
  }

  get displayLocations(): InvitationLocation[] {
    const contentLocations = this.invitation?.content?.locations || [];
    if (contentLocations.length) return contentLocations;
    const venue = this.event?.venue;
    if (!venue?.name && !venue?.address && !venue?.mapUrl) return [];
    return [{ type: 'principal', name: venue.name || 'Lugar de la Celebración', address: venue.address || '', mapUrl: venue.mapUrl || '' }];
  }

  getItineraryIconKey(title?: string): string {
    const t = (title || '').toLowerCase();
    if (t.includes('misa') || t.includes('ceremonia') || t.includes('religios')) return 'church';
    if (t.includes('recep') || t.includes('cóctel') || t.includes('coctel') || t.includes('bienvenida')) return 'cocktail';
    if (t.includes('cena') || t.includes('comida') || t.includes('banquete')) return 'dinner';
    if (t.includes('baile') || t.includes('fiesta') || t.includes('party') || t.includes('vals')) return 'party';
    if (t.includes('pastel') || t.includes('brindis')) return 'toast';
    return 'clock';
  }

  get guestQrUrl(): string {
    const value = this.verifiedGuest?.checkInCode || this.verifiedGuest?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(value)}` : '';
  }

  get guestAttendanceStatus(): string {
    const s = (this.verifiedGuest as any)?.rsvpStatus;
    if (s === 'confirmed') return 'Confirmado';
    if (s === 'declined') return 'Declinado';
    return 'VIP Validado';
  }

  get publicQrUrl(): string {
    return this.publicInvitationUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(this.publicInvitationUrl)}` : '';
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

  get requiresGuestValidation(): boolean {
    return this.invitation?.accessMode === 'guest_list' || this.invitation?.accessMode === 'specific_users';
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

  get dedicationSettings() {
    return this.invitation?.content?.dedicationSettings || this.event?.externalContent?.dedicationSettings;
  }

  get dedicationIntroText(): string {
    return this.dedicationSettings?.introText || '';
  }

  getGuestSubmittedSongCount(): number {
    const slug = this.invitation?.slug;
    if (!slug || typeof localStorage === 'undefined') return this.guestSubmittedSongsCount;
    try {
      const guestKey = this.verifiedGuest?.id || (this.verifiedGuest as any)?._id || this.verifiedGuest?.email || 'anon';
      const stored = localStorage.getItem(`song_req_list_${slug}_${guestKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return Math.max(parsed.length, this.guestSubmittedSongsCount);
      }
    } catch (e) { }
    return this.guestSubmittedSongsCount;
  }

  get songRequestsLimitReached(): boolean {
    return this.getGuestSubmittedSongCount() >= this.maxSongRequestsAllowed;
  }

  getStoreLogo(registry: any): string {
    if (!registry) return '';
    const img = (registry.imageUrl || '').trim();
    if (img && !img.startsWith('data:image/svg') && !img.includes('assets/giftTable/')) {
      return img;
    }
    const storeLower = (registry.store || registry.title || '').toLowerCase().trim();
    if (storeLower.includes('liverpool')) return '/assets/giftTable/liverpool-logo.jpg';
    if (storeLower.includes('palacio')) return '/assets/giftTable/palacio-logo.png';
    if (storeLower.includes('sears')) return '/assets/giftTable/sears_logo.jpg';
    if (storeLower.includes('uniko') || storeLower.includes('efectivo')) return '/assets/giftTable/logo_uniko.webp';
    if (storeLower.includes('amazon')) return '/assets/giftTable/logo-amazon.png';
    if (storeLower.includes('mercado')) return '/assets/giftTable/mercado-libre-logo.png';
    return img;
  }

  copyText(text?: string, type?: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.triggerCelebrationConfetti();
      if (type === 'clabe') {
        this.copiedClabe = true;
        setTimeout(() => this.copiedClabe = false, 2500);
      } else if (type === 'account') {
        this.copiedAccount = true;
        setTimeout(() => this.copiedAccount = false, 2500);
      }
    });
  }

  selectAlbumFile(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) {
      this.selectedAlbumFile = file;
    }
  }

  uploadAlbumPhoto(): void {
    if (this.selectedAlbumFile) {
      this.uploadPhotoOutput.emit(this.selectedAlbumFile);
      this.selectedAlbumFile = undefined;
    }
  }

  submitDedication(): void {
    if (!this.dedication.message.trim()) return;
    this.triggerCelebrationConfetti();
    this.submitDedicationOutput.emit({
      publicName: this.dedication.publicName.trim() || this.verifiedGuest?.name || this.rsvp.name || 'Invitado',
      message: this.dedication.message.trim(),
      type: this.dedication.type || 'dedication'
    });
    this.dedication.message = '';
  }

  searchSongForRequest(): void {
    this.searchSongOutput.emit(this.songSearchQuery);
  }

  selectSongFromSearch(song: any): void {
    this.selectSongOutput.emit(song);
  }

  submitSongRequest(): void {
    this.requestSongOutput.emit();
  }

  submit(): void {
    if (this.isFinalAttendance) {
      this.triggerCelebrationConfetti();
    }
    this.submitRsvpOutput.emit();
  }

  onResponseChange(): void {
    if (this.rsvp.response === 'declined' && this.requiresDeclineConfirmation) {
      this.declineConfirmed = false;
    }
  }
}
