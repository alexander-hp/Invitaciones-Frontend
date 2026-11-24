import { Component, OnDestroy, OnInit, AfterViewChecked, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/api.service';
import { LandingDraftService } from '../../core/landing-draft.service';
import { TemplateTextOverlayService } from '../../core/template-text-overlay.service';
import { generateInteractiveRuntimeScript } from '../../core/universal-invitation-runtime';
import { getTemplateAccessPreset, TemplateAccessScreenPreset, isLegacyOrMismatchedAccessScreen } from '../../core/template-access-presets';
import {
  getBackdropPatternDataUri,
  getCornerOrnamentSvg,
  getDividerFlourishSvg,
  getTemplateVisualEnhancement,
  getTopHeaderArtworkSvg,
  TemplateAccessVisualEnhancement
} from '../../core/template-access-ornaments';
import { DedicationModel, EventModel, ExternalGuestStatusResponse, GuestAccessResponse, GuestActivityNotification, InvitationLocation, InvitationModel, MusicCueSettings, MusicPlaybackSettings, RsvpCustomQuestion, RsvpResponse, VisualAccessScreenDesign, VisualInvitationLayer } from '../../core/models';
import { generateGuestPassHtml } from './guest-pass-template';

@Component({
  selector: 'app-new-public-invitation',
  templateUrl: './new-public-invitation.component.html',
  styleUrls: ['./new-public-invitation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewPublicInvitationComponent implements OnInit, OnDestroy, AfterViewChecked {
  invitation?: InvitationModel;
  event?: EventModel;
  loading = false;
  sending = false;
  checkingGuest = false;
  uploadingAlbum = false;
  error = '';
  accessRequired = false;
  accessMessage = '';
  accessGateData?: { slug?: string; eventTitle?: string; accessMode?: string; accessScreen?: VisualAccessScreenDesign; theme?: any; palette?: any; coverImageUrl?: string; responsiveMode?: 'shared' | 'independent'; template?: string };
  accessGateView: 'login' | 'register' = 'login';
  selfRegName = '';
  selfRegEmail = '';
  selfRegPhone = '';
  selfRegCompanions = 1;
  selfRegSubmitting = false;
  selfRegSubmitted = false;
  selfRegMessage = '';
  success = '';
  albumMessage = '';
  dedicationMessage = '';
  toastMessage = '';
  activeLightboxImage: string | null = null;
  isPlayingMusic = false;
  currentActiveSection = 'hero';
  currentPlayingTrackUrl = '';
  spotifyPlayerVisible = false;
  private audioRef?: HTMLAudioElement;
  private ytPlayer?: any;
  private isYtApiLoaded = false;
  private isYtReady = false;
  private pendingYtVideoId?: string;
  private firstInteractionHandler?: (event: Event) => void;
  private suppressNextMusicClick = false;
  private suppressNextMusicClickTimer?: ReturnType<typeof setTimeout>;
  private observer?: IntersectionObserver;
  private timerInterval?: any;
  private editedTextsApplied = false;
  private pendingEditedTexts?: Record<string, string>;
  private textOverlayMutationObserver?: MutationObserver;
  private detectedSourceTemplate?: string;

  countdown = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false
  };

  publicAlbumAssets: Array<{ url: string; uploaderName?: string; createdAt?: string }> = [];
  allAlbumAssets: Array<{ url: string; uploaderName?: string; createdAt?: string }> = [];

  updateAllAlbumAssets(): void {
    const hostPhotos = (this.invitation?.content?.privateAlbum || []).map(url => ({
      url,
      uploaderName: 'Anfitrión'
    }));
    this.allAlbumAssets = [...hostPhotos, ...this.publicAlbumAssets];
  }
  dedications: DedicationModel[] = [];
  guestAccessEmail = '';
  guestAccessPhone = '';
  guestAccessSingleInput = '';
  guestAccessPin = '';
  isOpeningVipEnvelope = false;
  selectedAlbumFile?: File;
  declineConfirmed = false;
  verifiedGuest?: GuestAccessResponse['guest'];
  showPassModal = false;
  guestActivity?: ExternalGuestStatusResponse;
  guestActivityLoading = false;
  activityNotifications: GuestActivityNotification[] = [];
  private guestSessionToken = '';
  private guestActivityTimer?: ReturnType<typeof setInterval>;
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

  songRequest = { title: '', artist: '', dedication: '', sourceUrl: '', thumbnailUrl: '' };
  songRequestSending = false;
  songRequestMessage = '';
  guestSubmittedSongsCount = 0;

  songSearchQuery = '';
  searchingSongs = false;
  songSearchResults: Array<{
    title: string;
    artist: string;
    sourceUrl: string;
    thumbnailUrl: string;
    previewUrl?: string;
  }> = [];

  customHtmlSafeSrcdoc?: SafeHtml;
  previewDevice: 'mobile' | 'tablet' | 'desktop' = 'mobile';
  previewBarCollapsed = false;
  isSimulatingGuest = false;
  previewSection: 'invitation' | 'access' | 'register' = 'invitation';

  readonly previewGuestData: GuestAccessResponse['guest'] = {
    id: 'preview-guest-sample',
    name: 'Invitado de Ejemplo',
    email: 'invitado@ejemplo.com',
    group: 'Familia',
    relationshipLabel: 'Familia',
    allowedCompanions: 2,
    tableName: 'Mesa 5',
    seatLabel: 'A-12',
    checkInCode: 'DEMO-PASS-QR',
    qrCode: 'DEMO-PASS-QR',
    status: 'pending'
  };

  readonly previewGuestActivityData: ExternalGuestStatusResponse = {
    guest: {
      id: 'preview-guest-sample',
      name: 'Invitado de Ejemplo',
      email: 'invitado@ejemplo.com',
      group: 'Familia',
      relationshipLabel: 'Familia',
      allowedCompanions: 2,
      tableName: 'Mesa 5',
      seatLabel: 'A-12',
      checkInCode: 'DEMO-PASS-QR',
      qrCode: 'DEMO-PASS-QR',
      status: 'pending'
    },
    rsvp: {
      response: 'confirmed',
      companions: 2,
      companionNames: ['Acompañante 1', 'Acompañante 2'],
      message: '¡Muchas felicidades!'
    } as any,
    albumUploads: [
      { id: 'sample-1', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80', caption: 'Foto de prueba', status: 'approved' } as any
    ],
    songRequests: [
      { id: 'song-1', title: 'Canción favorita', artist: 'Artista', status: 'approved' } as any
    ],
    dedications: [
      { id: 'ded-1', message: '¡Que sean muy felices en esta nueva etapa!', publicName: 'Invitado de Ejemplo', status: 'approved' } as any
    ]
  };

  setPreviewSection(section: 'invitation' | 'access' | 'register'): void {
    this.previewSection = section;
    if (section === 'register') {
      this.accessGateView = 'register';
      this.pauseAllAudio();
    } else if (section === 'access') {
      this.accessGateView = 'login';
      this.pauseAllAudio();
    } else {
      this.resumeAudio();
    }
    if (typeof window !== 'undefined') {
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch {}
    }
    this.cdr?.markForCheck();
  }

  toggleGuestSimulation(): void {
    if (this.isSimulatingGuest) {
      this.isSimulatingGuest = false;
      this.verifiedGuest = undefined;
      this.guestActivity = undefined;
      this.showToast('Vista: Formulario inicial de acceso');
    } else {
      this.activateSimulatedGuest();
      this.showToast('Vista: Pase digital y actividad del invitado');
    }
    this.cdr?.markForCheck();
  }

  activateSimulatedGuest(): void {
    this.isSimulatingGuest = true;
    this.verifiedGuest = { ...this.previewGuestData };
    this.guestActivity = { ...this.previewGuestActivityData };
    this.rsvp.name = this.previewGuestData.name;
    this.rsvp.email = this.previewGuestData.email || '';
    this.cdr?.markForCheck();
  }

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private sanitizer: DomSanitizer,
    private textOverlay: TemplateTextOverlayService,
    private elRef: ElementRef,
    private http: HttpClient,
    private cdr?: ChangeDetectorRef,
    @Optional() private landingDraft?: LandingDraftService
  ) { }
  private iframeBridgeListener?: (e: MessageEvent) => void;
  private wasPlayingBeforeHidden = false;
  private visibilityListener?: () => void;

  ngOnInit(): void {
    const querySection = this.route.snapshot.queryParamMap.get('section') || this.route.snapshot.queryParamMap.get('view');
    if (querySection === 'access' || querySection === 'login') {
      this.previewSection = 'access';
      this.accessGateView = 'login';
    } else if (querySection === 'register' || querySection === 'selfreg') {
      this.previewSection = 'register';
      this.accessGateView = 'register';
    }

    const queryDevice = this.route.snapshot.queryParamMap.get('device');
    if (queryDevice === 'mobile' || queryDevice === 'tablet' || queryDevice === 'desktop') {
      this.previewDevice = queryDevice;
    }

    this.iframeBridgeListener = this.handleIframeBridgeMessage.bind(this);
    window.addEventListener('message', this.iframeBridgeListener);

    this.visibilityListener = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        if (this.isPlayingMusic) {
          this.wasPlayingBeforeHidden = true;
          this.pauseAllAudio();
        }
      } else {
        if (this.wasPlayingBeforeHidden) {
          this.wasPlayingBeforeHidden = false;
          this.resumeAudio();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);

    this.load();
  }

  ngAfterViewChecked(): void {
    // Apply edited texts after Angular has rendered the template
    if (this.pendingEditedTexts && Object.keys(this.pendingEditedTexts).length > 0 && !this.loading) {
      const rootEl = this.elRef.nativeElement as HTMLElement;
      const foundEl = rootEl?.querySelector('[data-section-key], .nw-pub-headline, .nw-pub-subheadline, h1, h2, .env-title');
      if (rootEl && foundEl && !this.editedTextsApplied) {
        console.log('test edit: [PublicInv] ngAfterViewChecked - first full render detected, applying texts now!');
        this.textOverlay.applyTexts(rootEl, this.pendingEditedTexts);
        this.editedTextsApplied = true;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = undefined;
    }
    this.wasPlayingBeforeHidden = false;
    this.pauseAllAudio();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.guestActivityTimer) clearInterval(this.guestActivityTimer);
    if (this.audioRef) {
      try {
        this.audioRef.pause();
        this.audioRef.src = '';
        this.audioRef.load();
      } catch { }
      this.audioRef = undefined;
    }
    if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
      try {
        this.ytPlayer.destroy();
      } catch { }
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.textOverlayMutationObserver) {
      this.textOverlayMutationObserver.disconnect();
    }
    if (this.iframeBridgeListener) {
      window.removeEventListener('message', this.iframeBridgeListener);
    }
    if (this.suppressNextMusicClickTimer) clearTimeout(this.suppressNextMusicClickTimer);
    this.removeFirstInteractionPlayback();
  }

  handleIframeBridgeMessage(event: MessageEvent): void {
    if (!event.data || typeof event.data !== 'object') return;
    const { type, slug, payload, email, phone, publicName, message } = event.data;
    if (!type || typeof type !== 'string' || type.startsWith('webpack')) return;
    if (slug && this.invitation && this.invitation.slug !== slug) return;

    console.log('test edit: [PublicInv] Received bridge message from iframe:', type, event.data);

    switch (type) {
      case 'LANDING_DRAFT_UPDATE':
        if (event.data.draft && (this.isLandingDraftSlug() || this.route.snapshot.queryParamMap.get('guestDraft') === 'true')) {
          const incoming = event.data.draft;
          const nextInv = incoming.invitation ? JSON.parse(JSON.stringify(incoming.invitation)) : this.invitation;
          const queryTpl = this.route.snapshot.queryParamMap.get('tpl');
          if (nextInv?.content && queryTpl) {
            nextInv.content.template = queryTpl;
          }
          if (incoming.event) {
            this.event = JSON.parse(JSON.stringify(incoming.event));
            if (nextInv) nextInv.event = this.event;
          }
          if (nextInv) {
            this.invitation = nextInv;
            this.cachedCurrentTemplate = undefined;
            this.cachedAmbientThemeColor = undefined;
            this.lastTemplateInvitationRef = undefined;
            this.lastAmbientInvitationRef = undefined;
            if (nextInv.content?.editedTexts && Object.keys(nextInv.content.editedTexts).length > 0) {
              this.pendingEditedTexts = { ...nextInv.content.editedTexts };
              this.editedTextsApplied = false;
            }
            this.startCountdown();
            this.cdr?.markForCheck();
          }
        }
        break;
      case 'INV_TOGGLE_MUSIC':
        this.toggleMusic();
        break;
      case 'INV_SUBMIT_RSVP':
        if (payload) {
          this.rsvp = { ...this.rsvp, ...payload };
          this.submit();
        }
        break;
      case 'INV_CHECK_GUEST':
        this.checkGuestAccessByCredentials(email, phone);
        break;
      case 'INV_SUBMIT_DEDICATION':
        this.submitDedicationFromData({ publicName: publicName || '', message: message || '' });
        break;
      case 'INV_OPEN_LIGHTBOX':
        if (event.data.url) this.openLightbox(event.data.url);
        break;
    }
  }

  private cachedIsOwnerOrInEditor?: boolean;
  get isOwnerOrInEditor(): boolean {
    if (this.cachedIsOwnerOrInEditor !== undefined) return this.cachedIsOwnerOrInEditor;
    const hasToken = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('invitaciones_token'));
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    this.cachedIsOwnerOrInEditor = hasToken || isIframe;
    return this.cachedIsOwnerOrInEditor;
  }

  get isPreviewMode(): boolean {
    if (typeof window === 'undefined') return false;
    return this.route.snapshot.queryParamMap.get('preview') === 'true' || Boolean(this.invitation?.id?.startsWith('preview-'));
  }

  get isIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  get showPreviewDeviceToolbar(): boolean {
    return this.isPreviewMode && !this.isIframe;
  }

  private cachedAmbientThemeColor?: string;
  private lastAmbientInvitationRef?: InvitationModel;

  get ambientThemeColor(): string {
    if (this.cachedAmbientThemeColor && this.lastAmbientInvitationRef === this.invitation) {
      return this.cachedAmbientThemeColor;
    }
    this.lastAmbientInvitationRef = this.invitation;
    const visualDesign = this.invitation?.content?.visualDesign || this.invitation?.content?.visualDesignDraft;
    const themeBg = visualDesign?.theme?.backgroundColor;
    if (themeBg && themeBg !== '#ffffff' && themeBg !== '#fff' && themeBg !== 'transparent') {
      this.cachedAmbientThemeColor = themeBg;
      return themeBg;
    }
    const tpl = this.currentTemplate;
    if (tpl === 'template-xv' || tpl === 'xv-burgundy' || tpl === 'template-xv-burgundy' || visualDesign?.theme?.headingFont?.includes('Great Vibes')) {
      this.cachedAmbientThemeColor = '#5c0d18';
      return '#5c0d18';
    }
    if (tpl === 'boda-navy-blue' || tpl === 'navy-blue' || tpl === 'template-boda-navy-blue') {
      this.cachedAmbientThemeColor = '#0d1b2a';
      return '#0d1b2a';
    }
    if (tpl === 'maison-dore' || tpl === 'boda-creativa-premium') {
      this.cachedAmbientThemeColor = '#1c1917';
      return '#1c1917';
    }
    if (tpl === 'boda-eleganza' || tpl === 'eleganza' || tpl === 'template-boda-eleganza' || tpl === 'template-eleganza') {
      this.cachedAmbientThemeColor = '#241e1b';
      return '#241e1b';
    }
    if (tpl === 'boda-rosas' || tpl === 'rosas' || tpl === 'template-boda-rosas' || tpl === 'roses') {
      this.cachedAmbientThemeColor = '#2b1b22';
      return '#2b1b22';
    }
    if (tpl === 'boda-teatro' || tpl === 'teatro' || tpl === 'template-boda-teatro' || tpl === 'template-teatro') {
      this.cachedAmbientThemeColor = '#1a0307';
      return '#1a0307';
    }
    if (tpl === 'boda-villa-perle' || tpl === 'villa-perle' || tpl === 'template-boda-villa-perle' || tpl === 'template-villa-perle') {
      this.cachedAmbientThemeColor = '#1c241e';
      return '#1c241e';
    }
    if (tpl === 'boda-girasoles' || tpl === 'girasoles' || tpl === 'template-boda-girasoles' || tpl === 'elegancia-girasoles') {
      this.cachedAmbientThemeColor = '#2d2112';
      return '#2d2112';
    }
    this.cachedAmbientThemeColor = themeBg || '#26221f';
    return this.cachedAmbientThemeColor;
  }

  get invitationDisplayTitle(): string {
    const contentTitle = this.invitation?.content?.headline || (this.invitation?.content as any)?.title;
    if (contentTitle) return contentTitle;
    if (this.event?.title) return this.event.title;
    if (typeof this.invitation?.event === 'object' && (this.invitation?.event as EventModel)?.title) {
      return (this.invitation.event as EventModel).title;
    }
    return this.invitation?.slug || 'Invitación';
  }

  setPreviewDevice(device: 'mobile' | 'tablet' | 'desktop'): void {
    this.previewDevice = device;
    if (typeof window !== 'undefined') {
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch {}
    }
    this.cdr?.markForCheck();
  }

  togglePreviewBar(): void {
    this.previewBarCollapsed = !this.previewBarCollapsed;
    this.cdr?.markForCheck();
  }

  closePreviewWindow(): void {
    if (typeof window !== 'undefined') {
      if (window.opener && !window.opener.closed) {
        window.close();
      } else {
        window.history.back();
      }
    }
  }

  get isEmbeddedOrPreview(): boolean {
    if (typeof window === 'undefined') return true;
    const isIframe = window.self !== window.top;
    const isPreview = this.route.snapshot.queryParamMap.get('preview') === 'true';
    const isEditor = this.route.snapshot.queryParamMap.get('editor') === 'true';
    const isPreviewId = Boolean(this.invitation?.id?.startsWith('preview-'));
    return isIframe || isPreview || isEditor || isPreviewId;
  }

  private pauseAllAudio(): void {
    if (this.audioRef && !this.audioRef.paused) {
      try { this.audioRef.pause(); } catch { }
    }
    if (this.ytPlayer && this.isYtReady && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch { }
    }
    this.isPlayingMusic = false;
  }

  private resumeAudio(): void {
    if (this.isEmbeddedOrPreview) return;
    const currentUrl = this.currentPlayingTrackUrl || this.getAudioUrlForSection(this.currentActiveSection);
    if (!currentUrl) return;

    const ytId = this.extractYouTubeVideoId(currentUrl);
    if (ytId && this.ytPlayer && this.isYtReady && typeof this.ytPlayer.playVideo === 'function') {
      try {
        this.ytPlayer.playVideo();
        this.isPlayingMusic = true;
      } catch {
        this.isPlayingMusic = false;
      }
      return;
    }

    if (this.isSpotifyUrl(currentUrl)) {
      this.isPlayingMusic = true;
      return;
    }

    if (this.audioRef) {
      this.audioRef.play().then(() => {
        this.isPlayingMusic = true;
      }).catch(() => {
        this.isPlayingMusic = false;
      });
    }
  }

  load(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loading = true;
    this.error = '';
    const personalToken = this.route.snapshot.queryParamMap.get('t');
    if (personalToken) {
      this.api.getGuestByToken(slug, personalToken).subscribe({
        next: ({ guest, guestSessionToken }) => {
          this.verifiedGuest = guest;
          this.applyVerifiedGuestToRsvp(guest);
          this.guestSessionToken = guestSessionToken || '';
          if (guestSessionToken) sessionStorage.setItem(this.guestSessionStorageKey(slug), guestSessionToken);
          const search = new URLSearchParams(window.location.search);
          search.delete('t');
          window.history.replaceState({}, '', `${window.location.pathname}${search.toString() ? `?${search}` : ''}${window.location.hash}`);
          this.fetchPublishedInvitation(slug, guestSessionToken);
        },
        error: () => {
          this.accessRequired = true;
          this.accessMessage = 'El enlace personal no es válido o ya no tiene acceso. Solicita uno nuevo.';
          this.loading = false;
          this.cdr?.markForCheck();
        }
      });
      return;
    }
    this.fetchPublishedInvitation(slug, sessionStorage.getItem(this.guestSessionStorageKey(slug)) || undefined);
  }

  private isLandingDraftSlug(slug?: string): boolean {
    const s = slug ?? (this.route.snapshot.paramMap.get('slug') || '');
    return s === 'landing-draft' || this.route.snapshot.queryParamMap.get('guestDraft') === 'true';
  }

  private resolveGuestLandingDraft(slug: string): { invitation: InvitationModel; event: EventModel } | null {
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || undefined;
    let draft = this.landingDraft?.getDraft() || null;
    if (!draft && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('velisse_landing_draft_v1');
        if (raw) draft = JSON.parse(raw);
      } catch {}
    }
    if (!draft && this.landingDraft) {
      draft = this.landingDraft.ensureDraftForTemplate(queryTpl || 'boda-girasoles');
    }
    if (!draft) return null;

    const invitation: InvitationModel = JSON.parse(JSON.stringify(draft.invitation));
    const event: EventModel = JSON.parse(JSON.stringify(draft.event));
    invitation.slug = slug || 'landing-draft';
    invitation.event = event;
    if (!invitation.content) invitation.content = {};
    if (queryTpl) {
      invitation.content.template = queryTpl;
      if (queryTpl === 'visual-builder' && invitation.content.visualDesignDraft) {
        invitation.content.visualDesign = { ...invitation.content.visualDesignDraft, active: true };
      }
    } else if (draft.mode === 'visual' && invitation.content.visualDesignDraft) {
      invitation.content.template = 'visual-builder';
      invitation.content.visualDesign = { ...invitation.content.visualDesignDraft, active: true };
    }
    return { invitation, event };
  }

  private fetchPublishedInvitation(slug: string, token?: string): void {
    if (this.isLandingDraftSlug(slug)) {
      const resolved = this.resolveGuestLandingDraft(slug);
      if (resolved) {
        this.accessRequired = false;
        this.event = resolved.event;
        this.applyInvitation(resolved.invitation, slug);
        return;
      }
    }
    const previewRequested = this.route.snapshot.queryParamMap.get('preview') === 'true';
    const ownerToken = localStorage.getItem('invitaciones_token');
    if (previewRequested && ownerToken) {
      this.api.getInvitationPreview(slug).subscribe({
        next: ({ invitation }) => {
          this.accessRequired = false;
          const draftTpl = (invitation.content as any)?.template;
          if ((!draftTpl || draftTpl === 'visual-builder') && invitation.content?.visualDesignDraft) {
            invitation.content.visualDesign = {
              ...invitation.content.visualDesignDraft,
              active: true
            };
          }
          this.applyInvitation(invitation, slug);
        },
        error: (error) => {
          this.loading = false;
          this.error = error?.error?.message || 'No se pudo cargar la vista previa del borrador';
          this.cdr?.markForCheck();
        }
      });
      return;
    }
    this.api.getPublicInvitation(slug, token).subscribe({
      next: ({ invitation }) => { this.accessRequired = false; this.applyInvitation(invitation, slug); },
      error: (error) => {
        this.loading = false;
        this.accessRequired = error?.status === 401 || error?.status === 403;
        if (this.accessRequired) {
          sessionStorage.removeItem(this.guestSessionStorageKey(slug));
          this.guestSessionToken = '';
          this.verifiedGuest = undefined;
          this.accessMessage = 'Esta invitación requiere un enlace personal. Solicítalo con tu correo o teléfono registrado.';
          this.accessGateData = error?.error?.accessGate;
        } else {
          this.error = error?.error?.message || 'Invitación no encontrada o no publicada';
        }
        this.cdr?.markForCheck();
      }
    });
  }

  private applyInvitation(invitation: InvitationModel, slug: string): void {
    this.invitation = invitation;
    this.cachedCurrentTemplate = undefined;
    this.cachedCustomHtml = undefined;
    this.cachedCustomCss = undefined;
    this.cachedAmbientThemeColor = undefined;
    this.lastTemplateInvitationRef = undefined;
    this.lastCustomHtmlInvitationRef = undefined;
    this.lastCustomCssInvitationRef = undefined;
    this.lastAmbientInvitationRef = undefined;
    const activeTpl = (this.invitation.content as any)?.template;
    if (this.isPreviewMode && (!activeTpl || activeTpl === 'visual-builder') && this.invitation.content?.visualDesignDraft) {
      this.invitation.content.visualDesign = {
        ...this.invitation.content.visualDesignDraft,
        active: true
      };
    }
    if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
    this.event = typeof invitation.event === 'string' ? undefined : (invitation.event as EventModel);
    this.restoreGuestActivitySession(slug);
    if (this.isPreviewMode && !this.verifiedGuest) {
      this.activateSimulatedGuest();
    }

    //console.log('🎵 [PublicInvitation] Loaded invitation payload:', invitation);
    //console.log('🎵 [PublicInvitation] content:', invitation?.content);
    //console.log('🎵 [PublicInvitation] musicUrl:', invitation?.content?.musicUrl);
    //console.log('🎵 [PublicInvitation] sectionMusic:', invitation?.content?.sectionMusic);

    // Custom HTML source resolution: invitation content > localStorage / submissions
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    const resolvedCustomHtml = invitation.content?.customHtml || this.customHtmlContent;
    const resolvedSourceTpl = invitation.content?.sourceTemplateKey || localStorage.getItem(`inv_source_tpl_${slug}`);

    if (resolvedCustomHtml && !isCleanRequested) {
      const detected = this.detectSourceTemplateFromHtml(resolvedCustomHtml);
      if (detected) {
        console.log('test edit: [PublicInv] Auto-detected native template:', detected.templateKey, 'with texts:', Object.keys(detected.editedTexts).length);
        this.detectedSourceTemplate = detected.templateKey;
        if (this.invitation.content) {
          this.invitation.content.template = detected.templateKey;
          this.invitation.content.editedTexts = { ...(this.invitation.content.editedTexts || {}), ...detected.editedTexts };
        }
        this.pendingEditedTexts = { ...detected.editedTexts, ...(this.pendingEditedTexts || {}) };
      } else if (resolvedSourceTpl && resolvedSourceTpl !== 'custom-html') {
        this.detectedSourceTemplate = resolvedSourceTpl;
        if (this.invitation.content) {
          this.invitation.content.template = resolvedSourceTpl;
        }
      } else {
        // True custom HTML/CSS page (e.g. uploaded custom template)
        this.detectedSourceTemplate = undefined;
        if (this.invitation.content) {
          this.invitation.content.template = 'custom-html';
          this.invitation.content.customHtml = resolvedCustomHtml;
          if (this.customCssContent) {
            this.invitation.content.customCss = this.customCssContent;
          }
          this.invitation.content.customPageApproved = true;
        }
      }
    } else if (resolvedSourceTpl && resolvedSourceTpl !== 'custom-html') {
      this.detectedSourceTemplate = resolvedSourceTpl;
      if (this.invitation.content) {
        this.invitation.content.template = resolvedSourceTpl;
      }
    } else if (isCleanRequested) {
      this.detectedSourceTemplate = undefined;
      this.pendingEditedTexts = undefined;
    }

    this.updateCustomHtmlSafeSrcdoc();
    this.loadPublicAlbum();
    this.loadDedications();
    this.startCountdown();
    this.initAudio();
    this.setupFirstInteractionPlayback();
    this.setupSectionObserver();
    this.loadEditedTexts(slug);
    this.updateAllAlbumAssets();
    this.loading = false;
    this.cdr?.markForCheck();
  }

  updateCustomHtmlSafeSrcdoc(): void {
    if (!this.isCustomHtmlTemplate()) {
      this.customHtmlSafeSrcdoc = undefined;
      return;
    }
    const html = this.customHtmlContent;
    const css = this.customCssContent;

    // Clean only bundled angular/webpack runtime scripts, preserve custom template scripts
    const cleanHtml = html
      .replace(/<script\b[^>]*src=["'][^"']*(polyfills|runtime|vendor)[^"']*["'][^>]*>\s*<\/script>/gi, '')
      .replace(/unsafe:data:image\/svg\+xml/gi, 'data:image/svg+xml');

    const runtimeScript = generateInteractiveRuntimeScript({
      slug: this.invitation?.slug || this.route.snapshot.paramMap.get('slug') || '',
      musicUrl: this.invitation?.content?.musicUrl || this.getAudioUrlForSection('hero'),
      musicSettings: this.invitation?.content?.musicSettings,
      eventDate: this.event?.date ? new Date(this.event.date).toISOString() : undefined,
      headline: this.invitation?.content?.headline,
      subheadline: this.invitation?.content?.subheadline,
      palette: this.invitation?.content?.palette
    });

    let combined = '';
    const hasHtmlTag = /<html\b/i.test(cleanHtml);
    const hasHeadTag = /<head\b/i.test(cleanHtml);
    const hasBodyTag = /<body\b/i.test(cleanHtml);

    if (hasHtmlTag || (hasHeadTag && hasBodyTag)) {
      combined = cleanHtml;
      // Inject CSS
      if (css && css.trim()) {
        const styleTag = `<style>\nhtml, body { margin: 0; padding: 0; min-height: 100%; }\n${css}\n</style>`;
        if (/<head\b[^>]*>/i.test(combined)) {
          combined = combined.replace(/<head\b[^>]*>/i, `$&${styleTag}`);
        } else if (/<\/head>/i.test(combined)) {
          combined = combined.replace(/<\/head>/i, `${styleTag}</head>`);
        } else {
          combined = styleTag + combined;
        }
      }
      // Inject runtime script
      if (/<\/body>/i.test(combined)) {
        combined = combined.replace(/<\/body>/i, `${runtimeScript}</body>`);
      } else {
        combined = combined + runtimeScript;
      }
    } else {
      combined = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              html, body { margin: 0; padding: 0; min-height: 100%; }
              ${css || ''}
            </style>
          </head>
          <body>
            ${cleanHtml}
            ${runtimeScript}
          </body>
        </html>
      `;
    }

    this.customHtmlSafeSrcdoc = this.sanitizer.bypassSecurityTrustHtml(combined);
  }

  private startCountdown(): void {
    if (!this.event?.date && !this.isPreviewMode) return;
    this.updateCountdown();
    this.timerInterval = setInterval(() => this.updateCountdown(), 1000);
  }

  private updateCountdown(): void {
    let diff: number;
    if (!this.event?.date) {
      if (!this.isPreviewMode) return;
      diff = 38 * 24 * 60 * 60 * 1000;
    } else {
      const target = new Date(this.event.date).getTime();
      const now = Date.now();
      diff = target - now;
      if ((Number.isNaN(target) || diff <= 0) && this.isPreviewMode) {
        diff = 38 * 24 * 60 * 60 * 1000;
      }
    }

    if (diff <= 0) {
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
      this.cdr?.markForCheck();
      return;
    }

    this.countdown = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isOver: false
    };
    this.cdr?.markForCheck();
  }

  getStoreLogo(registry: any): string {
    if (!registry) return '';
    const img = (registry.imageUrl || '').trim();
    if (img && !img.startsWith('data:image/svg') && !img.includes('assets/giftTable/')) {
      return img;
    }
    const storeLower = (registry.store || registry.title || '').toLowerCase().trim();
    if (storeLower.includes('liverpool')) {
      return '/assets/giftTable/liverpool-logo.jpg';
    }
    if (storeLower.includes('palacio')) {
      return '/assets/giftTable/palacio-logo.png';
    }
    if (storeLower.includes('sears')) {
      return '/assets/giftTable/sears_logo.jpg';
    }
    if (storeLower.includes('uniko') || storeLower.includes('efectivo')) {
      return '/assets/giftTable/logo_uniko.webp';
    }
    if (storeLower.includes('amazon')) {
      return '/assets/giftTable/logo-amazon.png';
    }
    if (storeLower.includes('mercado')) {
      return '/assets/giftTable/mercado-libre-logo.png';
    }
    return img;
  }

  hasMusicTrack(): boolean {
    if (this.invitation?.content?.sectionSettings?.backgroundMusic === false) return false;
    if (this.invitation?.content?.musicUrl) return true;
    const secMusic = this.invitation?.content?.sectionMusic;
    if (!secMusic) return false;
    if (typeof (secMusic as any).values === 'function') {
      return Array.from((secMusic as any).values()).some(Boolean);
    }
    return Boolean(typeof secMusic === 'object' && Object.values(secMusic).some(Boolean));
  }

  showVisualMusicFallback(): boolean {
    if (!this.isVisualBuilderTemplate() || !this.hasMusicTrack()) return false;
    const sections = this.invitation?.content?.visualDesign?.sections || [];
    return !sections.some((section) => section.layers?.some((layer) => !layer.hidden && layer.type === 'audio' && layer.binding === 'music.toggle'));
  }

  isMusicControlReady(): boolean {
    const targetUrl = this.getAudioUrlForSection(this.currentActiveSection) || this.invitation?.content?.musicUrl || '';
    const youtubeId = this.extractYouTubeVideoId(targetUrl);
    return !youtubeId || this.isYtReady;
  }

  private getMusicSettings(): MusicPlaybackSettings {
    return {
      playbackMode: 'first_interaction', sectionChangeMode: 'automatic', loop: true,
      volume: 0.7, startSeconds: 0, ...(this.invitation?.content?.musicSettings || {})
    };
  }

  private getMusicCue(sectionKey: string): MusicCueSettings {
    const settings = this.getMusicSettings();
    const sectionCue = this.invitation?.content?.sectionMusicCues?.[sectionKey] || {};
    const startSeconds = Math.max(0, Number(sectionCue.startSeconds ?? settings.startSeconds ?? 0));
    const rawEnd = sectionCue.endSeconds ?? settings.endSeconds;
    const endSeconds = rawEnd !== undefined && Number(rawEnd) > startSeconds ? Number(rawEnd) : undefined;
    return {
      startSeconds,
      endSeconds,
      volume: Math.min(1, Math.max(0, Number(sectionCue.volume ?? settings.volume ?? 0.7))),
      loop: sectionCue.loop ?? settings.loop ?? true
    };
  }

  private shouldAutoplayMusic(): boolean {
    if (this.isEmbeddedOrPreview) return false;
    if (!this.hasMusicTrack()) return false;
    const mode = this.getMusicSettings().playbackMode;
    if (mode === 'manual') return false;
    if (mode === 'after_access' && this.requiresGuestValidation && !this.verifiedGuest) return false;
    return true;
  }

  private setupFirstInteractionPlayback(): void {
    this.removeFirstInteractionPlayback();
    if (this.isEmbeddedOrPreview) return;
    if (typeof document === 'undefined' || !this.shouldAutoplayMusic()) return;
    if (this.requiresGuestValidation && !this.verifiedGuest) return;
    this.firstInteractionHandler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.nw-pub-audio-btn, [aria-label*="música"], [aria-label*="Música"]')) return;
      this.removeFirstInteractionPlayback();
      const url = this.getAudioUrlForSection(this.currentActiveSection);
      if (url && !this.isPlayingMusic) this.playTrackUrl(url, true, this.currentActiveSection);
    };
    document.addEventListener('pointerdown', this.firstInteractionHandler, true);
    document.addEventListener('keydown', this.firstInteractionHandler, true);
  }

  private removeFirstInteractionPlayback(): void {
    if (!this.firstInteractionHandler || typeof document === 'undefined') return;
    document.removeEventListener('pointerdown', this.firstInteractionHandler, true);
    document.removeEventListener('keydown', this.firstInteractionHandler, true);
    this.firstInteractionHandler = undefined;
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

  extractYouTubeVideoId(url?: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  }

  isYouTubeUrl(url?: string): boolean {
    return Boolean(this.extractYouTubeVideoId(url));
  }

  isSpotifyUrl(url?: string): boolean {
    if (!url) return false;
    return /^(spotify:|https?:\/\/(?:open\.)?spotify\.com\/)/i.test(url.trim());
  }

  private hasAnyYouTubeTrack(): boolean {
    if (this.extractYouTubeVideoId(this.invitation?.content?.musicUrl)) return true;
    const secMusic = this.invitation?.content?.sectionMusic;
    if (!secMusic) return false;
    const values = typeof (secMusic as any).values === 'function' ? Array.from((secMusic as any).values()) : Object.values(secMusic);
    return values.some((v: any) => typeof v === 'string' && Boolean(this.extractYouTubeVideoId(v)));
  }

  private initYouTubeApi(): void {
    if (typeof window === 'undefined') return;
    if ((window as any).YT && (window as any).YT.Player) {
      this.isYtApiLoaded = true;
      this.createYouTubePlayer();
      return;
    }

    if (!this.isYtApiLoaded) {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
      this.isYtApiLoaded = true;
    }

    const prevOnReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prevOnReady === 'function') prevOnReady();
      this.createYouTubePlayer();
    };
  }

  private createYouTubePlayer(): void {
    if (typeof window === 'undefined' || !(window as any).YT || !(window as any).YT.Player) return;
    const container = document.getElementById('nw-pub-yt-player');
    if (!container) return;

    try {
      const initialVideoId = this.extractYouTubeVideoId(this.currentPlayingTrackUrl) || undefined;
      this.ytPlayer = new (window as any).YT.Player('nw-pub-yt-player', {
        height: '1',
        width: '1',
        videoId: initialVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: () => {
            this.isYtReady = true;
            if (this.pendingYtVideoId) {
              const vid = this.pendingYtVideoId;
              this.pendingYtVideoId = undefined;
              this.playYouTubeVideo(vid, true);
            } else if (initialVideoId && this.shouldAutoplayMusic()) {
              this.playYouTubeVideo(initialVideoId, true, this.currentActiveSection);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              this.isPlayingMusic = true;
            } else if (event.data === 2) {
              this.isPlayingMusic = false;
            } else if (event.data === 0) {
              const cue = this.getMusicCue(this.currentActiveSection);
              if (cue.loop && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
                this.ytPlayer.seekTo(cue.startSeconds || 0, true);
                this.ytPlayer.playVideo();
              } else {
                this.isPlayingMusic = false;
              }
            }
          },
          onError: () => {
            this.isPlayingMusic = false;
          }
        }
      });
    } catch (err) {
      console.warn('YouTube Player initialization warning:', err);
    }
  }

  private playYouTubeVideo(videoId: string, forcePlay: boolean = false, sectionKey = this.currentActiveSection): void {
    if (!this.isYtReady || !this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
      this.pendingYtVideoId = videoId;
      if (!this.isYtApiLoaded) {
        this.initYouTubeApi();
      }
      return;
    }

    try {
      const cue = this.getMusicCue(sectionKey);
      this.ytPlayer.setVolume(Math.round((cue.volume ?? 0.7) * 100));
      this.ytPlayer.loadVideoById({ videoId, startSeconds: cue.startSeconds || 0, endSeconds: cue.endSeconds });
      if (forcePlay || this.isPlayingMusic) {
        this.ytPlayer.playVideo();
      }
    } catch (err) {
      console.warn('Error playing YouTube video:', err);
    }
  }

  isSectionMusicPlaying(sectionKey: string): boolean {
    if (!this.isPlayingMusic) return false;
    const targetUrl = this.getSectionSpecificMusicUrl(sectionKey) || this.getAudioUrlForSection(sectionKey);
    return Boolean(targetUrl && this.currentPlayingTrackUrl === targetUrl);
  }

  toggleSectionMusic(sectionKey: string): void {
    const targetUrl = this.getSectionSpecificMusicUrl(sectionKey) || this.getAudioUrlForSection(sectionKey);
    if (!targetUrl) return;

    this.currentActiveSection = sectionKey;

    if (this.isPlayingMusic && this.currentPlayingTrackUrl === targetUrl) {
      const ytId = this.extractYouTubeVideoId(targetUrl);
      if (ytId && this.ytPlayer && this.isYtReady && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      } else if (this.audioRef) {
        this.audioRef.pause();
      }
      this.isPlayingMusic = false;
      return;
    }

    this.playTrackUrl(targetUrl, true, sectionKey);
  }

  getAudioUrlForSection(sectionKey: string): string {
    const specific = this.getSectionSpecificMusicUrl(sectionKey);
    if (specific) return specific;
    if (this.invitation?.content?.musicUrl) return this.invitation.content.musicUrl;
    const tpl = this.currentTemplate;
    if (tpl === 'boda-girasoles') return 'assets/boda-girasoles/all-of-me.mp3';
    if (tpl === 'boda-navy-blue') return 'assets/boda-navy-blue/perfect.mp3';
    if (tpl === 'boda-villa-perle') return 'assets/boda-villa-perle/autumn-wind.mp3';
    if (tpl === 'boda-eleganza') return 'assets/boda-eleganza/waltz-sentimental.mp3';
    if (tpl === 'boda-rosas') return 'assets/boda-rosas/ballerina.mp3';
    if (tpl === 'boda-teatro') return 'assets/boda-teatro/intro-music.mp3';
    return '';
  }

  private initAudio(): void {
    if (this.invitation?.content?.sectionSettings?.backgroundMusic === false) return;
    if (this.isEmbeddedOrPreview) return;
    const initialUrl = this.getAudioUrlForSection('hero') || this.invitation?.content.musicUrl;
    if (!initialUrl) return;

    this.currentPlayingTrackUrl = initialUrl;

    if (this.hasAnyYouTubeTrack()) this.initYouTubeApi();

    const ytId = this.extractYouTubeVideoId(initialUrl);
    if (ytId) return;

    if (this.isSpotifyUrl(initialUrl)) {
      return;
    }

    this.audioRef = new Audio(initialUrl);
    this.configureHtmlAudio('hero', true);
    this.audioRef.onerror = () => {
      this.isPlayingMusic = false;
    };
    if (this.shouldAutoplayMusic()) {
      this.audioRef.play().then(() => {
        this.isPlayingMusic = true;
      }).catch(() => {
        this.isPlayingMusic = false;
      });
    }
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
    if (this.isEmbeddedOrPreview) return;
    if (!this.invitation || !this.isPlayingMusic) return;
    if (this.getMusicSettings().sectionChangeMode === 'manual') return;
    const targetUrl = this.getAudioUrlForSection(sectionKey);
    if (targetUrl) this.playTrackUrl(targetUrl, false, sectionKey);
  }

  playTrackUrl(url: string, forcePlay: boolean = false, sectionKey = this.currentActiveSection): void {
    if (!url) return;
    this.currentPlayingTrackUrl = url;

    const ytId = this.extractYouTubeVideoId(url);
    if (ytId) {
      this.spotifyPlayerVisible = false;
      if (this.audioRef) {
        this.audioRef.pause();
      }
      this.playYouTubeVideo(ytId, forcePlay, sectionKey);
      return;
    }


    if (this.isSpotifyUrl(url)) {
      if (this.audioRef) this.audioRef.pause();
      if (this.ytPlayer && this.isYtReady && typeof this.ytPlayer.pauseVideo === 'function') this.ytPlayer.pauseVideo();
      this.spotifyPlayerVisible = forcePlay || this.spotifyPlayerVisible;
      this.isPlayingMusic = this.spotifyPlayerVisible;
      return;
    }

    this.spotifyPlayerVisible = false;

    if (this.ytPlayer && this.isYtReady && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
    }

    if (!this.audioRef) {
      this.audioRef = new Audio(url);
      this.audioRef.onerror = () => { this.isPlayingMusic = false; };
    } else if (this.audioRef.src !== url) {
      this.audioRef.pause();
      this.audioRef.src = url;
      this.audioRef.load();
    }
    this.configureHtmlAudio(sectionKey, true);

    const shouldPlay = forcePlay || this.isPlayingMusic;
    if (shouldPlay) {
      this.audioRef.play().then(() => {
        this.isPlayingMusic = true;
      }).catch(() => {
        this.isPlayingMusic = false;
      });
    }
  }

  private configureHtmlAudio(sectionKey: string, resetPosition: boolean): void {
    if (!this.audioRef) return;
    const cue = this.getMusicCue(sectionKey);
    this.audioRef.volume = cue.volume ?? 0.7;
    this.audioRef.loop = Boolean(cue.loop && cue.endSeconds === undefined);
    const seekToStart = () => {
      if (!this.audioRef || !resetPosition) return;
      try { this.audioRef.currentTime = cue.startSeconds || 0; } catch { }
    };
    if (this.audioRef.readyState >= 1) seekToStart();
    else this.audioRef.onloadedmetadata = seekToStart;
    this.audioRef.ontimeupdate = () => {
      if (!this.audioRef || cue.endSeconds === undefined || this.audioRef.currentTime < cue.endSeconds) return;
      if (cue.loop) {
        this.audioRef.currentTime = cue.startSeconds || 0;
        void this.audioRef.play();
      } else {
        this.audioRef.pause();
        this.isPlayingMusic = false;
      }
    };
    this.audioRef.onended = () => { if (!cue.loop) this.isPlayingMusic = false; };
  }

  toggleMusic(): void {
    const targetUrl = this.getAudioUrlForSection(this.currentActiveSection) || this.invitation?.content.musicUrl || '';
    if (!targetUrl) return;
    this.removeFirstInteractionPlayback();
    if (this.currentPlayingTrackUrl !== targetUrl) {
      this.playTrackUrl(targetUrl, true, this.currentActiveSection);
      return;
    }

    const ytId = this.extractYouTubeVideoId(targetUrl);
    if (ytId) {
      if (!this.isYtReady || !this.ytPlayer) {
        this.playTrackUrl(targetUrl, true);
        return;
      }
      if (this.isPlayingMusic) {
        this.ytPlayer.pauseVideo();
        this.isPlayingMusic = false;
      } else {
        this.ytPlayer.playVideo();
      }
      return;
    }

    if (this.isSpotifyUrl(targetUrl)) {
      this.spotifyPlayerVisible = !this.spotifyPlayerVisible;
      this.isPlayingMusic = this.spotifyPlayerVisible;
      return;
    }

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

  activateMusicOnPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.suppressNextMusicClick = true;
    if (this.suppressNextMusicClickTimer) clearTimeout(this.suppressNextMusicClickTimer);
    this.suppressNextMusicClickTimer = setTimeout(() => {
      this.suppressNextMusicClick = false;
      this.suppressNextMusicClickTimer = undefined;
    }, 750);
    this.toggleMusic();
  }

  activateMusicOnClick(event: MouseEvent): void {
    if (event.detail > 0 && this.suppressNextMusicClick) {
      this.suppressNextMusicClick = false;
      if (this.suppressNextMusicClickTimer) {
        clearTimeout(this.suppressNextMusicClickTimer);
        this.suppressNextMusicClickTimer = undefined;
      }
      return;
    }
    this.toggleMusic();
  }

  submit(): void {
    if (!this.invitation) return;
    if (this.invitation.id?.startsWith('preview-')) {
      this.showToast('Esta es una vista previa demo. Las confirmaciones de asistencia están deshabilitadas.');
      return;
    }
    if (this.isSimulatingGuest) {
      this.showToast('Modo prueba: Confirmación simulada con éxito.');
      this.success = '¡Confirmación recibida (simulación en modo prueba)!';
      this.cdr?.markForCheck();
      return;
    }
    if (this.requiresGuestValidation && !this.verifiedGuest) {
      this.error = 'Abre tu enlace personal antes de confirmar tu asistencia.';
      return;
    }
    if (this.rsvp.response === 'declined' && this.requiresDeclineConfirmation && !this.declineConfirmed) {
      this.error = 'Confirma que no asistirás antes de enviar tu respuesta.';
      return;
    }
    this.sending = true;
    this.error = '';
    this.success = '';
    const { phoneCountryCode, phoneNationalNumber, companionNames: rsvpCompanionNames, mealPreference, dietaryRestrictions, menuSelection, ...rsvpBase } = this.rsvp as any;
    const cleanDigits = String(phoneNationalNumber || '').replace(/\D/g, '');
    const phonePayload = cleanDigits.length >= 6
      ? { phoneCountryCode: phoneCountryCode || '+52', phoneNationalNumber: cleanDigits }
      : {};
    const resolvedEmail = String(this.verifiedGuest?.email || this.rsvp.email || '').trim();
    const maxAllowed = this.maxCompanions !== null && this.maxCompanions !== undefined ? Math.max(0, Number(this.maxCompanions)) : 10;
    const requestedCompanions = this.isFinalAttendance
      ? Math.max(0, Math.min(maxAllowed, Number(this.rsvp.companions || 0)))
      : 0;
    const resolvedCompanionNames: string[] = this.isFinalAttendance
      ? (Array.isArray(rsvpCompanionNames) && rsvpCompanionNames.length ? rsvpCompanionNames : this.companionNames)
      : [];
    const payload: any = {
      ...rsvpBase,
      ...phonePayload,
      guest: this.verifiedGuest?.id,
      name: this.verifiedGuest?.name || this.rsvp.name,
      ...(resolvedEmail ? { email: resolvedEmail } : {}),
      companions: requestedCompanions,
      companionNames: resolvedCompanionNames,
      ...(this.isFinalAttendance && mealPreference ? { mealPreference } : {}),
      ...(this.isFinalAttendance && dietaryRestrictions ? { dietaryRestrictions } : {}),
      ...(this.isFinalAttendance && menuSelection ? { menuSelection } : {}),
      customAnswers: this.customQuestionAnswers,
      declineConfirmed: this.declineConfirmed
    };
    delete payload.email;
    if (resolvedEmail) payload.email = resolvedEmail;
    this.api.submitRsvp(this.invitation.slug, payload, this.guestSessionToken).subscribe({
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

  scrollToGuestAccess(): void {
    const el = document.getElementById('guest-access-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector('input') as HTMLInputElement | null;
      if (input) {
        setTimeout(() => input.focus(), 400);
      }
    }
  }

  validateAndOpenEnvelope(): void {
    if (this.guestAccessSingleInput) {
      const val = this.guestAccessSingleInput.trim();
      if (val.includes('@')) {
        this.guestAccessEmail = val;
        this.guestAccessPhone = '';
      } else {
        this.guestAccessPhone = val.replace(/\D/g, '');
        this.guestAccessEmail = '';
      }
    }
    this.checkGuestAccess();
  }

  checkGuestAccess(): void {
    if (this.guestAccessSingleInput && (this.accessRequired || (!this.guestAccessEmail && !this.guestAccessPhone))) {
      const val = this.guestAccessSingleInput.trim();
      if (val.includes('@')) {
        this.guestAccessEmail = val;
        this.guestAccessPhone = '';
      } else {
        this.guestAccessPhone = val.replace(/\D/g, '');
        this.guestAccessEmail = '';
      }
    }
    if (!this.guestAccessEmail && !this.guestAccessPhone) return;
    if (this.accessScreenDesign?.requirePin && !this.guestAccessPin.trim()) {
      this.error = 'Por favor ingresa tu NIP de acceso.';
      return;
    }
    const slug = this.invitation?.slug || this.route.snapshot.paramMap.get('slug') || '';
    this.checkingGuest = true;
    this.error = '';
    this.success = '';
    this.api.checkGuestAccess(slug, {
      email: this.guestAccessEmail || undefined,
      phone: this.guestAccessPhone || undefined,
      pin: this.guestAccessPin.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.checkingGuest = false;
        if (res.guest && res.guestSessionToken) {
          this.verifiedGuest = res.guest;
          this.guestSessionToken = res.guestSessionToken;
          sessionStorage.setItem(this.guestSessionStorageKey(slug), res.guestSessionToken);
          if (!this.invitation) {
            this.fetchPublishedInvitation(slug, res.guestSessionToken);
          }
          this.applyVerifiedGuestToRsvp(res.guest, this.guestAccessEmail, this.guestAccessPhone);
          this.loadGuestActivity(false);
          this.showToast(`¡Bienvenido(a), ${res.guest.name}!`);
          this.cdr?.markForCheck();
        } else {
          this.accessMessage = res.message;
          this.success = res.message;
          this.showToast(res.message);
          this.cdr?.markForCheck();
        }
      },
      error: (error) => {
        if (this.isPreviewMode) {
          this.checkingGuest = false;
          this.activateSimulatedGuest();
          this.showToast('Modo prueba: Simulación de pase activada');
          this.cdr?.markForCheck();
          return;
        }
        this.error = error.error?.message || 'No fue posible validar el pase. Intenta más tarde.';
        this.checkingGuest = false;
        this.cdr?.markForCheck();
      }
    });
  }

  toggleAccessGateView(view: 'login' | 'register'): void {
    this.accessGateView = view;
    if (this.showPreviewDeviceToolbar) {
      this.previewSection = view === 'register' ? 'register' : 'access';
    }
    this.error = '';
    this.success = '';
    this.selfRegSubmitted = false;
    this.cdr?.markForCheck();
  }

  submitAccessSelfRegistration(): void {
    const slug = this.invitation?.slug || this.route.snapshot.paramMap.get('slug') || '';
    if (!this.selfRegName.trim()) {
      this.error = 'Por favor ingresa tu nombre completo.';
      return;
    }
    if (!this.selfRegEmail.trim()) {
      this.error = 'Por favor ingresa tu correo electrónico.';
      return;
    }
    this.selfRegSubmitting = true;
    this.error = '';
    this.success = '';

    const requireApproval = this.accessScreenDesign?.selfRegRequireApproval !== false;
    const assignedGroup = this.accessScreenDesign?.selfRegGroup || 'Solicitudes de Acceso';
    const status = requireApproval ? 'pending' : 'confirmed';

    this.api.selfRegisterGuest(slug, {
      name: this.selfRegName.trim(),
      email: this.selfRegEmail.trim(),
      phone: this.selfRegPhone.trim() || undefined,
      companions: Math.max(0, this.selfRegCompanions - 1),
      group: assignedGroup,
      status
    }).subscribe({
      next: (res) => {
        this.selfRegSubmitting = false;
        this.selfRegSubmitted = true;
        const defaultSuccess = '¡Solicitud recibida! Los organizadores revisarán tu petición y te enviarán tu NIP y pase por correo.';
        this.selfRegMessage = this.accessScreenDesign?.selfRegSuccessMessage || defaultSuccess;
        this.success = this.selfRegMessage;

        if (!requireApproval && res.guestSessionToken) {
          this.verifiedGuest = res.guest;
          this.guestSessionToken = res.guestSessionToken;
          sessionStorage.setItem(this.guestSessionStorageKey(slug), res.guestSessionToken);
          this.fetchPublishedInvitation(slug, res.guestSessionToken);
        }
        this.cdr?.markForCheck();
      },
      error: (err) => {
        this.selfRegSubmitting = false;
        this.error = err.error?.message || 'No fue posible enviar tu solicitud. Intenta más tarde.';
        this.cdr?.markForCheck();
      }
    });
  }

  openPassModal(): void {
    if (!this.verifiedGuest) return;
    this.showPassModal = true;
    this.cdr?.markForCheck();
  }

  closePassModal(): void {
    this.showPassModal = false;
    this.cdr?.markForCheck();
  }

  resetGuestAccess(): void {
    const wasRestricted = this.requiresGuestValidation;
    this.isSimulatingGuest = false;
    if (this.invitation) sessionStorage.removeItem(this.guestSessionStorageKey(this.invitation.slug));
    if (this.guestActivityTimer) clearInterval(this.guestActivityTimer);
    this.guestSessionToken = '';
    this.guestActivity = undefined;
    this.verifiedGuest = undefined;
    this.showPassModal = false;
    this.guestAccessPhone = '';
    this.guestAccessEmail = '';
    this.guestAccessSingleInput = '';
    this.guestAccessPin = '';
    this.isOpeningVipEnvelope = false;
    this.guestSubmittedSongsCount = 0;
    this.success = '';
    this.error = '';
    this.declineConfirmed = false;
    this.companionNamesText = '';
    this.customAnswers = {};
    this.rsvp = { name: '', email: '', response: 'confirmed' as RsvpResponse, companions: 0, dietaryRestrictions: '', mealPreference: '', menuSelection: '', message: '', phoneCountryCode: '+52', phoneNationalNumber: '' };
    if (wasRestricted) {
      this.invitation = undefined;
      this.accessRequired = true;
      this.accessMessage = 'Solicita un enlace personal para volver a entrar.';
    }
  }

  submitRsvp(): void {
    this.submit();
  }

  openGuestActivity(): void {
    if (!this.invitation) return;
    window.location.assign(`/new/i/${encodeURIComponent(this.invitation.slug)}/my-activity`);
  }

  get accessScreenDesign(): VisualAccessScreenDesign | undefined {
    return this.accessGateData?.accessScreen
      || this.invitation?.content?.visualDesign?.accessScreen
      || this.invitation?.content?.accessScreen
      || undefined;
  }

  get currentAccessTemplateKey(): string {
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    if (queryTpl) {
      return queryTpl;
    }
    if (this.accessScreenDesign?.templateKey && this.accessScreenDesign.templateKey !== 'visual-builder') {
      return this.accessScreenDesign.templateKey;
    }
    if (this.accessGateData?.template && this.accessGateData.template !== 'visual-builder') {
      return this.accessGateData.template;
    }
    if (this.invitation && this.currentTemplate !== 'visual-builder') {
      return this.currentTemplate;
    }
    return this.accessScreenDesign?.templateKey || 'envelope-cards';
  }

  get effectiveAccessDesign(): VisualAccessScreenDesign | undefined {
    const acc = this.accessScreenDesign;
    if (!acc) return undefined;

    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';

    // When viewing a specific template via URL (?tpl=...) or in clean preview, use that template's preset
    if (queryTpl || isCleanRequested) {
      return undefined;
    }

    // When stored design is from an older schema or belongs to a different template
    if (isLegacyOrMismatchedAccessScreen(acc, this.currentAccessTemplateKey)) {
      return undefined;
    }

    return acc;
  }

  get accessAccentColor(): string {
    return this.effectiveAccessDesign?.accentColor || this.currentAccessPreset.theme.accentColor;
  }

  get accessTextColor(): string {
    return this.effectiveAccessDesign?.textColor || this.currentAccessPreset.theme.textColor;
  }

  get accessBorderColor(): string {
    return (this.effectiveAccessDesign?.accentColor || this.currentAccessPreset.theme.accentColor) + '44';
  }

  get accessBadgeBorderColor(): string {
    return (this.effectiveAccessDesign?.accentColor || this.currentAccessPreset.theme.accentColor) + '66';
  }

  get accessSubtitleTextColor(): string {
    return (this.effectiveAccessDesign?.textColor || this.currentAccessPreset.theme.textColor) + 'cc';
  }

  get accessFooterTextColor(): string {
    return (this.effectiveAccessDesign?.textColor || this.currentAccessPreset.theme.textColor) + '88';
  }

  get accessShowBadge(): boolean {
    return this.effectiveAccessDesign?.showBadge !== false;
  }

  get accessLogoUrl(): string | undefined {
    return this.effectiveAccessDesign?.logoUrl;
  }

  get accessRequirePin(): boolean {
    return Boolean(this.effectiveAccessDesign?.requirePin);
  }

  get accessAllowSelfRegistration(): boolean {
    return this.effectiveAccessDesign?.allowSelfRegistration !== false;
  }

  get currentAccessPreset(): TemplateAccessScreenPreset {
    return getTemplateAccessPreset(this.currentAccessTemplateKey);
  }

  private cachedCrestKey = '';
  private cachedCrestSafeHtml: SafeHtml = '';
  private cachedOrnamentKey = '';
  private cachedCornerSafeHtml: SafeHtml = '';
  private cachedDividerSafeHtml: SafeHtml = '';
  private cachedTopArtSafeHtml: SafeHtml = '';

  get currentAccessEnhancement(): TemplateAccessVisualEnhancement {
    return getTemplateVisualEnhancement(this.currentAccessPreset.templateId);
  }

  private ensureOrnamentCache(): void {
    const preset = this.currentAccessPreset;
    const accent = this.accessAccentColor;
    const primary = preset.theme.primaryColor || accent;
    const cacheKey = `${preset.templateId}|${accent}|${primary}`;
    if (this.cachedOrnamentKey === cacheKey) return;

    this.cachedOrnamentKey = cacheKey;
    const enh = this.currentAccessEnhancement;
    this.cachedCornerSafeHtml = this.sanitizer.bypassSecurityTrustHtml(
      getCornerOrnamentSvg(enh.cornerStyle, accent)
    );
    this.cachedDividerSafeHtml = this.sanitizer.bypassSecurityTrustHtml(
      getDividerFlourishSvg(enh.dividerStyle, accent)
    );
    this.cachedTopArtSafeHtml = this.sanitizer.bypassSecurityTrustHtml(
      getTopHeaderArtworkSvg(enh.frameVariant, accent, primary)
    );
  }

  get currentAccessCornerSafe(): SafeHtml {
    this.ensureOrnamentCache();
    return this.cachedCornerSafeHtml;
  }

  get currentAccessDividerSafe(): SafeHtml {
    this.ensureOrnamentCache();
    return this.cachedDividerSafeHtml;
  }

  get currentAccessTopArtSafe(): SafeHtml {
    this.ensureOrnamentCache();
    return this.cachedTopArtSafeHtml;
  }

  get currentAccessBackdropPatternStyle(): Record<string, string> {
    const preset = this.currentAccessPreset;
    const enh = this.currentAccessEnhancement;
    const accent = this.accessAccentColor;
    return {
      'background-image': getBackdropPatternDataUri(enh.backdropPattern, accent)
    };
  }

  get currentAccessAmbientOrbStyle(): Record<string, string> {
    const enh = this.currentAccessEnhancement;
    return {
      background: `radial-gradient(circle, ${enh.ambientGlowColor} 0%, transparent 70%)`
    };
  }

  get currentAccessSecondaryOrbStyle(): Record<string, string> {
    const enh = this.currentAccessEnhancement;
    return {
      background: `radial-gradient(circle, ${enh.secondaryGlowColor} 0%, transparent 70%)`
    };
  }

  get currentAccessCrestSafe(): SafeHtml {
    const key = this.currentAccessTemplateKey;
    if (this.cachedCrestKey === key && this.cachedCrestSafeHtml) {
      return this.cachedCrestSafeHtml;
    }
    this.cachedCrestKey = key;
    const svg = this.currentAccessPreset.decorations.crestSvg;
    this.cachedCrestSafeHtml = this.sanitizer.bypassSecurityTrustHtml(svg);
    return this.cachedCrestSafeHtml;
  }

  get currentAccessSpecialEffect(): string {
    return this.currentAccessPreset.decorations.specialEffect || 'none';
  }

  getAccessGateBackgroundStyle(): Record<string, string> {
    const acc = this.effectiveAccessDesign;
    const preset = this.currentAccessPreset;

    if (acc?.backgroundType === 'image' && (acc.backgroundImageUrl || this.accessGateData?.coverImageUrl)) {
      const url = acc.backgroundImageUrl || this.accessGateData?.coverImageUrl;
      return {
        'background-image': `url("${url}")`,
        'background-size': 'cover',
        'background-position': 'center center'
      };
    }
    if (acc?.backgroundType === 'gradient' && acc.backgroundGradient) {
      return {
        'background': acc.backgroundGradient
      };
    }
    if (acc?.backgroundType === 'color' && acc.backgroundColor) {
      return {
        'background-color': acc.backgroundColor
      };
    }
    if (preset.theme.backgroundType === 'image' && preset.theme.backgroundImageUrl && !acc?.backgroundGradient) {
      return {
        'background-image': `url("${preset.theme.backgroundImageUrl}")`,
        'background-size': 'cover',
        'background-position': 'center center'
      };
    }
    if (preset.theme.backgroundGradient) {
      return {
        'background': preset.theme.backgroundGradient
      };
    }
    if (acc?.backgroundColor) {
      return {
        'background-color': acc.backgroundColor
      };
    }
    return {
      'background-color': preset.theme.backgroundColor || '#0b111e'
    };
  }

  getAccessGateOverlayStyle(): string {
    const acc = this.effectiveAccessDesign;
    const preset = this.currentAccessPreset;
    if (acc && acc.backgroundOverlayOpacity !== undefined && acc.backgroundOverlayOpacity !== null) {
      const raw = Number(acc.backgroundOverlayOpacity);
      const opacity = Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw));
      return opacity > 0 ? `rgba(0, 0, 0, ${opacity})` : 'transparent';
    }
    const isImage = acc?.backgroundType === 'image' || (preset.theme.backgroundType === 'image' && !acc?.backgroundGradient);
    if (isImage) {
      const opacity = Math.min((preset.theme.backgroundOverlayOpacity ?? 50) / 100, 0.75);
      return `rgba(0, 0, 0, ${opacity})`;
    }
    return 'transparent';
  }

  getAccessGateCardStyle(): Record<string, string> {
    const acc = this.effectiveAccessDesign;
    const preset = this.currentAccessPreset;
    const theme = preset.theme;
    const radius = acc?.cardRadius !== undefined ? acc.cardRadius : theme.cardRadius;
    const style: Record<string, string> = {
      'border-radius': `${radius}px`
    };

    if (acc?.cardStyle === 'minimal') {
      style['background'] = 'transparent';
      style['box-shadow'] = 'none';
      style['border'] = 'none';
      return style;
    }

    const bgHex = acc?.cardBgColor || theme.cardBgColor;
    if (bgHex.startsWith('rgba') || bgHex.startsWith('rgb')) {
      style['background'] = bgHex;
    } else {
      const opacity = (acc?.cardOpacity ?? theme.cardOpacity) / 100;
      const hex = bgHex.replace('#', '');
      const r = parseInt(hex.substring(0, 2) || 'ff', 16);
      const g = parseInt(hex.substring(2, 4) || 'ff', 16);
      const b = parseInt(hex.substring(4, 6) || 'ff', 16);
      style['background'] = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    const blur = acc?.backgroundBlur || theme.backgroundBlur || 12;
    style['backdrop-filter'] = `blur(${blur}px)`;
    style['-webkit-backdrop-filter'] = `blur(${blur}px)`;

    const border = theme.cardBorder || `1.5px solid ${this.accessAccentColor}`;
    style['border'] = border;

    const shadow = acc?.cardShadow || theme.cardShadow;
    if (shadow === 'soft') {
      style['box-shadow'] = '0 12px 36px rgba(0, 0, 0, 0.12)';
    } else if (shadow === 'elevated') {
      style['box-shadow'] = '0 24px 50px -12px rgba(0, 0, 0, 0.28)';
    } else if (shadow === 'glow') {
      const glowColor = theme.cardBorderGlow || 'rgba(197, 155, 108, 0.25)';
      style['box-shadow'] = `0 24px 60px rgba(0, 0, 0, 0.55), 0 0 35px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.15)`;
    } else {
      style['box-shadow'] = 'none';
    }

    return style;
  }

  hasAccessLayers(): boolean {
    const acc = this.effectiveAccessDesign;
    if (!acc?.layers || acc.layers.length === 0) return false;
    const hasCustomUserLayers = acc.layers.some(l =>
      Boolean(l.id) && !l.id.startsWith('layer-access-') && !l.id.startsWith('layer-selfreg-')
    );
    // When an access screen preset is active (e.g. envelope-cards), use the bespoke template card
    // unless custom user layers were specifically added
    if (acc.templateKey && acc.templateKey !== 'visual-builder') {
      return hasCustomUserLayers;
    }
    const isVisualBuilder = this.currentAccessTemplateKey === 'visual-builder';
    return isVisualBuilder || hasCustomUserLayers;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.cdr?.markForCheck();
  }

  get currentDevice(): 'mobile' | 'tablet' | 'desktop' {
    if (this.showPreviewDeviceToolbar && this.previewDevice) {
      return this.previewDevice;
    }
    if (typeof window === 'undefined') return 'mobile';
    const width = window.innerWidth;
    return width <= 600 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop';
  }

  get accessSurfaceDimensionsStyle(): Record<string, string> {
    const dev = this.currentDevice;
    const isIndependent = this.accessGateData?.responsiveMode === 'independent' ||
      (this.accessScreenDesign as any)?.responsiveMode === 'independent' ||
      this.invitation?.content?.visualDesign?.responsiveMode === 'independent';
    const hasIndependentDesktopLayout = isIndependent && Boolean(
      this.effectiveAccessDesign?.layers?.some((l) => Boolean(l.layouts?.desktop))
    );
    if (dev === 'desktop') {
      return {
        'max-width': hasIndependentDesktopLayout ? '1180px' : '460px',
        'height': '780px'
      };
    }
    if (dev === 'tablet') {
      return {
        'max-width': hasIndependentDesktopLayout ? '768px' : '460px',
        'height': '780px'
      };
    }
    return {
      'max-width': '390px',
      'height': '780px'
    };
  }

  shouldRenderAccessGateLayer(layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    const isRegisterLayer = binding.startsWith('selfReg.');
    const isLoginLayer = binding.startsWith('access.') && binding !== 'access.card';
    if (this.accessGateView === 'register') {
      if (isLoginLayer) return false;
      return true;
    } else {
      if (isRegisterLayer) return false;
      if (binding === 'access.pin' && !this.accessScreenDesign?.requirePin) return false;
      if (binding === 'access.selfRegLink' && !this.accessScreenDesign?.allowSelfRegistration) return false;
      return true;
    }
  }

  accessLayerStyle(layer: VisualInvitationLayer): Record<string, string> {
    const dev = this.currentDevice;
    const isIndependent = this.accessGateData?.responsiveMode === 'independent' ||
      (this.accessScreenDesign as any)?.responsiveMode === 'independent' ||
      this.invitation?.content?.visualDesign?.responsiveMode === 'independent';

    const layout = (isIndependent && layer.layouts?.[dev])
      ? layer.layouts[dev]!
      : (layer.layouts?.[dev] || layer);

    const responsiveScale = isIndependent ? 1 : (dev === 'mobile' ? 0.68 : dev === 'tablet' ? 0.84 : 1);

    const style: Record<string, string> = {
      position: 'absolute',
      left: `${layout.x}%`,
      top: `${layout.y}%`,
      width: `${layout.width}%`,
      height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`,
      'z-index': `${layer.zIndex || 1}`,
      'box-sizing': 'border-box'
    };
    const s = layer.style || {};
    if (s.color) style['color'] = s.color;
    if (s.fontFamily) style['fontFamily'] = s.fontFamily;
    if (s.fontSize) style['fontSize'] = `${Math.round(Math.max(10, Number(s.fontSize || 16) * responsiveScale) * 100) / 100}px`;
    if (s.fontWeight) style['fontWeight'] = `${s.fontWeight}`;
    if (s.textAlign) {
      style['textAlign'] = s.textAlign;
      if (s.textAlign === 'left') {
        style['justifyContent'] = 'flex-start';
      } else if (s.textAlign === 'right') {
        style['justifyContent'] = 'flex-end';
      } else {
        style['justifyContent'] = 'center';
      }
    }
    if (s.letterSpacing) style['letterSpacing'] = `${Math.round(Number(s.letterSpacing || 0) * responsiveScale * 100) / 100}px`;
    if (s.lineHeight) style['lineHeight'] = `${s.lineHeight}`;
    if (s.textTransform) style['textTransform'] = s.textTransform;
    if (s.textDecoration) style['textDecoration'] = s.textDecoration;
    if (s.backgroundColor) style['backgroundColor'] = s.backgroundColor;
    if (s.borderColor) style['borderColor'] = s.borderColor;
    if (s.borderWidth !== undefined && s.borderWidth !== null) {
      style['borderWidth'] = `${Math.round(Number(s.borderWidth || 0) * responsiveScale * 100) / 100}px`;
      style['borderStyle'] = s.borderStyle || 'solid';
    } else if (s.borderStyle) {
      style['borderStyle'] = s.borderStyle;
    }
    if (s.borderRadius !== undefined && s.borderRadius !== null) {
      style['borderRadius'] = `${Math.round(Number(s.borderRadius || 0) * responsiveScale * 100) / 100}px`;
    }
    if (s.padding) style['padding'] = `${Math.round(Number(s.padding || 0) * responsiveScale * 100) / 100}px`;
    if (s.boxShadow) style['boxShadow'] = s.boxShadow;
    if (s.gradientEnabled) {
      style['backgroundImage'] = `linear-gradient(${Number(s.gradientAngle || 0)}deg,${String(s.gradientStart || '#ffffff')},${String(s.gradientEnd || '#000000')})`;
    }
    if (s.backdropFilter) {
      style['backdropFilter'] = s.backdropFilter;
      style['-webkit-backdrop-filter'] = s.backdropFilter;
    }
    if (s.opacity !== undefined && s.opacity !== null) {
      const op = Number(s.opacity);
      style['opacity'] = `${op > 1 ? op / 100 : op}`;
    }
    return style;
  }

  getAccessGateHeadingFont(): string {
    return this.effectiveAccessDesign?.headingFont
      || this.accessGateData?.theme?.headingFont
      || this.currentAccessPreset.theme.headingFont;
  }

  getAccessGateBodyFont(): string {
    return this.effectiveAccessDesign?.bodyFont
      || this.accessGateData?.theme?.bodyFont
      || this.currentAccessPreset.theme.bodyFont;
  }

  getAccessGateTitle(): string {
    return this.effectiveAccessDesign?.title
      || this.currentAccessPreset.texts.defaultTitle;
  }

  getAccessGateSubtitle(): string {
    return this.effectiveAccessDesign?.subtitle
      || this.currentAccessPreset.texts.defaultSubtitle;
  }

  getAccessGateBadgeText(): string {
    return this.effectiveAccessDesign?.badgeText
      || this.currentAccessPreset.texts.badgeText;
  }

  getAccessGateInputLabel(): string {
    return this.effectiveAccessDesign?.inputLabel
      || this.currentAccessPreset.texts.inputLabel;
  }

  getAccessGateInputPlaceholder(): string {
    return this.effectiveAccessDesign?.inputPlaceholder
      || this.currentAccessPreset.texts.inputPlaceholder;
  }

  getAccessGatePinInputLabel(): string {
    return this.effectiveAccessDesign?.pinInputLabel
      || this.currentAccessPreset.texts.pinInputLabel;
  }

  getAccessGatePinInputPlaceholder(): string {
    return this.effectiveAccessDesign?.pinInputPlaceholder
      || this.currentAccessPreset.texts.pinInputPlaceholder;
  }

  getAccessGateButtonText(): string {
    return this.effectiveAccessDesign?.buttonText
      || this.currentAccessPreset.texts.buttonText;
  }

  getAccessGateSelfRegTitle(): string {
    return this.effectiveAccessDesign?.selfRegTitle
      || this.currentAccessPreset.texts.selfRegTitle;
  }

  getAccessGateSelfRegSubtitle(): string {
    return this.effectiveAccessDesign?.selfRegSubtitle
      || this.currentAccessPreset.texts.selfRegSubtitle;
  }

  getAccessGateSelfRegButtonText(): string {
    return this.effectiveAccessDesign?.selfRegButtonText
      || this.currentAccessPreset.texts.selfRegButtonText;
  }

  getAccessGateButtonStyle(): Record<string, string> {
    const acc = this.effectiveAccessDesign;
    const theme = this.currentAccessPreset.theme;
    const bg = acc?.buttonBgColor || theme.buttonBgColor;
    const text = acc?.buttonTextColor || theme.buttonTextColor;
    const radius = acc?.buttonRadius ?? theme.buttonRadius ?? 12;
    return {
      'background-color': bg,
      'color': text,
      'border-radius': `${radius}px`
    };
  }

  getAccessGateInputStyle(): Record<string, string> {
    const theme = this.currentAccessPreset.theme;
    return {
      'background-color': theme.inputBgColor,
      'border-color': theme.inputBorderColor,
      'color': theme.inputTextColor
    };
  }

  updateGuestActivityRsvp(payload: { response: RsvpResponse; companions: number; companionNames: string[]; message: string; declineConfirmed?: boolean }): void {
    if (!this.invitation || !this.guestSessionToken) return;
    this.runGuestActivityAction(
      this.api.updateInvitationGuestRsvp(this.invitation.slug, this.guestSessionToken, payload),
      'Tu confirmación fue actualizada.'
    );
  }

  removeGuestActivityItem(item: { kind: 'album' | 'song' | 'dedication'; id: string }): void {
    if (!this.invitation || !this.guestSessionToken || !item.id) return;
    const label = item.kind === 'album' ? 'fotografía' : item.kind === 'song' ? 'solicitud de canción' : 'dedicatoria';
    if (!window.confirm(`¿Retirar esta ${label} pendiente?`)) return;
    const request = item.kind === 'album'
      ? this.api.removeInvitationGuestPhoto(this.invitation.slug, item.id, this.guestSessionToken)
      : item.kind === 'song'
        ? this.api.removeInvitationGuestSong(this.invitation.slug, item.id, this.guestSessionToken)
        : this.api.removeInvitationGuestDedication(this.invitation.slug, item.id, this.guestSessionToken);
    this.runGuestActivityAction(request, `${label.charAt(0).toUpperCase()}${label.slice(1)} retirada.`);
  }

  updateGuestActivityDedication(payload: { id: string; publicName?: string; message: string; visibility?: 'public' | 'hosts_only' }): void {
    if (!this.invitation || !this.guestSessionToken) return;
    this.runGuestActivityAction(
      this.api.updateInvitationGuestDedication(this.invitation.slug, payload.id, this.guestSessionToken, payload),
      'Dedicatoria actualizada.'
    );
  }

  private runGuestActivityAction(request: { subscribe: Function }, message: string): void {
    this.sending = true;
    this.error = '';
    request.subscribe({
      next: () => {
        this.sending = false;
        this.success = message;
        this.loadGuestActivity(false);
      },
      error: (error: any) => {
        this.sending = false;
        this.error = error.error?.message || 'No se pudo completar la acción.';
      }
    });
  }

  private guestSessionStorageKey(slug: string): string {
    return `kyndra_guest_session_${slug}`;
  }

  private setGuestActivitySession(slug: string, token?: string): void {
    if (!token) return;
    this.guestSessionToken = token;
    sessionStorage.setItem(this.guestSessionStorageKey(slug), token);
    this.loadGuestActivity();
    if (this.guestActivityTimer) clearInterval(this.guestActivityTimer);
    this.guestActivityTimer = setInterval(() => this.loadGuestActivity(false), 15000);
  }

  private restoreGuestActivitySession(slug: string): void {
    const token = sessionStorage.getItem(this.guestSessionStorageKey(slug)) || '';
    if (!token) return;
    this.guestSessionToken = token;
    this.loadGuestActivity();
    if (this.guestActivityTimer) clearInterval(this.guestActivityTimer);
    this.guestActivityTimer = setInterval(() => this.loadGuestActivity(false), 15000);
  }

  private loadGuestActivity(showLoading = true): void {
    if (!this.invitation || !this.guestSessionToken) return;
    if (showLoading) this.guestActivityLoading = true;
    this.api.getInvitationGuestStatus(this.invitation.slug, this.guestSessionToken).subscribe({
      next: (activity) => {
        const hadActivity = Boolean(this.guestActivity);
        const previousKeys = new Set(this.activityNotifications.map((item) => `${item.key}:${item.status}`));
        this.syncActivityNotifications(activity);
        const newestNotice = this.activityNotifications.find((item) => !previousKeys.has(`${item.key}:${item.status}`));
        this.guestActivity = activity;
        this.verifiedGuest = activity.guest;
        this.applyVerifiedGuestToRsvp(activity.guest);
        this.guestSubmittedSongsCount = activity.songRequests.length;
        this.guestActivityLoading = false;
        if (hadActivity && newestNotice) this.showToast(newestNotice.title);
      },
      error: (error) => {
        this.guestActivityLoading = false;
        if (error.status === 401 || error.status === 403) {
          sessionStorage.removeItem(this.guestSessionStorageKey(this.invitation!.slug));
          this.guestSessionToken = '';
          this.guestActivity = undefined;
          if (this.guestActivityTimer) clearInterval(this.guestActivityTimer);
          if (this.requiresGuestValidation) {
            this.invitation = undefined;
            this.accessRequired = true;
            this.accessMessage = 'Tu sesión terminó. Abre tu enlace personal para continuar.';
          }
        }
      }
    });
  }

  markGuestActivityNotificationsRead(): void {
    if (!this.invitation || !this.guestActivity) return;
    const reviewed = this.reviewedActivityItems(this.guestActivity);
    const seen = reviewed.reduce((result, item) => ({ ...result, [item.key]: item.status }), {} as Record<string, string>);
    localStorage.setItem(this.activitySeenStorageKey(this.invitation.slug, this.guestActivity.guest.id), JSON.stringify(seen));
    this.activityNotifications = [];
  }

  private syncActivityNotifications(activity: ExternalGuestStatusResponse): void {
    if (!this.invitation) return;
    let seen: Record<string, string> = {};
    try { seen = JSON.parse(localStorage.getItem(this.activitySeenStorageKey(this.invitation.slug, activity.guest.id)) || '{}'); } catch { seen = {}; }
    this.activityNotifications = this.reviewedActivityItems(activity).filter((item) => seen[item.key] !== item.status);
  }

  private reviewedActivityItems(activity: ExternalGuestStatusResponse): GuestActivityNotification[] {
    const notices: GuestActivityNotification[] = [];
    for (const item of activity.albumUploads || []) {
      const id = item.id || item._id || '';
      if (id && item.status !== 'pending') notices.push({ key: `album:${id}`, kind: 'album', itemId: id, status: item.status, title: item.status === 'approved' ? 'Tu fotografía fue aprobada' : 'Tu fotografía fue rechazada' });
    }
    for (const item of activity.songRequests || []) {
      const id = item.id || item._id || '';
      if (id && item.status !== 'pending') notices.push({ key: `song:${id}`, kind: 'song', itemId: id, status: item.status, title: item.status === 'played' ? `El DJ marcó “${item.title}” como tocada` : item.status === 'approved' ? `Tu canción “${item.title}” fue aprobada` : `Tu canción “${item.title}” fue rechazada` });
    }
    for (const item of activity.dedications || []) {
      const id = item.id || item._id || '';
      if (id && item.status !== 'pending') notices.push({ key: `dedication:${id}`, kind: 'dedication', itemId: id, status: item.status, title: item.status === 'approved' ? 'Tu dedicatoria fue aprobada' : 'Tu dedicatoria fue rechazada' });
    }
    return notices;
  }

  private activitySeenStorageKey(slug: string, guestId: string): string {
    return `kyndra_activity_seen_${slug}_${guestId}`;
  }

  submitVisualRsvp(data: {
    name: string;
    email: string;
    response: RsvpResponse;
    companions: number;
    dietaryRestrictions: string;
    message: string;
  }): void {
    this.rsvp = { ...this.rsvp, ...data };
    this.submit();
  }

  onSelfRegistered(res: any): void {
    if (res?.guest) {
      this.verifiedGuest = res.guest;
      if (res.guestSessionToken) {
        this.guestSessionToken = res.guestSessionToken;
        if (this.invitation?.slug) {
          sessionStorage.setItem(this.guestSessionStorageKey(this.invitation.slug), res.guestSessionToken);
        }
      }
    }
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
      guest: this.verifiedGuest?.id,
      guestSessionToken: this.guestSessionToken || undefined
    }).subscribe({
      next: () => {
        this.albumMessage = '¡Foto enviada para revisión!';
        this.selectedAlbumFile = undefined;
        this.uploadingAlbum = false;
        this.showToast('Foto enviada con éxito');
        this.loadGuestActivity(false);
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
    }, this.guestSessionToken).subscribe({
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
    if (!this.invitation?.content.privateAlbumEnabled || this.isLandingDraftSlug(this.invitation?.slug)) return;
    this.api.listPublicAlbum(this.invitation.slug, this.guestSessionToken).subscribe({
      next: ({ assets }) => {
        this.publicAlbumAssets = assets;
        this.updateAllAlbumAssets();
      },
      error: () => {
        this.publicAlbumAssets = [];
        this.updateAllAlbumAssets();
      }
    });
  }

  loadDedications(): void {
    if (this.invitation?.content.dedicationSettings?.enabled === false || this.isLandingDraftSlug(this.invitation?.slug)) return;
    this.api.listPublicInvitationDedications(this.invitation?.slug || '', this.guestSessionToken).subscribe({
      next: ({ dedications }) => this.dedications = dedications,
      error: () => this.dedications = []
    });
  }

  get isCustomPassActive(): boolean {
    const content = this.invitation?.content;
    const passType = content?.passType || (content?.useCustomPass ? 'custom' : 'generic');
    return passType === 'custom' && Boolean(content?.passDesign?.sections?.length);
  }

  evalPassText(rawText?: string): string {
    if (!rawText) return '';
    let text = rawText;
    const g = this.verifiedGuest || {
      name: 'Invitado Especial',
      tableName: 'Asignada en recepción',
      seatLabel: '',
      allowedCompanions: 1,
      checkInCode: 'VIP-001'
    };

    text = text.replace(/\{\{guest\.name\}\}|\{nombre\}|\{invitado\}/gi, g.name || 'Invitado Especial');
    text = text.replace(/\{\{guest\.table\}\}|\{mesa\}/gi, g.tableName || 'Asignada en recepción');
    text = text.replace(/\{\{guest\.seat\}\}|\{asiento\}/gi, g.seatLabel || '');
    text = text.replace(/\{\{guest\.companions\}\}|\{pases\}|\{lugares\}|\{acompañantes\}/gi, String((g.allowedCompanions || 0) + 1));
    text = text.replace(/\{\{guest\.checkInCode\}\}|\{codigo\}|\{checkin\}/gi, g.checkInCode || 'VIP-001');

    const evTitle = this.event?.title || this.invitation?.content?.headline || 'Nuestra Celebración';
    const evDate = this.eventDateFormatted || (this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');
    const evVenue = this.invitation?.content?.locations?.[0]?.address || this.invitation?.content?.locations?.[0]?.name || this.event?.venue?.name || '';

    text = text.replace(/\{\{event\.title\}\}|\{evento\}/gi, evTitle);
    text = text.replace(/\{\{event\.date\}\}|\{fecha\}/gi, evDate);
    text = text.replace(/\{\{event\.venue\}\}|\{lugar\}|\{direccion\}/gi, evVenue);
    text = text.replace(/\{\{event\.time\}\}|\{hora\}/gi, (this.event as any)?.time || '');

    return text;
  }

  evalPassImageUrl(layer: any): string {
    if (layer.binding === 'pass.qrCode' || layer.binding === 'guest.qrCode' || (layer.text && layer.text.toLowerCase().includes('qr'))) {
      return this.guestQrUrl || '';
    }
    return layer.url || '';
  }

  getPassSheetWidth(section: any): number {
    return section?.width || this.invitation?.content?.passDesign?.canvasSize?.width || 420;
  }

  getPassSheetHeight(section: any): number {
    return section?.height || this.invitation?.content?.passDesign?.canvasSize?.height || 680;
  }

  downloadGuestPass(): void {
    if (!this.verifiedGuest || !this.invitation) return;

    const gId = (this.verifiedGuest as any)._id || (this.verifiedGuest as any).id;
    if (gId) {
      this.api.downloadGuestPassImage(gId).subscribe({
        next: (blob: Blob) => {
          const safeName = (this.verifiedGuest?.name || 'Invitado').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Pase_${safeName}.png`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.printFallbackPassHtml();
        }
      });
      return;
    }

    this.printFallbackPassHtml();
  }

  printFallbackPassHtml(): void {
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
      brandLogoUrl: this.invitation.content.passLogoUrl || this.invitation.content.brandLogoUrl,
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
    this.cdr?.markForCheck();
    setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = '';
        this.cdr?.markForCheck();
      }
    }, 3500);
  }

  private cachedCurrentTemplate?: string;
  private lastTemplateInvitationRef?: InvitationModel;

  get currentTemplate(): string {
    if (this.cachedCurrentTemplate && this.lastTemplateInvitationRef === this.invitation) {
      return this.cachedCurrentTemplate;
    }
    this.lastTemplateInvitationRef = this.invitation;
    this.cachedCurrentTemplate = this.computeCurrentTemplate();
    return this.cachedCurrentTemplate;
  }

  private computeCurrentTemplate(): string {
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    if (queryTpl && (this.isOwnerOrInEditor || this.isPreviewMode || isCleanRequested || this.route.snapshot.queryParamMap.has('previewId') || this.invitation?.id?.startsWith('preview-'))) {
      return queryTpl;
    }

    if (this.detectedSourceTemplate) {
      return this.detectedSourceTemplate;
    }

    const invContentTpl = (this.invitation?.content as any)?.template;
    if (invContentTpl && invContentTpl !== 'visual-builder') {
      return invContentTpl;
    }

    if (this.invitation?.content?.visualDesign?.active && (!invContentTpl || invContentTpl === 'visual-builder')) {
      return 'visual-builder';
    }
    if (invContentTpl === 'visual-builder') {
      return 'visual-builder';
    }

    const slug = this.invitation?.slug || this.route.snapshot.paramMap.get('slug') || '';
    const invId = this.invitation?._id || this.invitation?.id;

    // Check if source template was explicitly set to a native template
    const sourceTpl =
      this.invitation?.content?.sourceTemplateKey ||
      (slug && typeof localStorage !== 'undefined' ? localStorage.getItem(`inv_source_tpl_${slug}`) : null) ||
      (invId && typeof localStorage !== 'undefined' ? localStorage.getItem(`inv_source_tpl_${invId}`) : null);

    if (sourceTpl && sourceTpl !== 'custom-html') {
      return sourceTpl;
    }

    if (invContentTpl === 'custom-html' || invContentTpl === 'html-css' || invContentTpl === 'custom') {
      return 'custom-html';
    }

    const storedTpl = (slug && typeof localStorage !== 'undefined' ? localStorage.getItem(`inv_tpl_${slug}`) : null) || (invId && typeof localStorage !== 'undefined' ? localStorage.getItem(`inv_tpl_${invId}`) : null);
    if (storedTpl === 'custom-html') {
      return 'custom-html';
    }

    // If custom HTML code exists and is not a native template overlay, it's custom-html
    if (Boolean(this.customHtmlContent?.trim())) {
      return 'custom-html';
    }

    if (invContentTpl) {
      return invContentTpl;
    }

    if (storedTpl) {
      return storedTpl;
    }

    const invRootTpl = (this.invitation?.template && !/^[0-9a-fA-F]{24}$/.test(this.invitation.template)) ? this.invitation.template : null;
    if (invRootTpl) return invRootTpl;

    // Resolución por tipo de evento
    const rawEventType = this.event?.type || (typeof this.invitation?.event === 'object' ? (this.invitation.event as EventModel).type : '') || (this.invitation as any)?.eventType || '';
    const eventType = String(rawEventType).toLowerCase().trim();
    if (eventType === 'boda') return 'template-boda';
    if (eventType === 'xv') return 'template-xv';
    if (eventType === 'graduacion') return 'template-graduacion';
    if (eventType === 'cumpleanos' || eventType === 'cumpleaños') return 'template-cumpleanos';
    if (eventType === 'bautizo') return 'template-bautizo';
    if (eventType === 'otro') return 'template-otro';

    return 'envelope-cards';
  }

  isCustomHtmlTemplate(): boolean {
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    if (isCleanRequested) {
      return false;
    }
    if (queryTpl && queryTpl !== 'custom-html' && queryTpl !== 'html-css' && queryTpl !== 'custom') {
      return false;
    }
    if (this.isVisualBuilderTemplate()) {
      return false;
    }
    if (this.detectedSourceTemplate) {
      return false;
    }

    const t = this.currentTemplate;
    if (t === 'custom-html' || t === 'html-css' || t === 'custom') {
      return true;
    }

    const knownNativeTemplates = [
      'envelope-cards', 'mobile-cards', 'envelope',
      'classic-vertical', 'classic', 'editorial',
      'modern-minimal', 'template-3', 'plantilla-3', 'minimal',
      'boda-mobile-first', 'boda-mobile', 'wedding-mobile-first',
      'boda-desktop-first', 'boda-desktop', 'wedding-desktop-first',
      'boda-cards-lateral', 'cards-lateral', 'boda-cards', 'wedding-cards-lateral',
      'boda-creativa-premium', 'creativa-premium', 'boda-premium', 'wedding-creativa-premium',
      'maison-dore', 'la-maison-dore', 'lamaisondore',
      'template-boda', 'boda',
      'template-xv', 'xv', 'xv-anos',
      'template-graduacion', 'graduacion',
      'template-cumpleanos', 'cumpleanos', 'cumpleaños',
      'template-bautizo', 'bautizo',
      'template-otro', 'otro',
      'boda-villa-perle', 'villa-perle', 'template-villa-perle', 'template-boda-villa-perle',
      'boda-teatro', 'teatro', 'template-teatro', 'template-boda-teatro',
      'boda-eleganza', 'eleganza', 'template-eleganza', 'template-boda-eleganza',
      'boda-rosas', 'rosas', 'rosas-template', 'roses', 'template-boda-rosas',
      'boda-girasoles', 'girasoles', 'elegancia-girasoles', 'template-boda-girasoles',
      'boda-navy-blue', 'navy-blue', 'modelo-navy-blue', 'template-boda-navy-blue',
      'xv-burgundy', 'template-xv-burgundy', 'mis-xv-burgundy', 'burgundy'
    ];

    if (knownNativeTemplates.includes(t)) {
      return false;
    }

    const slug = this.invitation?.slug || this.route.snapshot.paramMap.get('slug') || '';
    const invId = this.invitation?._id || this.invitation?.id;
    const sourceTpl =
      this.invitation?.content?.sourceTemplateKey ||
      (slug && typeof localStorage !== 'undefined' ? localStorage.getItem(`inv_source_tpl_${slug}`) : null) ||
      (invId && typeof localStorage !== 'undefined' ? localStorage.getItem(`inv_source_tpl_${invId}`) : null);

    if (sourceTpl && sourceTpl !== 'custom-html') {
      return false;
    }

    if (Boolean(this.customHtmlContent?.trim())) {
      return true;
    }

    return false;
  }

  isVisualBuilderTemplate(): boolean {
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    if (isCleanRequested && queryTpl && queryTpl !== 'visual-builder') {
      return false;
    }
    return this.currentTemplate === 'visual-builder' && Boolean(this.invitation?.content?.visualDesign?.active);
  }

  private cachedCustomHtml?: string;
  private lastCustomHtmlInvitationRef?: InvitationModel;

  get customHtmlContent(): string {
    if (this.cachedCustomHtml !== undefined && this.lastCustomHtmlInvitationRef === this.invitation) {
      return this.cachedCustomHtml;
    }
    this.lastCustomHtmlInvitationRef = this.invitation;
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    if (isCleanRequested || (queryTpl && queryTpl !== 'custom-html' && queryTpl !== 'html-css' && queryTpl !== 'custom')) {
      this.cachedCustomHtml = '';
      return '';
    }
    if (this.invitation?.content?.visualDesign?.active || (this.invitation?.content as any)?.template === 'visual-builder') {
      this.cachedCustomHtml = '';
      return '';
    }
    this.cachedCustomHtml = this.computeCustomHtmlContent();
    return this.cachedCustomHtml;
  }

  private computeCustomHtmlContent(): string {
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    if (isCleanRequested || (queryTpl && queryTpl !== 'custom-html' && queryTpl !== 'html-css' && queryTpl !== 'custom')) {
      return '';
    }
    const slug = this.invitation?.slug || this.route.snapshot.paramMap.get('slug') || '';
    if (this.invitation?.content?.customHtml?.trim()) {
      return this.invitation.content.customHtml;
    }
    if (slug && typeof localStorage !== 'undefined') {
      const local1 = localStorage.getItem(`inv_custom_html_${slug}`);
      if (local1?.trim()) return local1;
      const local2 = localStorage.getItem(`custom_template_html_${slug}`);
      if (local2?.trim()) return local2;

      const subId = this.route.snapshot.queryParamMap.get('subId');
      if (subId) {
        const localSub = localStorage.getItem(`inv_custom_html_${slug}_${subId}`);
        if (localSub?.trim()) return localSub;
      }

      // Check approved submissions stored in localStorage
      try {
        const stored = localStorage.getItem('kyndra_custom_template_submissions') || localStorage.getItem('custom_template_submissions');
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find((s: any) =>
            (s.eventSlug === slug || s.slug === slug || (subId && (s.id === subId || s._id === subId))) &&
            s.htmlCode?.trim()
          );
          if (found?.htmlCode?.trim()) return found.htmlCode;
        }
      } catch { }
    }
    return '';
  }

  private cachedCustomCss?: string;
  private lastCustomCssInvitationRef?: InvitationModel;

  get customCssContent(): string {
    if (this.cachedCustomCss !== undefined && this.lastCustomCssInvitationRef === this.invitation) {
      return this.cachedCustomCss;
    }
    this.lastCustomCssInvitationRef = this.invitation;
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    if (isCleanRequested || (queryTpl && queryTpl !== 'custom-html' && queryTpl !== 'html-css' && queryTpl !== 'custom')) {
      this.cachedCustomCss = '';
      return '';
    }
    if (this.invitation?.content?.visualDesign?.active || (this.invitation?.content as any)?.template === 'visual-builder') {
      this.cachedCustomCss = '';
      return '';
    }
    this.cachedCustomCss = this.computeCustomCssContent();
    return this.cachedCustomCss;
  }

  private computeCustomCssContent(): string {
    const isCleanRequested = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    const queryTpl = this.route.snapshot.queryParamMap.get('tpl') || this.route.snapshot.queryParamMap.get('template');
    if (isCleanRequested || (queryTpl && queryTpl !== 'custom-html' && queryTpl !== 'html-css' && queryTpl !== 'custom')) {
      return '';
    }
    const slug = this.invitation?.slug || this.route.snapshot.paramMap.get('slug') || '';
    if (this.invitation?.content?.customCss !== undefined && this.invitation?.content?.customCss !== null && this.invitation?.content?.customCss !== '') {
      return this.invitation.content.customCss;
    }
    if (slug && typeof localStorage !== 'undefined') {
      const local1 = localStorage.getItem(`inv_custom_css_${slug}`);
      if (local1 !== null && local1 !== '') return local1;
      const local2 = localStorage.getItem(`custom_template_css_${slug}`);
      if (local2 !== null && local2 !== '') return local2;

      const subId = this.route.snapshot.queryParamMap.get('subId');
      if (subId) {
        const localSub = localStorage.getItem(`inv_custom_css_${slug}_${subId}`);
        if (localSub !== null && localSub !== '') return localSub;
      }

      try {
        const stored = localStorage.getItem('kyndra_custom_template_submissions') || localStorage.getItem('custom_template_submissions');
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find((s: any) =>
            (s.eventSlug === slug || s.slug === slug || (subId && (s.id === subId || s._id === subId))) &&
            s.cssCode !== undefined
          );
          if (found && found.cssCode !== undefined) return found.cssCode;
        }
      } catch { }
    }
    return '';
  }

  getCustomHtmlSafeSrcdoc(): SafeHtml {
    return this.customHtmlSafeSrcdoc || '';
  }

  isEnvelopeCardsTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'envelope-cards' || t === 'mobile-cards' || t === 'envelope';
  }

  isClassicVerticalTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'classic-vertical' || t === 'classic' || t === 'editorial' || (
      !this.isEnvelopeCardsTemplate() &&
      !this.isTemplate3() &&
      !this.isBodaMobileFirstTemplate() &&
      !this.isBodaDesktopFirstTemplate() &&
      !this.isBodaCardsLateralTemplate() &&
      !this.isBodaCreativaPremiumTemplate() &&
      !this.isTemplateBoda() &&
      !this.isTemplateXv() &&
      !this.isTemplateGraduacion() &&
      !this.isTemplateCumpleanos() &&
      !this.isTemplateBautizo() &&
      !this.isTemplateOtro() &&
      !this.isMaisonDoreTemplate() &&
      !this.isBodaVillaPerleTemplate() &&
      !this.isBodaTeatroTemplate() &&
      !this.isBodaEleganzaTemplate() &&
      !this.isBodaRosasTemplate() &&
      !this.isBodaGirasolesTemplate() &&
      !this.isBodaNavyBlueTemplate() &&
      !this.isXvBurgundyTemplate()
    );
  }

  isTemplate3(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'modern-minimal' || t === 'template-3' || t === 'plantilla-3' || t === 'minimal';
  }

  isBodaMobileFirstTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-mobile-first' || t === 'boda-mobile' || t === 'wedding-mobile-first';
  }

  isBodaDesktopFirstTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-desktop-first' || t === 'boda-desktop' || t === 'wedding-desktop-first';
  }

  isBodaCardsLateralTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-cards-lateral' || t === 'cards-lateral' || t === 'boda-cards' || t === 'wedding-cards-lateral';
  }

  isBodaCreativaPremiumTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-creativa-premium' || t === 'creativa-premium' || t === 'boda-premium' || t === 'wedding-creativa-premium';
  }

  isTemplateBoda(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'template-boda' || t === 'boda';
  }

  isTemplateXv(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'template-xv' || t === 'xv' || t === 'xv-anos';
  }

  isTemplateGraduacion(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'template-graduacion' || t === 'graduacion';
  }

  isTemplateCumpleanos(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'template-cumpleanos' || t === 'cumpleanos' || t === 'cumpleaños';
  }

  isTemplateBautizo(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'template-bautizo' || t === 'bautizo';
  }

  isTemplateOtro(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'template-otro' || t === 'otro';
  }

  isMaisonDoreTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'maison-dore' || t === 'la-maison-dore' || t === 'lamaisondore';
  }

  isBodaVillaPerleTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-villa-perle' || t === 'villa-perle' || t === 'template-villa-perle' || t === 'template-boda-villa-perle';
  }

  isBodaTeatroTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-teatro' || t === 'teatro' || t === 'template-teatro' || t === 'template-boda-teatro';
  }

  isBodaEleganzaTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-eleganza' || t === 'eleganza' || t === 'template-eleganza' || t === 'template-boda-eleganza';
  }

  isBodaRosasTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-rosas' || t === 'rosas' || t === 'rosas-template' || t === 'roses' || t === 'template-boda-rosas';
  }

  isBodaGirasolesTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-girasoles' || t === 'girasoles' || t === 'elegancia-girasoles' || t === 'template-boda-girasoles';
  }

  isBodaNavyBlueTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'boda-navy-blue' || t === 'navy-blue' || t === 'modelo-navy-blue' || t === 'template-boda-navy-blue';
  }

  isXvBurgundyTemplate(): boolean {
    if (this.isVisualBuilderTemplate() || this.isCustomHtmlTemplate()) return false;
    const t = this.currentTemplate;
    return t === 'xv-burgundy' || t === 'template-xv-burgundy' || t === 'mis-xv-burgundy' || t === 'burgundy';
  }

  get requiresGuestValidation(): boolean {
    return this.invitation?.accessMode === 'guest_list' || this.invitation?.accessMode === 'specific_users';
  }

  private applyVerifiedGuestToRsvp(guest: any, fallbackEmail?: string, fallbackPhone?: string): void {
    if (!guest) return;
    if (guest.name) this.rsvp.name = guest.name;
    const email = guest.email || fallbackEmail || '';
    if (email && !this.rsvp.email) this.rsvp.email = email;
    const rawPhone = guest.phoneNationalNumber || guest.phone || fallbackPhone || '';
    if (rawPhone && !this.rsvp.phoneNationalNumber) {
      const cc = guest.phoneCountryCode;
      if (cc && /^\+\d{1,4}$/.test(cc)) {
        const digits = String(rawPhone).replace(/\D/g, '');
        const ccDigits = cc.replace(/\D/g, '');
        this.rsvp.phoneCountryCode = cc;
        this.rsvp.phoneNationalNumber = digits.startsWith(ccDigits) && digits.length > 10 ? digits.slice(ccDigits.length) : digits;
      } else {
        const match = String(rawPhone).trim().match(/^(\+\d{1,3})\s*(.+)$/);
        if (match) {
          this.rsvp.phoneCountryCode = match[1];
          this.rsvp.phoneNationalNumber = match[2].replace(/\D/g, '');
        } else {
          const digits = String(rawPhone).replace(/\D/g, '');
          if (digits.length === 12 && digits.startsWith('52')) {
            this.rsvp.phoneCountryCode = '+52';
            this.rsvp.phoneNationalNumber = digits.slice(2);
          } else {
            this.rsvp.phoneNationalNumber = digits;
          }
        }
      }
    }
    const max = this.maxCompanions;
    if (max !== null && max !== undefined && Number(this.rsvp.companions || 0) > max) {
      this.rsvp.companions = Math.max(0, max);
    }
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
    const value = this.verifiedGuest?.checkInCode || this.verifiedGuest?.qrCode || (this.verifiedGuest as any)?.invitationToken || this.verifiedGuest?.id || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(value)}` : '';
  }

  get eventDateFormatted(): string {
    if (!this.event?.date) return '';
    try {
      const d = new Date(this.event.date);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
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

  getItineraryIconKey(title?: string): string {
    const t = (title || '').toLowerCase();
    if (t.includes('misa') || t.includes('ceremonia') || t.includes('religios')) return 'church';
    if (t.includes('recep') || t.includes('cóctel') || t.includes('coctel') || t.includes('bienvenida')) return 'cocktail';
    if (t.includes('cena') || t.includes('comida') || t.includes('banquete')) return 'dinner';
    if (t.includes('baile') || t.includes('fiesta') || t.includes('party') || t.includes('vals')) return 'party';
    if (t.includes('pastel') || t.includes('brindis')) return 'toast';
    return 'clock';
  }

  getItineraryIcon(title?: string): string {
    return this.getItineraryIconKey(title);
  }

  get songRequestSettings() {
    return this.invitation?.content?.songRequestSettings || this.event?.externalContent?.songRequestSettings;
  }

  get maxSongRequestsAllowed(): number {
    const max = Number(this.songRequestSettings?.maxRequestsPerGuest);
    return !isNaN(max) && max > 0 ? max : 3;
  }

  get requireSongApproval(): boolean {
    const setting = this.songRequestSettings?.requireApproval;
    return setting !== undefined ? Boolean(setting) : true;
  }

  get allowDedicationsEnabled(): boolean {
    const setting = this.songRequestSettings?.allowDedications;
    return setting !== undefined ? Boolean(setting) : true;
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
      const guestKey = this.verifiedGuest?.id || (this.verifiedGuest as any)?._id || this.verifiedGuest?.email || this.guestAccessEmail || 'anon';
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

  recordGuestSubmittedSong(songTitle: string): void {
    this.guestSubmittedSongsCount += 1;
    const slug = this.invitation?.slug;
    if (!slug || typeof localStorage === 'undefined') return;
    try {
      const guestKey = this.verifiedGuest?.id || (this.verifiedGuest as any)?._id || this.verifiedGuest?.email || this.guestAccessEmail || 'anon';
      const key = `song_req_list_${slug}_${guestKey}`;
      const stored = localStorage.getItem(key);
      const list: string[] = stored ? JSON.parse(stored) : [];
      list.push(songTitle);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { }
  }


  getYouTubeVideoId(url: string): string {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : '';
  }

  searchSongForRequestDirect(query: string): void {
    this.songSearchQuery = query;
    this.searchSongForRequest();
  }

  searchSongForRequest(): void {
    if (this.songRequestsLimitReached) {
      this.songRequestMessage = `⚠️ Has alcanzado el límite máximo de ${this.maxSongRequestsAllowed} canción(es) permitida(s) por invitado para este evento.`;
      return;
    }

    const query = this.songSearchQuery.trim();
    if (!query) return;

    this.searchingSongs = true;
    this.songSearchResults = [];

    const ytId = this.getYouTubeVideoId(query);
    if (ytId) {
      const videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      this.http.get<any>(oembedUrl).subscribe({
        next: (data) => {
          let rawTitle = data.title || 'Canción de YouTube';
          let artist = data.author_name || '';
          let cleanTitle = rawTitle.replace(/\s*\([^)]*(?:official|video|audio|hd|4k|lyric|remastered)[^)]*\)/gi, '').trim();
          cleanTitle = cleanTitle.replace(/\s*\[[^\]]*(?:official|video|audio|hd|4k|lyric|remastered)[^\]]*\]/gi, '').trim();

          let title = cleanTitle;
          if (cleanTitle.includes(' - ')) {
            const parts = cleanTitle.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }

          const result = {
            title,
            artist,
            sourceUrl: videoUrl,
            thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          };
          this.songSearchResults = [result];
          this.selectSongFromSearch(result);
          this.searchingSongs = false;
        },
        error: () => {
          const fallback = {
            title: 'Canción de YouTube',
            artist: '',
            sourceUrl: videoUrl,
            thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          };
          this.songSearchResults = [fallback];
          this.selectSongFromSearch(fallback);
          this.searchingSongs = false;
        }
      });
      return;
    }

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6`;
    this.http.get<any>(itunesUrl).subscribe({
      next: (res) => {
        const items = res?.results || [];
        this.songSearchResults = items.map((item: any) => {
          const title = item.trackName || query;
          const artist = item.artistName || '';
          const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + ' ' + title)}`;
          const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : '';
          return {
            title,
            artist,
            sourceUrl: ytSearchUrl,
            thumbnailUrl: artwork,
            previewUrl: item.previewUrl
          };
        });

        if (this.songSearchResults.length > 0) {
          this.selectSongFromSearch(this.songSearchResults[0]);
          this.resolveYouTubeVideoUrl(this.songSearchResults[0]);
        }
        this.searchingSongs = false;
      },
      error: () => {
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const fallback = {
          title: query,
          artist: '',
          sourceUrl: ytSearchUrl,
          thumbnailUrl: ''
        };
        this.songSearchResults = [fallback];
        this.selectSongFromSearch(fallback);
        this.searchingSongs = false;
      }
    });
  }

  resolveYouTubeVideoUrl(song: { title: string; artist: string; sourceUrl: string; thumbnailUrl: string }): void {
    const slug = this.invitation?.slug;
    if (!slug || !song.title) return;
    const searchTerm = `${song.artist} ${song.title}`.trim();

    this.api.lookupPublicSong(slug, searchTerm, this.guestSessionToken).subscribe({
      next: (res) => {
        if (res?.video?.sourceUrl) {
          song.sourceUrl = res.video.sourceUrl;
          if (this.songRequest.title === song.title) {
            this.songRequest.sourceUrl = song.sourceUrl;
          }
        }
      },
      error: () => { }
    });
  }

  selectSongFromSearch(s: { title: string; artist: string; sourceUrl: string; thumbnailUrl: string }): void {
    this.songRequest.title = s.title;
    this.songRequest.artist = s.artist;
    this.songRequest.sourceUrl = s.sourceUrl;
    this.songRequest.thumbnailUrl = s.thumbnailUrl;
  }

  submitSongRequest(): void {
    if (!this.songRequest.title.trim()) return;
    const slug = this.invitation?.slug;
    if (!slug) return;

    if (this.requiresGuestValidation && !this.verifiedGuest) {
      this.songRequestMessage = '⚠️ Debes validar tu correo o teléfono en la sección superior antes de sugerir canciones.';
      return;
    }

    if (this.songRequestsLimitReached) {
      this.songRequestMessage = `⚠️ Has alcanzado el límite máximo de ${this.maxSongRequestsAllowed} canción(es) sugerida(s) para este evento.`;
      return;
    }

    const requiresApproval = this.requireSongApproval;
    const initialStatus = requiresApproval ? 'pending' : 'approved';

    this.songRequestSending = true;
    this.songRequestMessage = '';

    const payload = {
      guest: this.verifiedGuest?.id || (this.verifiedGuest as any)?._id,
      title: this.songRequest.title.trim(),
      artist: this.songRequest.artist.trim() || undefined,
      dedication: this.allowDedicationsEnabled ? (this.songRequest.dedication.trim() || undefined) : undefined,
      sourceUrl: this.songRequest.sourceUrl ? this.songRequest.sourceUrl.trim() : undefined,
      url: this.songRequest.sourceUrl ? this.songRequest.sourceUrl.trim() : undefined,
      requesterName: this.verifiedGuest?.name || this.rsvp.name || undefined,
      requesterEmail: this.verifiedGuest?.email || this.rsvp.email || this.guestAccessEmail || undefined
    };

    this.api.createPublicSongRequest(slug, payload as any, this.guestSessionToken).subscribe({
      next: (res: any) => {
        this.recordGuestSubmittedSong(this.songRequest.title.trim());
        const status = res?.songRequest?.status;
        const isApproved = status === 'approved' || (!this.requireSongApproval && status !== 'pending');

        if (!isApproved) {
          this.songRequestMessage = '⏳ ¡Canción enviada a revisión con éxito! El organizador o DJ la validará antes de integrarla a la playlist.';
          this.showToast('Canción enviada a revisión');
        } else {
          this.songRequestMessage = '✨ ¡Canción sugerida e incorporada directamente a la playlist del DJ con éxito!';
          this.showToast('Canción agregada a la playlist');
        }

        this.songRequest = { title: '', artist: '', dedication: '', sourceUrl: '', thumbnailUrl: '' };
        this.songSearchQuery = '';
        this.songSearchResults = [];
        this.songRequestSending = false;
      },
      error: (err: any) => {
        this.songRequestMessage = err?.error?.message || 'No se pudo enviar la canción.';
        this.songRequestSending = false;
      }
    });
  }

  submitVisualSongRequest(data: {
    title: string;
    artist: string;
    dedication: string;
    sourceUrl: string;
  }): void {
    this.songRequest = { ...data, thumbnailUrl: '' };
    this.submitSongRequest();
  }

  /**
   * Loads edited text overlays from invitation content or localStorage.
   * These are applied post-render via ngAfterViewChecked to preserve
   * all Angular template interactivity (buttons, RSVP, music, etc.).
   */
  private loadEditedTexts(slug: string): void {
    console.log('test edit: [PublicInv] loadEditedTexts() called, slug:', slug);
    console.log('test edit: [PublicInv] isCustomHtmlTemplate:', this.isCustomHtmlTemplate());
    console.log('test edit: [PublicInv] currentTemplate:', this.currentTemplate);
    // Check if clean base template is explicitly requested (e.g. from editor clean edit)
    const isCleanMode = this.route.snapshot.queryParamMap.get('clean') === '1' || this.route.snapshot.queryParamMap.get('clean') === 'true';
    if (isCleanMode) {
      console.log('test edit: [PublicInv] loadEditedTexts() SKIPPED - clean base mode requested');
      this.pendingEditedTexts = undefined;
      return;
    }

    // Skip if this is a custom-html template (those use full HTML replacement)
    if (this.isCustomHtmlTemplate()) {
      console.log('test edit: [PublicInv] loadEditedTexts() SKIPPED - isCustomHtmlTemplate is true');
      return;
    }

    // Skip if this is a visual-builder template (visual builder has its own layer engine)
    if (this.isVisualBuilderTemplate()) {
      console.log('test edit: [PublicInv] loadEditedTexts() SKIPPED - isVisualBuilderTemplate is true');
      return;
    }

    let cookieSubId: string | null = null;
    if (slug && typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp(`(^|;\\s*)inv_active_sub_${slug}=([^;]+)`));
      if (match) cookieSubId = match[2];
    }
    const invId = this.invitation?._id || this.invitation?.id;
    const subId = this.route.snapshot.queryParamMap.get('subId') ||
      (slug ? localStorage.getItem(`inv_active_sub_${slug}`) : null) ||
      (invId ? localStorage.getItem(`inv_active_sub_${invId}`) : null) ||
      cookieSubId;
    let editedTexts: Record<string, string> | undefined;

    if (subId) {
      // Load specific submission's texts
      const rawSubTexts = localStorage.getItem(`inv_edited_texts_${slug}_${subId}`);
      if (rawSubTexts) {
        try {
          editedTexts = JSON.parse(rawSubTexts);
        } catch { }
      }
      if (!editedTexts) {
        const subs = this.api.getLocalCustomSubmissions();
        const found = subs.find(s => s.id === subId || s._id === subId);
        if (found?.editedTexts) {
          editedTexts = found.editedTexts;
        }
      }
    }

    if (!editedTexts) {
      // Priority: invitation content > localStorage
      const fromContent = this.invitation?.content?.editedTexts;
      const fromLocal = this.textOverlay.loadEditedTexts(slug);
      editedTexts = fromContent || fromLocal || undefined;
    }

    console.log('test edit: [PublicInv] loadEditedTexts - final editedTexts:', editedTexts ? Object.keys(editedTexts).length + ' keys' : 'null');

    if (editedTexts && Object.keys(editedTexts).length > 0) {
      this.pendingEditedTexts = editedTexts;
      this.editedTextsApplied = false;
      console.log('test edit: [PublicInv] loadEditedTexts - SET pendingEditedTexts with', Object.keys(editedTexts).length, 'changes');
      this.setupTextOverlayObserver();
    } else {
      console.log('test edit: [PublicInv] loadEditedTexts - NO edited texts found');
    }
  }

  /**
   * Sets up a MutationObserver on the container to dynamically apply edited texts
   * whenever cards open, tabs change, or child components render.
   */
  private setupTextOverlayObserver(): void {
    if (typeof window === 'undefined' || !('MutationObserver' in window)) return;
    if (this.textOverlayMutationObserver) {
      this.textOverlayMutationObserver.disconnect();
    }

    setTimeout(() => {
      const rootEl = this.elRef.nativeElement as HTMLElement;
      if (!rootEl) return;

      // Initial apply
      if (this.pendingEditedTexts && Object.keys(this.pendingEditedTexts).length > 0) {
        this.textOverlay.applyTexts(rootEl, this.pendingEditedTexts);
      }

      let debounceTimer: any = null;
      this.textOverlayMutationObserver = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (this.pendingEditedTexts && Object.keys(this.pendingEditedTexts).length > 0) {
            // Desconectar observer antes de modificar el DOM para evitar recursión infinita
            this.textOverlayMutationObserver?.disconnect();
            this.textOverlay.applyTexts(rootEl, this.pendingEditedTexts);
            // Reconectar después de que el DOM se haya estabilizado
            setTimeout(() => {
              if (this.textOverlayMutationObserver && rootEl) {
                this.textOverlayMutationObserver.observe(rootEl, { childList: true, subtree: true });
              }
            }, 300);
          }
        }, 200);
      });

      this.textOverlayMutationObserver.observe(rootEl, { childList: true, subtree: true });
    }, 150);
  }

  /**
   * Examines customHtml to see if it was originally an edited snapshot of a standard
   * Angular template (classic-vertical, envelope-cards, template-3).
   * If so, extracts all edited texts from data-text-key attributes and returns the template key.
   */
  private detectSourceTemplateFromHtml(customHtml: string): { templateKey: string; editedTexts: Record<string, string> } | null {
    if (!customHtml || typeof customHtml !== 'string') return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(customHtml, 'text/html');

      // Check for known template structure markers
      let templateKey = '';
      if (doc.querySelector('.nw-pub-wrapper, .nw-pub-hero-card, .nw-pub-card, .nw-pub-headline, .nw-pub-subheadline')) {
        templateKey = 'classic-vertical';
      } else if (doc.querySelector('.env-envelope, .env-card, .nw-env-wrapper, .env-seal')) {
        templateKey = 'envelope-cards';
      } else if (doc.querySelector('.tpl3-container, .modern-minimal, .tpl3-hero')) {
        templateKey = 'template-3';
      }

      if (!templateKey) return null;

      // Extract all texts that were saved with data-text-key
      const editedTexts: Record<string, string> = {};
      const taggedEls = doc.querySelectorAll('[data-text-key]');
      taggedEls.forEach(el => {
        const key = el.getAttribute('data-text-key');
        if (key) {
          editedTexts[key] = (el as HTMLElement).innerHTML.trim();
        }
      });

      return { templateKey, editedTexts };
    } catch (e) {
      console.warn('test edit: [PublicInv] detectSourceTemplateFromHtml error:', e);
      return null;
    }
  }
}

