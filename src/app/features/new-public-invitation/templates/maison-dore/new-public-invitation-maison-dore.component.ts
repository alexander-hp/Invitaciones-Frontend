import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, AfterViewInit, OnDestroy, Output, NgZone, ViewChild, ElementRef } from '@angular/core';
import * as AOS from 'aos';
import * as confettiNamespace from 'canvas-confetti';
const confetti: any = (confettiNamespace as any).default || confettiNamespace;
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
  selector: 'app-new-public-invitation-maison-dore',
  templateUrl: './new-public-invitation-maison-dore.component.html',
  styleUrls: ['./new-public-invitation-maison-dore.component.css']
})
export class NewPublicInvitationMaisonDoreComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  // Base URL for all assets (swappable for AWS S3 URL)
  readonly assetBaseUrl = '/assets/templates/maison-dore/';

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

  @ViewChild('envelopeVideo') envelopeVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('introVideo') introVideoRef?: ElementRef<HTMLVideoElement>;

  // Video envelope & opening flow
  envelopeStage: 'idle' | 'playing_envelope' | 'playing_intro' | 'fading' | 'opened' = 'idle';
  introOverlayVisible = true;
  introVideoStarted = false;
  heroTextVisible = false;

  guestAccessSingleInput = '';
  copiedClabe = false;
  copiedAccount = false;
  selectedAlbumFile?: File;
  dedication = { publicName: '', message: '', type: 'dedication' };
  rsvpConfirmedAttending = true;

  headlineCouple: { partner1: string; partner2: string } = { partner1: '', partner2: '' };

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.updateHeadlineCouple();
    if (this.verifiedGuest) {
      this.envelopeStage = 'opened';
      this.introOverlayVisible = false;
      this.heroTextVisible = true;
      if (this.verifiedGuest.name && !this.rsvp.name) this.rsvp.name = this.verifiedGuest.name;
      if (this.verifiedGuest.email && !this.rsvp.email) this.rsvp.email = this.verifiedGuest.email;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['invitation'] || changes['event']) {
      this.updateHeadlineCouple();
    }
    if (changes['verifiedGuest'] && this.verifiedGuest) {
      this.envelopeStage = 'opened';
      this.introOverlayVisible = false;
      this.heroTextVisible = true;
      if (this.verifiedGuest.name && !this.rsvp.name) this.rsvp.name = this.verifiedGuest.name;
      if (this.verifiedGuest.email && !this.rsvp.email) this.rsvp.email = this.verifiedGuest.email;
    }
    if (changes['success'] && this.success) {
      this.triggerCelebrationConfetti();
    }
  }

  private timeUpdateListeners: Array<() => void> = [];

  ngAfterViewInit(): void {
    try {
      AOS.init({ duration: 900, once: true, offset: 40 });
    } catch (e) {
      console.warn('[MaisonDore] AOS error:', e);
    }
    this.setupVideoListenersOutsideAngular();
  }

  ngOnDestroy(): void {
    this.timeUpdateListeners.forEach(cleanup => cleanup());
    this.timeUpdateListeners = [];
  }

  private setupVideoListenersOutsideAngular(): void {
    this.ngZone.runOutsideAngular(() => {
      const envVid = this.envelopeVideoRef?.nativeElement;
      if (envVid) {
        const onEnvUpdate = () => {
          const duration = envVid.duration || 0;
          if (duration > 0 && envVid.currentTime >= duration - 0.6 && this.envelopeStage === 'playing_envelope') {
            this.ngZone.run(() => this.transitionToIntroVideo());
          }
        };
        envVid.addEventListener('timeupdate', onEnvUpdate);
        this.timeUpdateListeners.push(() => envVid.removeEventListener('timeupdate', onEnvUpdate));
      }

      const introVid = this.introVideoRef?.nativeElement;
      if (introVid) {
        const onIntroUpdate = () => {
          if (introVid.currentTime >= 2.0 && !this.heroTextVisible) {
            this.ngZone.run(() => this.heroTextVisible = true);
          }
          const duration = introVid.duration || 0;
          if (duration > 0 && introVid.currentTime >= duration - 1.0 && this.envelopeStage === 'playing_intro') {
            this.ngZone.run(() => {
              this.envelopeStage = 'fading';
              setTimeout(() => this.finishOpening(), 1200);
            });
          }
        };
        introVid.addEventListener('timeupdate', onIntroUpdate);
        this.timeUpdateListeners.push(() => introVid.removeEventListener('timeupdate', onIntroUpdate));
      }
    });
  }

  // ================= Envelope & Intro Video Handling =================
  startOpeningSequence(): void {
    if (this.envelopeStage !== 'idle') return;
    this.envelopeStage = 'playing_envelope';

    // Emite inicio de música de fondo
    if (!this.isPlayingMusic) {
      this.toggleMusicOutput.emit();
    }

    const envVid = this.envelopeVideoRef?.nativeElement;
    if (envVid) {
      envVid.currentTime = 0;
      envVid.play().catch(err => {
        console.warn('Autoplay error on envelope video, skipping to intro:', err);
        this.transitionToIntroVideo();
      });
    } else {
      this.transitionToIntroVideo();
    }
  }

  onEnvelopeVideoEnded(): void {
    if (this.envelopeStage === 'playing_envelope') {
      this.transitionToIntroVideo();
    }
  }

  transitionToIntroVideo(): void {
    this.envelopeStage = 'playing_intro';
    const introVid = this.introVideoRef?.nativeElement;
    if (introVid) {
      introVid.currentTime = 0;
      introVid.play().catch(err => {
        console.warn('Intro video error, skipping to opened:', err);
        this.finishOpening();
      });
    } else {
      this.finishOpening();
    }
  }

  onIntroVideoEnded(): void {
    this.finishOpening();
  }

  finishOpening(): void {
    this.envelopeStage = 'opened';
    this.heroTextVisible = true;
    setTimeout(() => {
      this.introOverlayVisible = false;
      try {
        AOS.refresh();
      } catch (e) {}
    }, 600);
  }

  skipIntro(): void {
    const envVid = this.envelopeVideoRef?.nativeElement;
    if (envVid) envVid.pause();
    const introVid = this.introVideoRef?.nativeElement;
    if (introVid) introVid.pause();
    this.finishOpening();
    if (!this.isPlayingMusic) {
      this.toggleMusicOutput.emit();
    }
  }

  // ================= UI Helpers & Actions =================
  get requiresGuestValidation(): boolean {
    return Boolean((this.invitation?.accessMode === 'guest_list' || this.invitation?.accessMode === 'specific_users') && !this.verifiedGuest);
  }

  get guestQrUrl(): string {
    const value = this.verifiedGuest?.checkInCode || (this.verifiedGuest as any)?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(value)}` : '';
  }

  validateAndOpenPrivateEnvelope(): void {
    if (!this.guestAccessSingleInput.trim()) return;
    const val = this.guestAccessSingleInput.trim();
    const isEmail = val.includes('@');
    this.verifyGuestAccessOutput.emit({
      email: isEmail ? val : '',
      phone: isEmail ? '' : val
    });
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  triggerCelebrationConfetti(): void {
    try {
      this.ngZone.runOutsideAngular(() => {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#c49a6c', '#dfba87', '#fdfbf7', '#ffd700', '#b38749']
        });
      });
    } catch (e) {}
  }

  copyToClipboard(text?: string, type: 'clabe' | 'account' = 'clabe'): void {
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

  getGoogleMapsUrl(loc?: InvitationLocation): string {
    if (!loc) return 'https://maps.google.com';
    if (loc.mapUrl) return loc.mapUrl;
    if (loc.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
    return 'https://maps.google.com';
  }

  getWazeUrl(loc?: InvitationLocation): string {
    if (!loc) return '';
    if (loc.wazeUrl) return loc.wazeUrl;
    if (loc.address) return `https://waze.com/ul?q=${encodeURIComponent(loc.address)}`;
    return '';
  }

  onRsvpResponseChange(res: RsvpResponse): void {
    this.rsvp.response = res;
    this.rsvpConfirmedAttending = (res === 'confirmed');
  }

  submitRsvpForm(): void {
    this.submitRsvpOutput.emit();
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedAlbumFile = file;
      this.uploadPhotoOutput.emit(file);
    }
  }

  sendDedication(): void {
    if (!this.dedication.message.trim()) return;
    this.submitDedicationOutput.emit({
      publicName: this.dedication.publicName.trim() || 'Invitado',
      message: this.dedication.message.trim(),
      type: this.dedication.type
    });
    this.dedication.message = '';
  }

  onSongSearchInput(): void {
    if (this.songSearchQuery.trim().length >= 2) {
      this.searchSongOutput.emit(this.songSearchQuery.trim());
    }
  }

  onSelectSong(song: any): void {
    this.selectSongOutput.emit(song);
  }

  sendSongRequest(): void {
    this.requestSongOutput.emit();
  }

  openPassLightbox(): void {
    const url = this.guestQrUrl;
    if (url) {
      this.openLightboxOutput.emit(url);
    }
  }

  updateHeadlineCouple(): void {
    const headline = this.invitation?.content?.headline || this.event?.title || 'Diana & Richard';
    const parts = headline.split('&');
    if (parts.length === 2) {
      this.headlineCouple = { partner1: parts[0].trim(), partner2: parts[1].trim() };
    } else {
      this.headlineCouple = { partner1: headline, partner2: '' };
    }
  }

  shareWhatsApp(): void {
    const title = this.invitation?.content?.headline || this.event?.title || 'Nuestra Boda';
    const text = encodeURIComponent(`¡Estás cordialmente invitado(a) a nuestra boda: ${title}! Consulta los detalles aquí: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  saveCalendar(): void {
    if (!this.event?.date) return;
    const dateObj = new Date(this.event.date);
    const title = encodeURIComponent(this.invitation?.content?.headline || this.event?.title || 'Boda');
    const details = encodeURIComponent(this.invitation?.content?.subheadline || 'Celebración de Boda');
    const location = encodeURIComponent(this.invitation?.content?.locations?.[0]?.address || 'Lugar del evento');
    
    const startIso = dateObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDate = new Date(dateObj.getTime() + (5 * 60 * 60 * 1000));
    const endIso = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  }
}
