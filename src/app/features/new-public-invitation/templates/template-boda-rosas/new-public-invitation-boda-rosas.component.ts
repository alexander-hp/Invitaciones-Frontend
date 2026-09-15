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
  selector: 'app-new-public-invitation-boda-rosas',
  templateUrl: './new-public-invitation-boda-rosas.component.html',
  styleUrls: ['./new-public-invitation-boda-rosas.component.css']
})
export class NewPublicInvitationBodaRosasComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
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

  // Video Intro State (Flores & Rosas Delicadas)
  hasVideoIntro = true;
  introStarted = false;
  introFinished = false;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    if (!this.requiresGuestValidation || this.verifiedGuest) {
      this.envelopeOpened = true;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['verifiedGuest'] && this.verifiedGuest) {
      this.envelopeOpened = true;
      if (!this.rsvp.name && this.verifiedGuest.name) {
        this.rsvp.name = this.verifiedGuest.name;
      }
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        try {
          AOS.init({
            duration: 900,
            easing: 'ease-out-cubic',
            once: true,
            offset: 40
          });
        } catch (e) {
          console.warn('AOS init warning', e);
        }
      }, 300);
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  // --- INTRO VIDEO LOGIC ---
  startVideoIntro(): void {
    this.introStarted = true;
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        const video = document.getElementById('rosas-intro-video') as HTMLVideoElement;
        if (video) {
          video.currentTime = 0;
          video.play().catch(err => {
            console.log('Autoplay blocked or user paused:', err);
          });
        }
      }, 50);
    });

    if (!this.isPlayingMusic) {
      this.toggleGlobalMusic();
    }
  }

  skipIntro(): void {
    const overlay = document.querySelector('.rosas-video-intro-overlay');
    if (overlay) {
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => {
          this.ngZone.run(() => {
            this.introFinished = true;
          });
        }
      });
    } else {
      this.introFinished = true;
    }
  }

  onVideoEnded(): void {
    this.skipIntro();
  }

  // --- AUDIO LOGIC ---
  toggleGlobalMusic(): void {
    this.toggleMusicOutput.emit();
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

  // --- VIP ACCESS / ENVELOPE LOGIC ---
  get requiresGuestValidation(): boolean {
    return !!((this.invitation?.accessMode === 'guest_list' || this.invitation?.accessMode === 'specific_users') && !this.verifiedGuest);
  }

  onOpenEnvelope(): void {
    if (!this.requiresGuestValidation) {
      this.envelopeOpened = true;
      return;
    }

    const val = (this.guestAccessSingleInput || '').trim();
    if (!val) {
      this.error = 'Por favor ingresa tu correo o teléfono.';
      return;
    }

    const isEmail = val.includes('@');
    this.verifyGuestAccessOutput.emit({
      email: isEmail ? val : '',
      phone: !isEmail ? val : ''
    });
  }

  // --- RSVP LOGIC ---
  onSubmitRsvp(): void {
    if (this.rsvp.response === 'confirmed') {
      this.triggerConfetti();
    }
    this.submitRsvpOutput.emit();
  }

  triggerConfetti(): void {
    this.ngZone.runOutsideAngular(() => {
      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e8a598', '#d47a83', '#fcedea', '#c48b71', '#d4af37']
        });
      } catch (err) {
        console.warn('Confetti error', err);
      }
    });
  }

  getQuestionKey(q: RsvpCustomQuestion): string {
    return q.key || q.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  getCustomAnswer(q: RsvpCustomQuestion): any {
    return this.customAnswers[this.getQuestionKey(q)] ?? '';
  }

  setCustomAnswer(q: RsvpCustomQuestion, val: any): void {
    this.customAnswers[this.getQuestionKey(q)] = val;
  }

  // --- DEDICATIONS ---
  onSubmitDedication(): void {
    if (!this.dedication.publicName.trim() || !this.dedication.message.trim()) return;
    this.submitDedicationOutput.emit({
      publicName: this.dedication.publicName,
      message: this.dedication.message,
      type: 'dedication'
    });
    this.dedication.message = '';
  }

  // --- ALBUM COLECTIVO ---
  onAlbumFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedAlbumFile = file;
    }
  }

  uploadSelectedPhoto(): void {
    if (this.selectedAlbumFile) {
      this.uploadPhotoOutput.emit(this.selectedAlbumFile);
      this.selectedAlbumFile = undefined;
    }
  }

  // --- DJ SONG REQUESTS ---
  onSearchSong(): void {
    if (this.songSearchQuery.trim()) {
      this.searchSongOutput.emit(this.songSearchQuery.trim());
    }
  }

  onSelectSong(song: any): void {
    this.selectSongOutput.emit(song);
  }

  onSubmitSongRequest(): void {
    this.requestSongOutput.emit();
  }

  // --- HELPERS ---
  openLightbox(url: string): void {
    this.openLightboxOutput.emit(url);
  }

  copyText(val?: string, type: 'clabe' | 'account' = 'clabe'): void {
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      if (type === 'clabe') {
        this.copiedClabe = true;
        setTimeout(() => this.copiedClabe = false, 2500);
      } else {
        this.copiedAccount = true;
        setTimeout(() => this.copiedAccount = false, 2500);
      }
    });
  }

  addToGoogleCalendar(): void {
    if (!this.event?.date) return;
    const d = new Date(this.event.date);
    const startStr = d.toISOString().replace(/-|:|\.\d+/g, '');
    const end = new Date(d.getTime() + 5 * 60 * 60 * 1000);
    const endStr = end.toISOString().replace(/-|:|\.\d+/g, '');
    const title = encodeURIComponent(this.event.title || 'Nuestra Boda');
    const details = encodeURIComponent(this.invitation?.content?.message || 'Acompáñanos a celebrar nuestro gran día.');
    const loc = encodeURIComponent(this.displayLocations[0]?.address || this.event?.venue?.address || '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
    window.open(url, '_blank');
  }

  shareOnWhatsApp(): void {
    const text = encodeURIComponent(`¡Estás cordialmente invitado a nuestra boda! Accede a los detalles aquí: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  get displayLocations(): InvitationLocation[] {
    if (this.invitation?.content?.locations?.length) {
      return this.invitation.content.locations;
    }
    const venue = this.event?.venue;
    if (venue?.name || venue?.address) {
      return [{
        type: 'Ceremonia & Recepción',
        name: venue.name || '',
        address: venue.address || '',
        mapUrl: venue.mapUrl || ''
      }];
    }
    return [];
  }

  getStoreLogo(reg: any): string {
    if (reg.imageUrl) return reg.imageUrl;
    const store = (reg.store || '').toLowerCase();
    if (store.includes('liverpool')) return 'assets/giftTable/liverpool.png';
    if (store.includes('palacio')) return 'assets/giftTable/palacio.png';
    if (store.includes('amazon')) return 'assets/giftTable/amazon.png';
    if (store.includes('sears')) return 'assets/giftTable/sears.png';
    return '';
  }
}
