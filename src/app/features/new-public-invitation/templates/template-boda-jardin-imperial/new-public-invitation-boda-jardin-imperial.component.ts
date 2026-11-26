import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  AfterViewInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
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

interface PollenParticle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

@Component({
  selector: 'app-new-public-invitation-boda-jardin-imperial',
  templateUrl: './new-public-invitation-boda-jardin-imperial.component.html',
  styleUrls: ['./new-public-invitation-boda-jardin-imperial.component.css']
})
export class NewPublicInvitationBodaJardinImperialComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('pollenCanvas') pollenCanvasRef?: ElementRef<HTMLCanvasElement>;

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

  // Gatefold & UI state
  guestAccessSingleInput = '';
  gatefoldOpened = false;
  gatefoldAnimating = false;
  scrollProgress = 0;
  activeNavChapter = 'ji-hero';
  copiedClabe = false;
  copiedAccount = false;
  selectedAlbumFile?: File;
  dedication = { publicName: '', message: '', type: 'dedication' };

  readonly dressPaletteSwatches = [
    { name: 'Verde Ciprés', hex: '#1E3528' },
    { name: 'Salvia Celadón', hex: '#7D9683' },
    { name: 'Bronce Champagne', hex: '#B68B3A' },
    { name: 'Piedra Travertino', hex: '#C9BFA9' },
    { name: 'Espresso Noche', hex: '#2A2520' }
  ];

  private animFrameId: number | null = null;
  private resizeListener?: () => void;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    const inPreviewOrIframe = this.isEditorOrPreviewContext();
    if (inPreviewOrIframe || this.verifiedGuest) {
      this.gatefoldOpened = true;
    } else if (!this.requiresGuestValidation) {
      // Allow interactive French conservatory gatefold unveiling for public visitors
      this.gatefoldOpened = false;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['verifiedGuest'] && this.verifiedGuest) {
      this.triggerGatefoldOpen();
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
            duration: 850,
            easing: 'ease-out-cubic',
            once: true,
            offset: 36
          });
        } catch (e) {
          // AOS optional fallback
        }
        this.initPollenCanvas();
      }, 220);
    });
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.resizeListener && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.scrollProgress = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));

    const chapters = ['ji-hero', 'ji-story', 'ji-locations', 'ji-itinerary', 'ji-rsvp', 'ji-gifts', 'ji-gallery', 'ji-community'];
    for (let i = chapters.length - 1; i >= 0; i--) {
      const el = document.getElementById(chapters[i]);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 220) {
          this.activeNavChapter = chapters[i];
          break;
        }
      }
    }
  }

  private isEditorOrPreviewContext(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const search = window.location.search || '';
      if (search.includes('preview=true') || search.includes('clean=1') || search.includes('editTexts=1')) {
        return true;
      }
      if (window.self !== window.top) {
        return true;
      }
    } catch {
      return true;
    }
    return false;
  }

  private initPollenCanvas(): void {
    const canvas = this.pollenCanvasRef?.nativeElement;
    if (!canvas || typeof window === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent ? parent.clientWidth : window.innerWidth;
      canvas.height = parent ? parent.clientHeight : window.innerHeight;
    };
    resize();
    this.resizeListener = resize;
    window.addEventListener('resize', resize, { passive: true });

    const count = 34;
    const particles: PollenParticle[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1.2 + Math.random() * 2.6,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -0.14 - Math.random() * 0.28,
      alpha: 0.2 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2
    }));

    let tick = 0;
    const render = () => {
      tick += 0.015;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Soft diagonal conservatory sunbeams
      const grad = ctx.createLinearGradient(0, 0, canvas.width * 0.75, canvas.height * 0.85);
      grad.addColorStop(0, 'rgba(235, 208, 138, 0.14)');
      grad.addColorStop(0.5, 'rgba(235, 208, 138, 0.04)');
      grad.addColorStop(1, 'rgba(235, 208, 138, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx + Math.sin(tick + p.phase) * 0.18;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        const glow = p.alpha * (0.65 + 0.35 * Math.sin(tick * 2 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 154, 69, ${glow.toFixed(3)})`;
        ctx.fill();
      }

      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  scrollToChapter(chapterId: string): void {
    this.activeNavChapter = chapterId;
    if (typeof document === 'undefined') return;
    const target = document.getElementById(chapterId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  replayGatefold(): void {
    if (this.requiresGuestValidation && !this.verifiedGuest) return;
    this.gatefoldOpened = false;
    this.gatefoldAnimating = false;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private triggerGatefoldOpen(): void {
    if (this.gatefoldOpened) return;
    this.gatefoldAnimating = true;
    setTimeout(() => {
      this.gatefoldOpened = true;
      this.gatefoldAnimating = false;
      setTimeout(() => {
        try {
          AOS.refresh();
        } catch {}
        this.initPollenCanvas();
      }, 120);
    }, 880);
  }

  // --- AUDIO LOGIC ---
  toggleGlobalMusic(): void {
    this.toggleMusicOutput.emit();
  }

  isSectionActive(sectionKey: string): boolean {
    const s = this.invitation?.content?.sectionSettings as Record<string, boolean> | undefined;
    if (!s) return true;
    if (sectionKey === 'music' || sectionKey === 'backgroundMusic') {
      return s['music'] !== false && s['backgroundMusic'] !== false;
    }
    if (sectionKey === 'collectiveAlbum' || sectionKey === 'guestAlbum') {
      return s['collectiveAlbum'] !== false && s['guestAlbum'] !== false;
    }
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
    return item && item.audioUrl ? item.audioUrl : '';
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

  // --- VIP ACCESS / GATEFOLD LOGIC ---
  get requiresGuestValidation(): boolean {
    return !!((this.invitation?.accessMode === 'guest_list' || this.invitation?.accessMode === 'specific_users') && !this.verifiedGuest);
  }

  onOpenGatefold(): void {
    if (!this.requiresGuestValidation) {
      if (!this.isPlayingMusic && this.isSectionActive('music')) {
        this.toggleMusicOutput.emit();
      }
      this.triggerGatefoldOpen();
      return;
    }

    const val = (this.guestAccessSingleInput || '').trim();
    if (!val) {
      this.error = 'Por favor ingresa tu correo electrónico o teléfono registrado.';
      return;
    }

    const isEmail = val.includes('@');
    this.verifyGuestAccessOutput.emit({
      email: isEmail ? val : '',
      phone: !isEmail ? val : ''
    });
  }

  // --- HERO PHOTO HELPER ---
  get coverPhotoUrl(): string {
    if (this.invitation?.content?.coverImageUrl) {
      return this.invitation.content.coverImageUrl;
    }
    const firstGallery = this.invitation?.content?.gallery?.[0];
    return firstGallery || '';
  }

  get guestPassQrUrl(): string {
    const rawQr = this.verifiedGuest?.qrCode || '';
    if (rawQr.startsWith('data:image/') || rawQr.startsWith('http://') || rawQr.startsWith('https://')) {
      return rawQr;
    }
    const code = this.verifiedGuest?.checkInCode || rawQr || this.verifiedGuest?.id || '';
    if (!code) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(code)}`;
  }

  // --- RSVP LOGIC ---
  onSubmitRsvp(): void {
    if (this.rsvp.response === 'confirmed') {
      this.triggerBotanicalConfetti();
    }
    this.submitRsvpOutput.emit();
  }

  triggerBotanicalConfetti(): void {
    this.ngZone.runOutsideAngular(() => {
      try {
        confetti({
          particleCount: 80,
          spread: 76,
          origin: { y: 0.62 },
          colors: ['#b68b3a', '#1e3528', '#e5cca0', '#7d9683', '#ffffff']
        });
      } catch (err) {
        // Ignore confetti errors
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
      publicName: this.dedication.publicName.trim(),
      message: this.dedication.message.trim(),
      type: this.dedication.type || 'dedication'
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
    if (!url) return;
    this.openLightboxOutput.emit(url);
  }

  copyText(val?: string, type: 'clabe' | 'account' = 'clabe'): void {
    if (!val || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(val).then(() => {
      if (type === 'clabe') {
        this.copiedClabe = true;
        setTimeout(() => (this.copiedClabe = false), 2500);
      } else {
        this.copiedAccount = true;
        setTimeout(() => (this.copiedAccount = false), 2500);
      }
    });
  }

  addToGoogleCalendar(): void {
    if (typeof window === 'undefined') return;
    const rawDate = this.event?.date ? new Date(this.event.date) : new Date(Date.now() + 90 * 86400000);
    const d = Number.isNaN(rawDate.getTime()) ? new Date(Date.now() + 90 * 86400000) : rawDate;
    const startStr = d.toISOString().replace(/-|:|\.\d+/g, '');
    const end = new Date(d.getTime() + 5 * 60 * 60 * 1000);
    const endStr = end.toISOString().replace(/-|:|\.\d+/g, '');
    const title = encodeURIComponent(this.event?.title || this.invitation?.content?.headline || 'Nuestra Boda');
    const details = encodeURIComponent(this.invitation?.content?.message || 'Acompáñanos a celebrar nuestro gran día.');
    const loc = encodeURIComponent(this.displayLocations[0]?.address || this.event?.venue?.address || '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
    window.open(url, '_blank');
  }

  shareOnWhatsApp(): void {
    if (typeof window === 'undefined') return;
    const title = this.invitation?.content?.headline || this.event?.title || 'nuestra celebración';
    const text = encodeURIComponent(`¡Nos encantaría compartir contigo ${title}! Abre nuestra invitación digital aquí: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  get displayLocations(): InvitationLocation[] {
    if (this.invitation?.content?.locations?.length) {
      return this.invitation.content.locations;
    }
    const venue = this.event?.venue;
    if (venue?.name || venue?.address) {
      return [
        {
          type: 'Ceremonia & Recepción',
          name: venue.name || '',
          address: venue.address || '',
          mapUrl: venue.mapUrl || ''
        }
      ];
    }
    return [];
  }

  getStoreLogo(registry: any): string {
    if (!registry) return '';
    const img = (registry.imageUrl || registry.logoUrl || '').trim();
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
}
