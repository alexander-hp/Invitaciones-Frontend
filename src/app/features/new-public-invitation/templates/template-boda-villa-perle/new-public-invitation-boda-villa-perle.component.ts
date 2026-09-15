import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, AfterViewInit, OnDestroy, Output, NgZone } from '@angular/core';
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
  selector: 'app-new-public-invitation-boda-villa-perle',
  templateUrl: './new-public-invitation-boda-villa-perle.component.html',
  styleUrls: ['./new-public-invitation-boda-villa-perle.component.css']
})
export class NewPublicInvitationBodaVillaPerleComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
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
  envelopeOpened = false;
  copiedClabe = false;
  copiedAccount = false;
  selectedAlbumFile?: File;
  dedication = { publicName: '', message: '', type: 'dedication' };

  // Video Intro State
  hasVideoIntro = true;
  introStarted = false;
  introFinished = false;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    if (!this.requiresGuestValidation || this.verifiedGuest) {
      this.envelopeOpened = true;
    }
    if (this.verifiedGuest) {
      this.rsvp.name = this.verifiedGuest.name || '';
      if (this.verifiedGuest.email) this.rsvp.email = this.verifiedGuest.email;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['verifiedGuest'] && this.verifiedGuest) {
      this.envelopeOpened = true;
      if (this.verifiedGuest.name && !this.rsvp.name) this.rsvp.name = this.verifiedGuest.name;
      if (this.verifiedGuest.email && !this.rsvp.email) this.rsvp.email = this.verifiedGuest.email;
    }
  }

  ngAfterViewInit(): void {
    try {
      AOS.init({ duration: 800, once: true, offset: 40 });
    } catch (e) {}

    try {
      gsap.fromTo(
        '.perle-wax-seal',
        { scale: 0.96, boxShadow: '0 4px 15px rgba(194, 166, 136, 0.4)' },
        { scale: 1.04, boxShadow: '0 8px 25px rgba(216, 195, 165, 0.7)', repeat: -1, yoyo: true, duration: 2, ease: 'sine.inOut' }
      );
    } catch (e) {}
  }

  ngOnDestroy(): void {}

  startVideoIntro(): void {
    this.introStarted = true;
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        const video = document.getElementById('perle-intro-video') as HTMLVideoElement;
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {
            video.muted = true;
            video.play();
          });
        }
      }, 50);
    });
    if (!this.isPlayingMusic) {
      this.toggleMusicOutput.emit();
    }
  }

  onVideoEnded(): void {
    this.introFinished = true;
    try {
      AOS.refresh();
    } catch (e) {}
  }

  skipIntro(): void {
    const video = document.getElementById('perle-intro-video') as HTMLVideoElement;
    if (video) video.pause();
    this.introFinished = true;
    try {
      AOS.refresh();
    } catch (e) {}
  }

  triggerCelebrationConfetti(): void {
    try {
      this.ngZone.runOutsideAngular(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#c2a688', '#d8c3a5', '#f7f3ee', '#ffffff', '#e6d5be']
        });
      });
    } catch (e) {}
  }

  get requiresGuestValidation(): boolean {
    return !!((this.invitation?.accessMode === 'guest_list' || this.invitation?.accessMode === 'specific_users') && !this.verifiedGuest);
  }

  onOpenEnvelope(): void {
    if (!this.requiresGuestValidation) {
      this.envelopeOpened = true;
      this.triggerCelebrationConfetti();
      return;
    }
    const val = this.guestAccessSingleInput.trim();
    if (!val) return;
    const isEmail = val.includes('@');
    this.verifyGuestAccessOutput.emit({
      email: isEmail ? val : '',
      phone: !isEmail ? val : ''
    });
  }

  get displayLocations(): InvitationLocation[] {
    const content = this.invitation?.content;
    if (content?.locations && content.locations.length > 0) {
      return content.locations;
    }
    if (this.event?.venue) {
      return [{
        type: 'Recepción y Ceremonia',
        name: this.event.venue.name || 'Lugar del Evento',
        address: this.event.venue.address || '',
        mapUrl: this.event.venue.mapUrl || ''
      }];
    }
    return [];
  }

  isSectionActive(sectionKey: string): boolean {
    const s = this.invitation?.content?.sectionSettings as Record<string, boolean> | undefined;
    if (!s) return true;
    return s[sectionKey] !== false;
  }

  hasSectionMusic(sectionKey: string): boolean {
    if (!this.invitation) return false;
    const specific = this.getSectionSpecificMusicUrl(sectionKey);
    return Boolean(specific || this.invitation.content?.musicUrl);
  }

  getSectionSpecificMusicUrl(sectionKey: string): string {
    const sm = this.invitation?.content?.sectionMusic as any;
    if (sm && typeof sm === 'object' && sm[sectionKey]) {
      return sm[sectionKey];
    }
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

  toggleGlobalMusic(): void {
    this.toggleMusicOutput.emit();
  }

  onSubmitRsvp(): void {
    if (!this.rsvp.name.trim()) return;
    this.submitRsvpOutput.emit();
    if (this.rsvp.response === 'confirmed') {
      this.triggerCelebrationConfetti();
    }
  }

  onSubmitDedication(): void {
    if (!this.dedication.publicName.trim() || !this.dedication.message.trim()) return;
    this.submitDedicationOutput.emit({
      publicName: this.dedication.publicName.trim(),
      message: this.dedication.message.trim(),
      type: this.dedication.type
    });
    this.dedication.message = '';
    this.triggerCelebrationConfetti();
  }

  onAlbumFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedAlbumFile = file;
    }
  }

  uploadSelectedPhoto(): void {
    if (!this.selectedAlbumFile) return;
    this.uploadPhotoOutput.emit(this.selectedAlbumFile);
    this.selectedAlbumFile = undefined;
    this.triggerCelebrationConfetti();
  }

  openLightbox(url: string): void {
    this.openLightboxOutput.emit(url);
  }

  onSearchSong(): void {
    if (!this.songSearchQuery.trim()) return;
    this.searchSongOutput.emit(this.songSearchQuery.trim());
  }

  onSelectSong(song: any): void {
    this.selectSongOutput.emit(song);
  }

  onSubmitSongRequest(): void {
    this.requestSongOutput.emit();
  }

  copyText(text: string | undefined, type: 'clabe' | 'account'): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'clabe') {
        this.copiedClabe = true;
        setTimeout(() => this.copiedClabe = false, 2500);
      } else {
        this.copiedAccount = true;
        setTimeout(() => this.copiedAccount = false, 2500);
      }
    });
  }

  getStoreLogo(item: any): string | null {
    const store = (item.store || item.title || '').toLowerCase();
    if (store.includes('liverpool')) return 'https://assetspwa.liverpool.com.mx/assets/images/logos/liverpool-logo.svg';
    if (store.includes('amazon')) return 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg';
    if (store.includes('palacio')) return 'https://upload.wikimedia.org/wikipedia/commons/4/44/El_Palacio_de_Hierro_logo.svg';
    if (store.includes('sears')) return 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Sears_logo_%282019%29.svg';
    if (store.includes('mercado')) return 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__large_plus.png';
    return item.imageUrl || null;
  }

  getCustomAnswer(question: RsvpCustomQuestion): string | boolean {
    const key = this.getQuestionKey(question);
    const val = this.customAnswers[key];
    if (val !== undefined) return val;
    return question.type === 'boolean' ? false : '';
  }

  setCustomAnswer(question: RsvpCustomQuestion, value: any): void {
    const key = this.getQuestionKey(question);
    this.customAnswers[key] = value;
  }

  getQuestionKey(question: RsvpCustomQuestion): string {
    return question.key || question.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  getTimelineIcon(item: any): string {
    const title = (item.title || '').toLowerCase();
    if (title.includes('ceremonia') || title.includes('iglesia') || title.includes('misa')) return 'church';
    if (title.includes('recep') || title.includes('bienvenida')) return 'cocktail';
    if (title.includes('cena') || title.includes('banquete') || title.includes('comida')) return 'utensils';
    if (title.includes('brindis') || title.includes('pastel')) return 'glass';
    if (title.includes('vals') || title.includes('baile')) return 'music';
    if (title.includes('fiesta') || title.includes('dj') || title.includes('trasnochador')) return 'sparkles';
    return 'clock';
  }

  addToGoogleCalendar(): void {
    const dateStr = this.event?.date;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const start = d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(d.getTime() + 4 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(this.event?.title || 'Nuestra Boda');
    const details = encodeURIComponent(this.invitation?.content?.message || 'Acompáñanos a celebrar nuestra boda');
    const loc = encodeURIComponent(this.displayLocations[0]?.address || '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${loc}`;
    window.open(url, '_blank');
  }

  shareOnWhatsApp(): void {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`¡Estás cordialmente invitado a celebrar nuestra boda! Descubre los detalles aquí: `);
    window.open(`https://api.whatsapp.com/send?text=${text}${url}`, '_blank');
  }
}
