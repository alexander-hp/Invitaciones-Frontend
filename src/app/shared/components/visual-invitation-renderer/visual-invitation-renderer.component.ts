import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import {
  DedicationModel, EventModel, ExternalGuestStatusResponse, GuestAccessResponse, GuestActivityNotification, InvitationGalleryItem, InvitationLocation, InvitationModel, RsvpResponse,
  VisualInvitationLayer, VisualInvitationSection, VisualPluginPartDesign
} from '../../../core/models';
import { resolveVisualTemplateText, visualTemplateContext } from '../../../core/visual-template-bindings';
import { resolveVisualMediaSource } from './visual-media-source';
import { uniqueVisibleControls } from './visual-functional-controls';
import { visualCanvasHeight, visualSectionHeight, visualSectionOffset } from './visual-canvas-geometry';

@Component({
  selector: 'app-visual-invitation-renderer',
  templateUrl: './visual-invitation-renderer.component.html',
  styleUrls: ['./visual-invitation-renderer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VisualInvitationRendererComponent implements OnChanges, OnDestroy {
  @ViewChild('visualInvitationRoot') private visualInvitationRoot?: ElementRef<HTMLElement>;

  constructor(private cdr?: ChangeDetectorRef) {}

  // Render & Style Memoization Caches
  private cachedIsXvBurgundy: boolean | null = null;
  private cachedSections: VisualInvitationSection[] | null = null;
  private cachedDisplayedSections: VisualInvitationSection[] | null = null;
  private cachedContinuousCanvasHeight: number | null = null;
  private cachedDesignThemeStyle: Record<string, string> | null = null;

  private cachedSectionOffsets = new Map<VisualInvitationSection, number>();
  private cachedSectionHeights = new Map<VisualInvitationSection, number>();
  private cachedSectionStyles = new Map<VisualInvitationSection, Record<string, string>>();
  private cachedModuleClasses = new Map<VisualInvitationSection, string[]>();
  private cachedVisualLayers = new Map<VisualInvitationSection, VisualInvitationLayer[]>();

  private cachedContinuousLayerStyles = new Map<VisualInvitationLayer, {
    section: VisualInvitationSection;
    styleRef: any;
    device: string;
    exportMode: boolean;
    sectionOffset: number;
    sectionHeight: number;
    result: Record<string, string>;
  }>();

  private cachedLayerStyles = new Map<VisualInvitationLayer, {
    styleRef: any;
    device: string;
    exportMode: boolean;
    result: Record<string, string>;
  }>();

  private cachedShapeContentStyles = new Map<VisualInvitationLayer, {
    styleRef: any;
    result: Record<string, string>;
  }>();

  private cachedImageMaskStyles = new Map<VisualInvitationLayer, {
    styleRef: any;
    device: string;
    result: Record<string, string>;
  }>();

  private cachedImageStyles = new Map<VisualInvitationLayer, {
    styleRef: any;
    device: string;
    result: Record<string, string>;
  }>();

  private cachedAnimationClasses = new Map<string, string[]>();
  private cachedResolvedLayerTexts = new Map<string, string>();

  private cachedPluginPartDesigns = new Map<string, VisualPluginPartDesign>();
  private cachedPluginPartStyles = new Map<string, Record<string, string>>();
  private cachedPluginPartClasses = new Map<string, string[]>();
  private cachedRsvpDesignCanvasStyles = new Map<string, Record<string, string>>();

  // Cache Consistency Tracking
  private lastInvitationRef: any;
  private lastEventRef: any;
  private lastVerifiedGuestRef: any;
  private lastDevice: any;
  private lastForcedDevice: any;
  private lastExportMode: any;
  private lastChapterIndex = 0;
  private lastPresentationMode: any;
  private lastResponsiveMode: any;

  clearRenderCache(): void {
    this.cachedIsXvBurgundy = null;
    this.cachedSections = null;
    this.cachedDisplayedSections = null;
    this.cachedContinuousCanvasHeight = null;
    this.cachedDesignThemeStyle = null;
    this.cachedSectionOffsets.clear();
    this.cachedSectionHeights.clear();
    this.cachedSectionStyles.clear();
    this.cachedModuleClasses.clear();
    this.cachedVisualLayers.clear();
    this.cachedContinuousLayerStyles.clear();
    this.cachedLayerStyles.clear();
    this.cachedShapeContentStyles.clear();
    this.cachedImageMaskStyles.clear();
    this.cachedImageStyles.clear();
    this.cachedAnimationClasses.clear();
    this.cachedResolvedLayerTexts.clear();
    this.cachedPluginPartDesigns.clear();
    this.cachedPluginPartStyles.clear();
    this.cachedPluginPartClasses.clear();
    this.cachedRsvpDesignCanvasStyles.clear();
  }

  private checkCacheConsistency(): void {
    const presentationMode = this.presentationMode;
    const responsiveMode = this.invitation?.content?.visualDesign?.responsiveMode;
    if (
      this.invitation !== this.lastInvitationRef ||
      this.event !== this.lastEventRef ||
      this.verifiedGuest !== this.lastVerifiedGuestRef ||
      this.device !== this.lastDevice ||
      this.forcedDevice !== this.lastForcedDevice ||
      this.exportMode !== this.lastExportMode ||
      this.chapterIndex !== this.lastChapterIndex ||
      presentationMode !== this.lastPresentationMode ||
      responsiveMode !== this.lastResponsiveMode
    ) {
      this.clearRenderCache();
      this.lastInvitationRef = this.invitation;
      this.lastEventRef = this.event;
      this.lastVerifiedGuestRef = this.verifiedGuest;
      this.lastDevice = this.device;
      this.lastForcedDevice = this.forcedDevice;
      this.lastExportMode = this.exportMode;
      this.lastChapterIndex = this.chapterIndex;
      this.lastPresentationMode = presentationMode;
      this.lastResponsiveMode = responsiveMode;
    }
  }

  device: 'mobile' | 'tablet' | 'desktop' = this.detectDevice();
  @Input() invitation?: InvitationModel;
  @Input() event?: EventModel;
  @Input() verifiedGuest?: GuestAccessResponse['guest'];
  @Input() guestActivity?: ExternalGuestStatusResponse;
  @Input() guestActivityLoading = false;
  @Input() activityNotifications: GuestActivityNotification[] = [];
  @Input() requiresGuestValidation = false;
  @Input() sending = false;
  @Input() checkingGuest = false;
  @Input() uploadingAlbum = false;
  @Input() albumAssets: Array<{ url: string; uploaderName?: string; createdAt?: string }> = [];
  @Input() dedications: DedicationModel[] = [];
  @Input() error = '';
  @Input() success = '';
  @Input() albumMessage = '';
  @Input() dedicationMessage = '';
  @Input() songRequestMessage = '';
  @Input() forcedDevice?: 'mobile' | 'tablet' | 'desktop';
  @Input() exportMode = false;
  @Input() sandboxResetKey = 0;
  @Input() isPlayingMusic = false;
  @Input() musicControlReady = true;
  @Input() currentActiveSection = 'hero';
  @Input() currentPlayingTrackUrl = '';

  @Output() verifyGuestAccess = new EventEmitter<{ email: string; phone: string }>();
  @Output() submitRsvp = new EventEmitter<any>();
  @Output() uploadPhoto = new EventEmitter<File>();
  @Output() submitDedication = new EventEmitter<{ publicName: string; message: string }>();
  @Output() requestSong = new EventEmitter<{ title: string; artist: string; dedication: string; sourceUrl: string }>();
  @Output() openLightbox = new EventEmitter<string>();
  @Output() openGuestActivity = new EventEmitter<void>();
  @Output() updateActivityRsvp = new EventEmitter<{ response: RsvpResponse; companions: number; companionNames: string[]; message: string; declineConfirmed?: boolean }>();
  @Output() removeActivityItem = new EventEmitter<{ kind: 'album' | 'song' | 'dedication'; id: string }>();
  @Output() updateActivityDedication = new EventEmitter<{ id: string; publicName?: string; message: string; visibility?: 'public' | 'hosts_only' }>();
  @Output() markActivityNotificationsRead = new EventEmitter<void>();
  @Output() toggleMusic = new EventEmitter<void>();
  @Output() toggleSectionMusic = new EventEmitter<string>();

  activityPanelOpen = false;
  quickRsvp = { response: 'confirmed' as RsvpResponse, companions: 0, companionNames: '', message: '' };
  editingActivityDedicationId = '';
  activityDedicationDraft = '';

  exportMediaDescription(layer: VisualInvitationLayer): string {
    const label = String(layer.name || layer.text || '').trim();
    return label && label.toLowerCase() !== layer.type ? label : 'Disponible en la invitación digital';
  }

  activityCount(kind: 'album' | 'songs' | 'dedications'): number {
    if (kind === 'album') return this.guestActivity?.albumUploads?.length || 0;
    if (kind === 'songs') return this.guestActivity?.songRequests?.length || 0;
    return this.guestActivity?.dedications?.length || 0;
  }

  activityRsvpLabel(): string {
    const response = this.guestActivity?.rsvp?.response;
    return response === 'confirmed' ? 'Asistencia confirmada' : response === 'declined' ? 'No asistiré' : response === 'maybe' ? 'Tal vez asistiré' : 'Sin confirmar';
  }

  isActivityItemNew(kind: GuestActivityNotification['kind'], id?: string): boolean {
    return Boolean(id && this.activityNotifications.some((item) => item.kind === kind && item.itemId === id));
  }

  openActivityPanel(): void {
    this.activityPanelOpen = true;
  }

  closeActivityPanel(): void {
    this.activityPanelOpen = false;
    this.editingActivityDedicationId = '';
  }

  saveQuickRsvp(): void {
    this.updateActivityRsvp.emit({
      response: this.quickRsvp.response,
      companions: this.quickRsvp.response === 'confirmed' ? Number(this.quickRsvp.companions || 0) : 0,
      companionNames: this.quickRsvp.response === 'confirmed' ? this.quickRsvp.companionNames.split(',').map((name) => name.trim()).filter(Boolean) : [],
      message: this.quickRsvp.message,
      declineConfirmed: this.quickRsvp.response === 'declined'
    });
  }

  startActivityDedicationEdit(item: DedicationModel): void {
    this.editingActivityDedicationId = item.id || item._id || '';
    this.activityDedicationDraft = item.message;
  }

  saveActivityDedication(item: DedicationModel): void {
    const id = item.id || item._id;
    if (!id || !this.activityDedicationDraft.trim()) return;
    this.updateActivityDedication.emit({ id, publicName: item.publicName, message: this.activityDedicationDraft.trim(), visibility: item.visibility });
    this.editingActivityDedicationId = '';
  }

  guestEmail = '';
  guestPhone = '';
  rsvp = { name: '', email: '', response: 'confirmed', companions: 0, dietaryRestrictions: '', message: '' };
  dedication = { publicName: '', message: '' };
  song = { title: '', artist: '', dedication: '', sourceUrl: '' };
  giftCopyMessage = '';
  galleryIndex = 0;
  chapterIndex = 0;
  @Input() countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false };
  private galleryTimer?: ReturnType<typeof setInterval>;
  private countdownTimer?: ReturnType<typeof setInterval>;

  get sections(): VisualInvitationSection[] {
    this.checkCacheConsistency();
    if (this.cachedSections) return this.cachedSections;
    this.cachedSections = (this.invitation?.content?.visualDesign?.sections || []).filter((section) => section.enabled);
    return this.cachedSections;
  }

  get presentationMode(): 'continuous' | 'chapters' {
    return this.exportMode ? 'continuous' : (this.invitation?.content?.visualDesign?.presentationMode || 'continuous');
  }

  get continuousCanvasHeight(): number {
    this.checkCacheConsistency();
    if (this.cachedContinuousCanvasHeight !== null) return this.cachedContinuousCanvasHeight;
    this.cachedContinuousCanvasHeight = this.displayedSections.reduce((total, section) => total + this.sectionRenderHeight(section), 0);
    return this.cachedContinuousCanvasHeight;
  }

  get displayedSections(): VisualInvitationSection[] {
    this.checkCacheConsistency();
    if (this.cachedDisplayedSections) return this.cachedDisplayedSections;
    const sections = this.sections;
    this.cachedDisplayedSections = this.presentationMode === 'chapters' ? sections.slice(this.currentChapterIndex, this.currentChapterIndex + 1) : sections;
    return this.cachedDisplayedSections;
  }

  get currentChapterIndex(): number {
    return Math.min(this.chapterIndex, Math.max(0, this.sections.length - 1));
  }

  goToChapter(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.sections.length || index === this.currentChapterIndex) return;
    this.chapterIndex = index;
    this.cachedDisplayedSections = null;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.visualInvitationRoot?.nativeElement.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    this.cdr?.markForCheck();
  }

  get floatingAudioLayers(): VisualInvitationLayer[] {
    if (this.exportMode) return [];
    return this.sections.flatMap((section) => section.layers.filter((layer) => !layer.hidden && this.isFloatingAudio(layer)));
  }

  isBoundMusicControl(layer: VisualInvitationLayer): boolean {
    return layer.type === 'audio' && (layer.binding === 'music.toggle' || String(layer.binding || '').startsWith('music.section.'));
  }

  boundMusicControlPlaying(layer: VisualInvitationLayer): boolean {
    if (!this.isPlayingMusic) return false;
    if (layer.binding === 'music.toggle') return true;
    const sectionKey = String(layer.binding || '').replace('music.section.', '');
    return Boolean(sectionKey && sectionKey === this.currentActiveSection);
  }

  handleBoundMusicControl(layer: VisualInvitationLayer): void {
    const sectionKey = String(layer.binding || '').replace('music.section.', '');
    if (layer.binding === 'music.toggle') this.toggleMusic.emit();
    else if (sectionKey) this.toggleSectionMusic.emit(sectionKey);
  }

  get maxCompanions(): number {
    return this.verifiedGuest?.allowedCompanions
      ?? this.invitation?.rsvpSettings?.defaultAllowedCompanions
      ?? 0;
  }

  get galleryItems(): InvitationGalleryItem[] {
    const content = this.invitation?.content;
    if (content?.galleryItems?.length) return content.galleryItems.filter((item) => item.url);
    return (content?.gallery || []).filter(Boolean).map((url, index) => ({ id: `legacy-${index}`, url, fit: 'cover', focalX: 50, focalY: 50 }));
  }

  get galleryDisplayMode(): 'grid' | 'list' | 'carousel' {
    return this.invitation?.content?.gallerySettings?.displayMode || 'grid';
  }

  galleryDisplayModeFor(section: VisualInvitationSection): 'grid' | 'list' | 'carousel' {
    const mode = String(this.pluginSetting(section, 'displayMode', 'inherit'));
    return mode === 'grid' || mode === 'list' || mode === 'carousel' ? mode : this.galleryDisplayMode;
  }

  galleryCaptionsFor(section: VisualInvitationSection): boolean {
    const configured = section.pluginSettings?.['showCaptions'];
    return configured === undefined ? this.invitation?.content?.gallerySettings?.showCaptions !== false : Boolean(configured);
  }

  galleryImageHeight(section: VisualInvitationSection): number {
    return Math.max(100, Math.min(480, Number(this.pluginSetting(section, 'imageHeight', 170)) || 170));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.forcedDevice) this.device = this.forcedDevice;
    if (changes['invitation'] && changes['invitation'].previousValue?.id !== this.invitation?.id) this.chapterIndex = 0;
    if (changes['sandboxResetKey'] && !changes['sandboxResetKey'].firstChange) this.resetSandboxForms();
    this.clearRenderCache();
    const featuredIndex = this.galleryItems.findIndex((item) => item.featured);
    this.galleryIndex = changes['invitation']
      ? Math.max(0, featuredIndex)
      : Math.min(this.galleryIndex, Math.max(0, this.galleryItems.length - 1));
    this.configureGalleryTimer();
    this.configureCountdownTimer();
    if (this.guestActivity?.rsvp && !this.activityPanelOpen) {
      this.quickRsvp = {
        response: this.guestActivity.rsvp.response,
        companions: Number(this.guestActivity.rsvp.companions || 0),
        companionNames: (this.guestActivity.rsvp.companionNames || []).join(', '),
        message: this.guestActivity.rsvp.message || ''
      };
    }
    this.cdr?.markForCheck();
  }

  ngOnDestroy(): void {
    this.clearGalleryTimer();
    this.clearCountdownTimer();
  }

  galleryCaption(item: InvitationGalleryItem): string {
    return [item.title, item.description, item.dedication].filter(Boolean).join(' · ');
  }

  galleryImageStyle(item: InvitationGalleryItem): Record<string, string> {
    return { objectFit: item.fit || 'cover', objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%` };
  }

  moveGallery(direction: number): void {
    if (!this.galleryItems.length) return;
    this.galleryIndex = (this.galleryIndex + direction + this.galleryItems.length) % this.galleryItems.length;
    this.cdr?.markForCheck();
  }

  setExportGalleryIndex(index: number): void {
    this.clearGalleryTimer();
    this.galleryIndex = Math.max(0, Math.min(index, Math.max(0, this.galleryItems.length - 1)));
  }

  exportEventDateLabel(): string {
    const target = this.eventTargetDate();
    if (!target) return 'Fecha por confirmar';
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(target);
  }

  exportEventTimeLabel(): string {
    const target = this.eventTargetDate();
    if (!target || !this.event?.time) return '';
    return new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(target);
  }

  trackVisualById(index: number, item: VisualInvitationSection | VisualInvitationLayer): string | number {
    return item.id || index;
  }

  pluginSetting(section: VisualInvitationSection, key: string, fallback: string | number | boolean = ''): string | number | boolean {
    return section.pluginSettings?.[key] ?? fallback;
  }

  pluginPartDesign(section: VisualInvitationSection, key: string): VisualPluginPartDesign {
    this.checkCacheConsistency();
    const cacheKey = `${section.id || ''}:${key}`;
    const cached = this.cachedPluginPartDesigns.get(cacheKey);
    if (cached) return cached;
    const theme = this.invitation?.content?.visualDesign?.theme;
    const displayPart = ['eyebrow', 'title', 'intro'].includes(key);
    const defaults: VisualPluginPartDesign = displayPart
      ? { backgroundColor: 'transparent', borderWidth: 0, padding: 3, textAlign: 'center', fontSize: key === 'title' ? 34 : key === 'eyebrow' ? 11 : 14 }
      : { backgroundColor: '#ffffff', borderColor: '#d5cbc4', borderWidth: 1, borderRadius: 8, padding: 10, textAlign: key === 'submit' || key === 'feedback' ? 'center' : 'left', fontSize: 14 };
    if (key === 'title') defaults.fontFamily = theme?.headingFont || 'Georgia, serif';
    if (key === 'submit') Object.assign(defaults, { backgroundColor: theme?.buttonBackgroundColor || '#292523', color: theme?.buttonTextColor || '#ffffff', borderWidth: 0, fontWeight: 700 });
    if (key === 'feedback') Object.assign(defaults, { backgroundColor: '#edf5fb', borderWidth: 0, fontSize: 12 });
    const result = { ...defaults, ...(section.pluginDesign?.parts?.[key] || {}) };
    this.cachedPluginPartDesigns.set(cacheKey, result);
    return result;
  }

  pluginPartLabel(section: VisualInvitationSection, key: string, fallback: string): string {
    return this.pluginPartDesign(section, key).label || fallback;
  }

  pluginPartPlaceholder(section: VisualInvitationSection, key: string, fallback: string): string {
    return this.pluginPartDesign(section, key).placeholder || fallback;
  }

  pluginPartClasses(section: VisualInvitationSection, key: string): string[] {
    this.checkCacheConsistency();
    const cacheKey = `${section.id || ''}:${key}`;
    const cached = this.cachedPluginPartClasses.get(cacheKey);
    if (cached) return cached;
    const design = this.pluginPartDesign(section, key);
    const result = [`plugin-part-${key}`, `plugin-shape-${design.shape || 'rectangle'}`, design.variant === 'cards' ? 'plugin-variant-cards' : 'plugin-variant-default'];
    this.cachedPluginPartClasses.set(cacheKey, result);
    return result;
  }

  pluginPartStyle(section: VisualInvitationSection, key: string): Record<string, string> {
    this.checkCacheConsistency();
    const cacheKey = `${section.id || ''}:${key}`;
    const cached = this.cachedPluginPartStyles.get(cacheKey);
    if (cached) return cached;
    const part = this.pluginPartDesign(section, key);
    const free = section.pluginDesign?.layout === 'free';
    const result: Record<string, string> = {
      position: free ? 'absolute' : 'relative', left: free ? `${part.x ?? 5}%` : 'auto', top: free ? `${part.y ?? 5}%` : 'auto',
      width: free ? `${part.width ?? 90}%` : 'auto', minHeight: free ? `${part.height ?? 8}%` : '0',
      color: String(part.color || 'var(--visual-text)'), backgroundColor: String(part.backgroundColor || 'transparent'),
      backgroundImage: part.backgroundImageUrl ? `url("${part.backgroundImageUrl}")` : 'none',
      fontFamily: String(part.fontFamily || 'var(--visual-body-font)'), fontSize: `${Number(part.fontSize || 14)}px`, fontWeight: String(part.fontWeight || 500),
      textAlign: String(part.textAlign || 'left'), borderColor: String(part.borderColor || 'transparent'), borderWidth: `${Number(part.borderWidth || 0)}px`,
      borderStyle: Number(part.borderWidth || 0) ? 'solid' : 'none', borderRadius: `${Number(part.borderRadius || 0)}px`, padding: `${Number(part.padding ?? 8)}px`,
      boxShadow: String(part.boxShadow || 'none'), backgroundSize: 'cover', backgroundPosition: 'center', boxSizing: 'border-box'
    };
    this.cachedPluginPartStyles.set(cacheKey, result);
    return result;
  }

  rsvpDesignCanvasStyle(section: VisualInvitationSection): Record<string, string> {
    this.checkCacheConsistency();
    const cacheKey = section.id || '';
    const cached = this.cachedRsvpDesignCanvasStyles.get(cacheKey);
    if (cached) return cached;
    const result = { minHeight: section.pluginDesign?.layout === 'free' ? `${Number(section.pluginDesign?.minHeight || 560)}px` : '0' };
    this.cachedRsvpDesignCanvasStyles.set(cacheKey, result);
    return result;
  }

  locationsFor(section: VisualInvitationSection): InvitationLocation[] {
    const configured = this.invitation?.content?.locations || [];
    const locations: InvitationLocation[] = configured.length ? configured : (this.event?.venue?.name || this.event?.venue?.address || this.event?.venue?.mapUrl ? [{
      type: 'principal', name: this.event?.venue?.name || 'Lugar del evento', address: this.event?.venue?.address || '', mapUrl: this.event?.venue?.mapUrl || ''
    }] : [
      { type: 'ceremonia', name: 'Ceremonia', address: 'Ubicación principal del evento', notes: 'Consulta indicaciones y horario.' },
      { type: 'recepcion', name: 'Recepción', address: 'Salón de celebración', notes: 'Acceso disponible para invitados.' }
    ]);
    const limit = Number(this.pluginSetting(section, 'locationLimit', 0));
    return limit > 0 ? locations.slice(0, limit) : locations;
  }

  get guestQrUrl(): string {
    const value = this.verifiedGuest?.checkInCode || this.verifiedGuest?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}` : '';
  }

  resolveLayerText(layer: VisualInvitationLayer): string {
    this.checkCacheConsistency();
    const key = `${layer.id || ''}:${layer.text || ''}`;
    const cached = this.cachedResolvedLayerTexts.get(key);
    if (cached !== undefined) return cached;
    const result = resolveVisualTemplateText(layer.text, visualTemplateContext(this.invitation, this.event, this.verifiedGuest));
    this.cachedResolvedLayerTexts.set(key, result);
    return result;
  }

  visualLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    this.checkCacheConsistency();
    const cached = this.cachedVisualLayers.get(section);
    if (cached) return cached;
    const result = section.layers.filter((layer) => !this.isNativeFunctionalLayer(layer) && (this.exportMode || !this.isFloatingAudio(layer)));
    this.cachedVisualLayers.set(section, result);
    return result;
  }

  rsvpCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => this.isRsvpFunctionalLayer(layer));
  }

  hasRsvpCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'rsvp' && this.rsvpCanvasLayers(section).length > 0;
  }

  isRsvpFunctionalLayer(layer: VisualInvitationLayer): boolean {
    const binding = String(layer.binding || '');
    return binding.startsWith('rsvp.') || binding.startsWith('display.rsvp.') || binding.startsWith('display.label.rsvp.');
  }

  dedicationCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('dedication.') || String(layer.binding || '').startsWith('display.dedications.') || String(layer.binding || '').startsWith('display.label.dedication.'));
  }

  hasDedicationCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'dedications' && this.dedicationCanvasLayers(section).length > 0;
  }

  isNativeFunctionalLayer(layer: VisualInvitationLayer): boolean {
    const binding = String(layer.binding || '');
    return this.isRsvpFunctionalLayer(layer)
      || binding.startsWith('dedication.') || binding.startsWith('display.dedications.') || binding.startsWith('display.label.dedication.')
      || binding.startsWith('song.') || binding.startsWith('display.songs.') || binding.startsWith('display.label.song.')
      || binding.startsWith('album.') || binding.startsWith('display.album.') || binding.startsWith('display.label.album.')
      || binding.startsWith('pass.') || binding.startsWith('display.guestPass.') || binding.startsWith('display.label.pass.')
      || binding.startsWith('activity.') || binding.startsWith('display.guestActivity.') || binding.startsWith('display.label.activity.')
      || binding.startsWith('countdown.') || binding.startsWith('display.countdown.')
      || binding.startsWith('location.') || binding.startsWith('display.locations.')
      || binding.startsWith('gift.') || binding.startsWith('envelope.') || binding.startsWith('display.gifts.')
      || binding.startsWith('itinerary.') || binding.startsWith('display.itinerary.')
      || binding.startsWith('dress.') || binding.startsWith('display.dressCode.')
      || binding.startsWith('lodging.') || binding.startsWith('display.lodging.')
      || binding.startsWith('gallery.') || binding.startsWith('display.gallery.');
  }

  shouldRenderDedicationLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    if (layer.binding === 'dedication.feedback') return Boolean(this.dedicationMessage);
    if (layer.binding === 'dedication.wall') return this.pluginSetting(section, 'showWall', true) !== false;
    return true;
  }

  songCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('song.') || String(layer.binding || '').startsWith('display.songs.'));
  }

  hasSongCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'songs' && this.songCanvasLayers(section).length > 0;
  }

  shouldRenderSongLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    if (layer.binding === 'song.feedback') return Boolean(this.songRequestMessage);
    if (layer.binding === 'song.sourceUrl') return this.pluginSetting(section, 'showSourceUrl', true) !== false;
    if (layer.binding === 'song.artist') return this.pluginSetting(section, 'showArtist', true) !== false;
    if (layer.binding === 'song.dedication') return this.pluginSetting(section, 'showDedication', true) !== false;
    return true;
  }

  albumCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('album.') || String(layer.binding || '').startsWith('display.album.'));
  }

  hasAlbumCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'album' && this.albumCanvasLayers(section).length > 0;
  }

  shouldRenderAlbumLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    if (layer.binding === 'album.feedback') return Boolean(this.albumMessage);
    if (layer.binding === 'album.gallery') return this.pluginSetting(section, 'showGallery', true) !== false;
    return true;
  }

  guestPassCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('pass.') || String(layer.binding || '').startsWith('display.guestPass.') || String(layer.binding || '').startsWith('display.label.pass.'));
  }

  hasGuestPassCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'guestPass' && this.guestPassCanvasLayers(section).length > 0;
  }

  shouldRenderGuestPassLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.guestPass.') || binding.startsWith('display.label.pass.')) return true;
    if (binding === 'pass.feedback') return Boolean(this.error);
    if (!this.verifiedGuest) return ['pass.email', 'pass.phone', 'pass.identify', 'pass.card', 'display.label.pass.email', 'display.label.pass.phone'].includes(binding);
    if (binding === 'pass.card') return true;
    if (binding === 'pass.name') return this.pluginSetting(section, 'showGuestName', true) !== false;
    if (binding === 'pass.group') return this.pluginSetting(section, 'showGroup', true) !== false && Boolean(this.verifiedGuest.group || this.verifiedGuest.relationshipLabel);
    if (binding === 'pass.table') return this.pluginSetting(section, 'showTable', true) !== false;
    if (binding === 'pass.seat') return this.pluginSetting(section, 'showSeat', true) !== false && Boolean(this.verifiedGuest.seatLabel);
    if (binding === 'pass.companions') return this.pluginSetting(section, 'showCompanions', true) !== false;
    if (binding === 'pass.qr') return this.pluginSetting(section, 'showQr', true) !== false && Boolean(this.guestQrUrl);
    return false;
  }

  guestPassLayerText(layer: VisualInvitationLayer): string {
    const guest = this.verifiedGuest;
    if (!guest) return '';
    if (layer.binding === 'pass.name') return guest.name;
    if (layer.binding === 'pass.group') return guest.group || guest.relationshipLabel || '';
    if (layer.binding === 'pass.table') return guest.tableName || 'Mesa por asignar';
    if (layer.binding === 'pass.seat') return guest.seatLabel ? `Lugar ${guest.seatLabel}` : '';
    if (layer.binding === 'pass.companions') return `${guest.allowedCompanions || 0} acompañante(s)`;
    return '';
  }

  guestActivityCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('activity.') || String(layer.binding || '').startsWith('display.guestActivity.') || String(layer.binding || '').startsWith('display.label.activity.'));
  }

  hasGuestActivityCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'guestActivity' && this.guestActivityCanvasLayers(section).length > 0;
  }

  shouldRenderGuestActivityLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.guestActivity.') || binding.startsWith('display.label.activity.')) return true;
    if (!this.verifiedGuest) return ['activity.email', 'activity.phone', 'activity.identify', 'display.label.activity.email', 'display.label.activity.phone'].includes(binding);
    if (binding === 'activity.greeting' || binding === 'activity.manage' || binding === 'activity.full') return true;
    if (binding === 'activity.rsvp') return this.pluginSetting(section, 'showRsvp', true) !== false;
    if (binding === 'activity.pass') return this.pluginSetting(section, 'showPass', true) !== false;
    if (binding === 'activity.album') return this.pluginSetting(section, 'showAlbum', true) !== false;
    if (binding === 'activity.songs') return this.pluginSetting(section, 'showSongs', true) !== false;
    if (binding === 'activity.dedications') return this.pluginSetting(section, 'showDedications', true) !== false;
    return false;
  }

  guestActivityLayerText(layer: VisualInvitationLayer): string {
    if (layer.binding === 'activity.greeting') {
      const notificationText = this.activityNotifications.length ? ` · ${this.activityNotifications.length} nuevo(s)` : '';
      return `Hola, ${this.verifiedGuest?.name || 'invitado'}${notificationText}`;
    }
    if (layer.binding === 'activity.rsvp') return `RSVP\n${this.activityRsvpLabel()}`;
    if (layer.binding === 'activity.pass') return `Pase\n${this.verifiedGuest?.tableName || 'Sin mesa asignada'}`;
    if (layer.binding === 'activity.album') return `Fotografías\n${this.activityCount('album')}`;
    if (layer.binding === 'activity.songs') return `Canciones\n${this.activityCount('songs')}`;
    if (layer.binding === 'activity.dedications') return `Dedicatorias\n${this.activityCount('dedications')}`;
    return '';
  }

  countdownCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('countdown.') || String(layer.binding || '').startsWith('display.countdown.'));
  }

  hasCountdownCanvasLayers(section: VisualInvitationSection): boolean {
    return this.countdownCanvasLayers(section).length > 0;
  }

  shouldRenderCountdownLayer(layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    if (layer.type === 'image' || layer.type === 'shape') return true;
    const binding = String(layer.binding || '');
    if (binding === 'countdown.expired') return this.countdown.isOver;
    if (binding.startsWith('countdown.')) return !this.countdown.isOver;
    if (['display.countdown.daysLabel', 'display.countdown.hoursLabel', 'display.countdown.minutesLabel', 'display.countdown.secondsLabel'].includes(binding)) return !this.countdown.isOver;
    return true;
  }

  countdownLayerText(layer: VisualInvitationLayer): string {
    if (layer.binding === 'countdown.days') return String(this.countdown.days);
    if (layer.binding === 'countdown.hours') return String(this.countdown.hours).padStart(2, '0');
    if (layer.binding === 'countdown.minutes') return String(this.countdown.minutes).padStart(2, '0');
    if (layer.binding === 'countdown.seconds') return String(this.countdown.seconds).padStart(2, '0');
    if (layer.binding === 'countdown.expired') {
      const countdownSection = this.sections.find((s) => s.type === 'countdown');
      const text = countdownSection ? String(this.pluginSetting(countdownSection, 'expiredText', 'El gran día llegó')) : 'El gran día llegó';
      return text || layer.text || 'El gran día llegó';
    }
    return this.resolveLayerText(layer);
  }

  locationCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('location.') || String(layer.binding || '').startsWith('display.locations.'));
  }

  hasLocationCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'locations' && this.locationCanvasLayers(section).length > 0;
  }

  shouldRenderLocationLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.locations.')) return true;
    const parsed = this.locationLayerParts(binding);
    const location = parsed ? this.locationsFor(section)[parsed.index] : undefined;
    if (!parsed) return true;
    if (!location) {
      if (layer.type === 'shape') return true;
      if (layer.type === 'image') return Boolean(layer.url);
      if (layer.type === 'button') return Boolean(layer.text || layer.url);
      return Boolean(layer.text);
    }
    if (parsed.key === 'card') return true;
    if (parsed.key === 'image') return Boolean(location.imageUrl || layer.url);
    if (parsed.key === 'details') return Boolean(location.parking || location.transport || location.accessibility || location.schedule?.length || layer.text);
    if (parsed.key === 'map') return Boolean(this.locationLayerHref(section, layer) || layer.text || layer.url);
    if (parsed.key === 'waze') return Boolean(this.locationLayerHref(section, layer) || layer.text || layer.url);
    if (parsed.key === 'phone') return Boolean(location.phone || layer.url || layer.text);
    if (parsed.key === 'website') return Boolean(location.websiteUrl || layer.url || layer.text);
    return Boolean(this.locationLayerText(section, layer) || layer.text);
  }

  locationLayerText(section: VisualInvitationSection, layer: VisualInvitationLayer): string {
    const parsed = this.locationLayerParts(String(layer.binding || ''));
    const location = parsed ? this.locationsFor(section)[parsed.index] : undefined;
    if (!parsed || !location) return layer.text || '';
    if (parsed.key === 'name') return location.name || location.type || layer.text || `Ubicación ${parsed.index + 1}`;
    if (parsed.key === 'address') return location.address || layer.text || '';
    if (parsed.key === 'notes') return location.notes || layer.text || '';
    if (parsed.key === 'details') {
      const details = [
        location.parking ? `Estacionamiento: ${location.parking}` : '',
        location.transport ? `Transporte: ${location.transport}` : '',
        location.accessibility ? `Accesibilidad: ${location.accessibility}` : '',
        ...(location.schedule || [])
      ].filter(Boolean).join('\n');
      return details || layer.text || '';
    }
    return layer.text || '';
  }

  locationLayerImageUrl(section: VisualInvitationSection, layer: VisualInvitationLayer): string {
    const parsed = this.locationLayerParts(String(layer.binding || ''));
    const location = parsed ? this.locationsFor(section)[parsed.index] : undefined;
    return location?.imageUrl || layer.url || '';
  }

  locationLayerHref(section: VisualInvitationSection, layer: VisualInvitationLayer): string {
    const parsed = this.locationLayerParts(String(layer.binding || ''));
    const location = parsed ? this.locationsFor(section)[parsed.index] : undefined;
    if (!parsed || !location) return layer.url || '';
    const query = [location.name, location.address].filter(Boolean).join(', ');
    if (parsed.key === 'map') {
      if (location.mapUrl) return location.mapUrl;
      return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : (layer.url || 'https://maps.google.com');
    }
    if (parsed.key === 'waze') {
      if (location.wazeUrl) return location.wazeUrl;
      return query ? `https://waze.com/ul?q=${encodeURIComponent(query)}` : (layer.url || 'https://waze.com');
    }
    if (parsed.key === 'phone') return location.phone ? `tel:${location.phone}` : (layer.url || '');
    if (parsed.key === 'website') return location.websiteUrl || layer.url || '';
    return layer.url || '';
  }

  private locationLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^location\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  giftCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('gift.') || String(layer.binding || '').startsWith('envelope.') || String(layer.binding || '').startsWith('display.gifts.'));
  }

  hasGiftCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'gifts' && this.giftCanvasLayers(section).length > 0;
  }

  shouldRenderGiftLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.gifts.') && binding !== 'display.gifts.envelopeTitle') return true;
    const gift = this.giftLayerParts(binding);
    if (gift) {
      if (this.pluginSetting(section, 'showRegistry', true) === false) return false;
      const item = this.invitation?.content?.giftRegistry?.[gift.index];
      if (!item) {
        if (gift.key === 'card') return true;
        if (gift.key === 'image') return Boolean(layer.url);
        if (gift.key === 'open') return Boolean(layer.url || layer.text);
        return Boolean(this.giftLayerText(layer) || layer.text);
      }
      if (gift.key === 'card') return true;
      if (gift.key === 'image') return Boolean(item.imageUrl || layer.url);
      if (gift.key === 'open') return Boolean(item.url || layer.url || layer.text);
      return Boolean(this.giftLayerText(layer) || layer.text);
    }
    if (!binding.startsWith('envelope.') && binding !== 'display.gifts.envelopeTitle') return false;
    if (this.pluginSetting(section, 'showEnvelope', true) === false) return false;
    const envelope = this.invitation?.content?.digitalEnvelope;
    if (binding === 'envelope.card' || binding === 'display.gifts.envelopeTitle') return true;
    if (binding === 'envelope.qr') return Boolean(envelope?.qrImageUrl || layer.url);
    if (binding === 'envelope.copyAccount') return Boolean(envelope?.account || layer.text);
    if (binding === 'envelope.copyClabe') return Boolean(envelope?.clabe || layer.text);
    if (binding === 'envelope.feedback') return Boolean(this.giftCopyMessage);
    return Boolean(this.giftLayerText(layer) || layer.text);
  }

  giftLayerText(layer: VisualInvitationLayer): string {
    const parsed = this.giftLayerParts(String(layer.binding || ''));
    if (parsed) {
      const gift = this.invitation?.content?.giftRegistry?.[parsed.index];
      if (!gift) return layer.text || '';
      if (parsed.key === 'title') return gift.title || gift.store || layer.text || `Mesa ${parsed.index + 1}`;
      if (parsed.key === 'store') return gift.store || layer.text || '';
      if (parsed.key === 'note') return gift.note || layer.text || '';
      return layer.text || '';
    }
    const envelope = this.invitation?.content?.digitalEnvelope;
    if (layer.binding === 'envelope.bank') return envelope?.bank || layer.text || '';
    if (layer.binding === 'envelope.holder') return envelope?.holder || layer.text || '';
    if (layer.binding === 'envelope.account') return envelope?.account ? `Cuenta: ${envelope.account}` : (layer.text || '');
    if (layer.binding === 'envelope.clabe') return envelope?.clabe ? `CLABE: ${envelope.clabe}` : (layer.text || '');
    if (layer.binding === 'envelope.note') return envelope?.note || layer.text || '';
    if (layer.binding === 'envelope.feedback') return this.giftCopyMessage;
    return layer.text || '';
  }

  giftLayerImageUrl(layer: VisualInvitationLayer): string {
    const parsed = this.giftLayerParts(String(layer.binding || ''));
    if (parsed?.key === 'image') return this.invitation?.content?.giftRegistry?.[parsed.index]?.imageUrl || layer.url || '';
    if (layer.binding === 'envelope.qr') return this.invitation?.content?.digitalEnvelope?.qrImageUrl || layer.url || '';
    return layer.url || '';
  }

  giftLayerHref(layer: VisualInvitationLayer): string {
    const parsed = this.giftLayerParts(String(layer.binding || ''));
    return parsed?.key === 'open' ? this.invitation?.content?.giftRegistry?.[parsed.index]?.url || layer.url || '' : layer.url || '';
  }

  copyGiftLayer(layer: VisualInvitationLayer): void {
    const envelope = this.invitation?.content?.digitalEnvelope;
    this.copyGiftValue(layer.binding === 'envelope.copyAccount' ? envelope?.account : envelope?.clabe);
  }

  private giftLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^gift\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  private hasDigitalEnvelopeData(): boolean {
    const envelope = this.invitation?.content?.digitalEnvelope;
    return Boolean(envelope && (envelope.bank || envelope.holder || envelope.account || envelope.clabe || envelope.note || envelope.qrImageUrl));
  }

  itineraryCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('itinerary.') || String(layer.binding || '').startsWith('display.itinerary.'));
  }

  hasItineraryCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'itinerary' && this.itineraryCanvasLayers(section).length > 0;
  }

  shouldRenderItineraryLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.itinerary.')) return true;
    const parsed = this.itineraryLayerParts(binding);
    const item = parsed ? this.invitation?.content?.itinerary?.[parsed.index] : undefined;
    if (!parsed) return true;
    if (!item) {
      if (layer.type === 'shape') return true;
      if (layer.type === 'image') return Boolean(layer.url);
      if (layer.type === 'button') return Boolean(layer.text || layer.url);
      return Boolean(layer.text);
    }
    if (parsed.key === 'card') return true;
    if (parsed.key === 'description' && this.pluginSetting(section, 'showDescription', true) === false) return false;
    if (parsed.key === 'location') return Boolean(item.locationUrl || layer.url || layer.text);
    return Boolean(this.itineraryLayerText(layer) || layer.text);
  }

  itineraryLayerText(layer: VisualInvitationLayer): string {
    const parsed = this.itineraryLayerParts(String(layer.binding || ''));
    const item = parsed ? this.invitation?.content?.itinerary?.[parsed.index] : undefined;
    if (!parsed || !item) return layer.text || '';
    if (parsed.key === 'icon') return item.icon || layer.text || '';
    if (parsed.key === 'time') return item.time || layer.text || '';
    if (parsed.key === 'title') return item.title || layer.text || '';
    if (parsed.key === 'description') return item.description || layer.text || '';
    return layer.text || '';
  }

  itineraryLayerHref(layer: VisualInvitationLayer): string {
    const parsed = this.itineraryLayerParts(String(layer.binding || ''));
    return parsed?.key === 'location' ? this.invitation?.content?.itinerary?.[parsed.index]?.locationUrl || layer.url || '' : layer.url || '';
  }

  private itineraryLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^itinerary\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  dressCodeCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('dress.') || String(layer.binding || '').startsWith('display.dressCode.'));
  }

  hasDressCodeCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'dressCode' && this.dressCodeCanvasLayers(section).length > 0;
  }

  shouldRenderDressCodeLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.dressCode.')) return true;
    if (binding === 'dress.image') return this.pluginSetting(section, 'showImage', true) !== false && Boolean(this.invitation?.content?.dressCodeImageUrl || layer.url);
    if (binding === 'dress.code') return Boolean(this.invitation?.content?.dressCode || layer.text);
    if (binding === 'dress.description') return this.pluginSetting(section, 'showDescription', true) !== false && Boolean(this.invitation?.content?.dressCodeDescription || layer.text);
    const parsed = this.dressCodeOptionLayerParts(binding);
    const option = parsed ? this.invitation?.content?.dressCodeOptions?.[parsed.index] : undefined;
    if (!parsed) return true;
    if (!option) {
      if (layer.type === 'shape') return true;
      if (layer.type === 'image') return Boolean(layer.url);
      return Boolean(layer.text);
    }
    if (parsed.key === 'card') return true;
    if (parsed.key === 'color') return Boolean(option.color || layer.style?.backgroundColor);
    return Boolean(this.dressCodeLayerText(layer) || layer.text);
  }

  dressCodeLayerText(layer: VisualInvitationLayer): string {
    if (layer.binding === 'dress.code') return this.invitation?.content?.dressCode || layer.text || '';
    if (layer.binding === 'dress.description') return this.invitation?.content?.dressCodeDescription || layer.text || '';
    const parsed = this.dressCodeOptionLayerParts(String(layer.binding || ''));
    const option = parsed ? this.invitation?.content?.dressCodeOptions?.[parsed.index] : undefined;
    if (!parsed || !option) return layer.text || '';
    if (parsed.key === 'title') return option.title || layer.text || '';
    if (parsed.key === 'description') return option.description || layer.text || '';
    return layer.text || '';
  }

  dressCodeLayerImageUrl(layer: VisualInvitationLayer): string {
    return layer.binding === 'dress.image' ? this.invitation?.content?.dressCodeImageUrl || layer.url || '' : layer.url || '';
  }

  dressCodeLayerStyle(layer: VisualInvitationLayer): Record<string, string | number | null | undefined> {
    const style = this.layerStyle(layer);
    const parsed = this.dressCodeOptionLayerParts(String(layer.binding || ''));
    const color = parsed?.key === 'color' ? this.invitation?.content?.dressCodeOptions?.[parsed.index]?.color : '';
    return color ? { ...style, backgroundColor: color } : style;
  }

  private dressCodeOptionLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^dress\.option\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  lodgingCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('lodging.') || String(layer.binding || '').startsWith('display.lodging.'));
  }

  hasLodgingCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'lodging' && this.lodgingCanvasLayers(section).length > 0;
  }

  shouldRenderLodgingLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.lodging.')) return true;
    const parsed = this.lodgingLayerParts(binding);
    const hotel = parsed ? this.invitation?.content?.lodging?.[parsed.index] : undefined;
    if (!parsed) return true;
    if (!hotel) {
      if (layer.type === 'shape') return true;
      if (layer.type === 'image') return Boolean(layer.url);
      if (layer.type === 'button') return Boolean(layer.text || layer.url);
      return Boolean(layer.text);
    }
    if (parsed.key === 'card') return true;
    if (parsed.key === 'image') return Boolean(hotel.imageUrl || layer.url);
    if (parsed.key === 'price') return this.pluginSetting(section, 'showPrice', true) !== false && Boolean(hotel.priceLabel || layer.text);
    if (parsed.key === 'agreement' || parsed.key === 'discount') return this.pluginSetting(section, 'showDiscount', true) !== false && Boolean(this.lodgingLayerText(layer) || layer.text);
    if (parsed.key === 'services') return this.pluginSetting(section, 'showServices', true) !== false && Boolean(hotel.services?.length || layer.text);
    if (parsed.key === 'reserve') return Boolean(hotel.url || layer.url || layer.text);
    if (parsed.key === 'map') return this.pluginSetting(section, 'showMap', true) !== false && Boolean(hotel.mapUrl || layer.url || layer.text);
    if (parsed.key === 'phone') return this.pluginSetting(section, 'showPhone', true) !== false && Boolean(hotel.phone || layer.url || layer.text);
    return Boolean(this.lodgingLayerText(layer) || layer.text);
  }

  lodgingLayerText(layer: VisualInvitationLayer): string {
    const parsed = this.lodgingLayerParts(String(layer.binding || ''));
    const hotel = parsed ? this.invitation?.content?.lodging?.[parsed.index] : undefined;
    if (!parsed || !hotel) return layer.text || '';
    if (parsed.key === 'name') return hotel.name || layer.text || '';
    if (parsed.key === 'description') return hotel.description || layer.text || '';
    if (parsed.key === 'address') return hotel.address || layer.text || '';
    if (parsed.key === 'price') return hotel.priceLabel || layer.text || '';
    if (parsed.key === 'agreement') return hotel.agreementLabel || layer.text || '';
    if (parsed.key === 'discount') return [hotel.discountCode, hotel.discountDescription].filter(Boolean).join(' · ') || layer.text || '';
    if (parsed.key === 'services') return (hotel.services || []).join(' · ') || layer.text || '';
    if (parsed.key === 'notes') return hotel.notes || layer.text || '';
    return layer.text || '';
  }

  lodgingLayerImageUrl(layer: VisualInvitationLayer): string {
    const parsed = this.lodgingLayerParts(String(layer.binding || ''));
    return parsed?.key === 'image' ? (this.invitation?.content?.lodging?.[parsed.index]?.imageUrl || layer.url || '') : (layer.url || '');
  }

  lodgingLayerHref(layer: VisualInvitationLayer): string {
    const parsed = this.lodgingLayerParts(String(layer.binding || ''));
    const hotel = parsed ? this.invitation?.content?.lodging?.[parsed.index] : undefined;
    if (!parsed || !hotel) return layer.url || '';
    if (parsed.key === 'reserve') return hotel.url || layer.url || '';
    if (parsed.key === 'map') {
      if (hotel.mapUrl) return hotel.mapUrl;
      const query = [hotel.name, hotel.address].filter(Boolean).join(', ');
      return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : (layer.url || '');
    }
    if (parsed.key === 'phone') return hotel.phone ? `tel:${hotel.phone}` : (layer.url || '');
    return layer.url || '';
  }

  private lodgingLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^lodging\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  galleryCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return uniqueVisibleControls(section.layers).filter((layer) => String(layer.binding || '').startsWith('gallery.') || String(layer.binding || '').startsWith('display.gallery.'));
  }

  hasGalleryCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'gallery' && this.galleryCanvasLayers(section).length > 0;
  }

  shouldRenderGalleryLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.gallery.')) return true;
    const carousel = this.galleryDisplayModeFor(section) === 'carousel';
    if (binding.startsWith('gallery.carousel.')) {
      if (!carousel) return false;
      if (binding === 'gallery.carousel.previous' || binding === 'gallery.carousel.next') return this.galleryItems.length > 1;
      if (binding === 'gallery.carousel.counter') return true;
      if (binding === 'gallery.carousel.image') return Boolean(this.galleryItems.length || layer.url);
      return Boolean(this.galleryLayerText(layer) || layer.text);
    }
    if (carousel) return false;
    const parsed = this.galleryItemLayerParts(binding);
    const item = parsed ? this.invitation?.content?.galleryItems?.[parsed.index] : undefined;
    if (!parsed) return true;
    if (!item?.url) {
      if (parsed.key === 'card') return true;
      if (parsed.key === 'image') return Boolean(layer.url);
      return Boolean(layer.text);
    }
    if (parsed.key === 'card' || parsed.key === 'image') return true;
    return Boolean(this.galleryLayerText(layer) || layer.text);
  }

  galleryLayerText(layer: VisualInvitationLayer): string {
    const binding = String(layer.binding || '');
    if (binding === 'gallery.carousel.counter') return `${this.galleryIndex + 1} / ${Math.max(1, this.galleryItems.length)}`;
    const carouselMatch = binding.match(/^gallery\.carousel\.(title|description|dedication)$/);
    if (carouselMatch) return this.galleryItems[this.galleryIndex]?.[carouselMatch[1] as 'title' | 'description' | 'dedication'] || layer.text || '';
    const parsed = this.galleryItemLayerParts(binding);
    const item = parsed ? this.invitation?.content?.galleryItems?.[parsed.index] : undefined;
    if (!parsed || !item) return layer.text || '';
    if (parsed.key === 'title') return item.title || layer.text || '';
    if (parsed.key === 'description') return item.description || layer.text || '';
    if (parsed.key === 'dedication') return item.dedication || layer.text || '';
    return layer.text || '';
  }

  galleryLayerImageUrl(layer: VisualInvitationLayer): string {
    if (layer.binding === 'gallery.carousel.image') return this.galleryItems[this.galleryIndex]?.url || layer.url || '';
    const parsed = this.galleryItemLayerParts(String(layer.binding || ''));
    return parsed?.key === 'image' ? this.invitation?.content?.galleryItems?.[parsed.index]?.url || layer.url || '' : layer.url || '';
  }

  galleryNativeImageStyle(layer: VisualInvitationLayer): Record<string, string> {
    const base = this.imageStyle(layer);
    const parsed = this.galleryItemLayerParts(String(layer.binding || ''));
    const item = layer.binding === 'gallery.carousel.image'
      ? this.galleryItems[this.galleryIndex]
      : parsed ? this.invitation?.content?.galleryItems?.[parsed.index] : undefined;
    return item ? { ...base, objectFit: item.fit || base['objectFit'], objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%` } : base;
  }

  openGalleryLayer(layer: VisualInvitationLayer): void {
    const url = this.galleryLayerImageUrl(layer);
    if (url) this.openLightbox.emit(url);
  }

  private galleryItemLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^gallery\.item\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  rsvpControlName(layer: VisualInvitationLayer): string {
    return `visual-${layer.id.replace(/[^a-z0-9_-]/gi, '-')}`;
  }

  shouldRenderRsvpLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (this.verifiedGuest && (binding === 'rsvp.name' || binding === 'rsvp.email' || binding === 'display.label.rsvp.name' || binding === 'display.label.rsvp.email')) return false;
    if (binding === 'rsvp.companions' || binding === 'display.label.rsvp.companions') return this.rsvp.response !== 'declined' && this.maxCompanions > 0;
    if (binding === 'rsvp.dietaryRestrictions' || binding === 'display.label.rsvp.dietaryRestrictions') return this.pluginSetting(section, 'showDietary', true) !== false;
    if (binding === 'rsvp.message' || binding === 'display.label.rsvp.message') return this.pluginSetting(section, 'showMessage', true) !== false;
    if (layer.binding === 'rsvp.feedback') return Boolean(this.success || this.error);
    return true;
  }

  handleLayerAction(layer: VisualInvitationLayer): void {
    const action = String(layer.binding || '');
    if (action.startsWith('section:')) {
      const target = action.slice('section:'.length);
      document.querySelector(`[data-section="${target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (action === 'map') {
      const location = this.invitation?.content?.locations?.find((item) => item.mapUrl)?.mapUrl || this.event?.venue?.mapUrl;
      if (location) window.open(location, '_blank', 'noopener');
      return;
    }
    if (action === 'calendar') {
      const url = this.calendarUrl();
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }
    const url = String(layer.url || '').trim();
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
    else if (/^(mailto:|tel:)/i.test(url)) window.location.href = url;
  }

  private calendarUrl(): string {
    if (!this.event?.date) return '';
    const dateOnly = this.event.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const start = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
      : new Date(this.event.date);
    if (this.event.time && /^\d{2}:\d{2}/.test(this.event.time)) {
      const [hours, minutes] = this.event.time.split(':').map(Number);
      start.setHours(hours, minutes, 0, 0);
    }
    if (Number.isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, '0');
    const format = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    const location = [this.event.venue?.name, this.event.venue?.address].filter(Boolean).join(', ');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.event.title)}&dates=${format(start)}/${format(end)}&location=${encodeURIComponent(location)}`;
  }

  designThemeStyle(): Record<string, string> {
    this.checkCacheConsistency();
    if (this.cachedDesignThemeStyle) return this.cachedDesignThemeStyle;
    const theme = this.invitation?.content?.visualDesign?.theme;
    if (!theme) return {};
    const result: Record<string, string> = {
      '--visual-background': theme.backgroundColor,
      '--visual-text': theme.textColor,
      '--visual-accent': theme.accentColor,
      '--visual-heading-font': theme.headingFont,
      '--visual-body-font': theme.bodyFont,
      '--visual-background-overlay': this.colorWithAlpha(theme.backgroundColor, .94, 'rgba(255,255,255,.94)'),
      '--visual-accent-border': this.colorWithAlpha(theme.accentColor, .32, 'rgba(154,103,84,.32)'),
      '--visual-accent-soft': this.colorWithAlpha(theme.accentColor, .1, 'rgba(154,103,84,.1)'),
      '--visual-text-shadow': this.colorWithAlpha(theme.textColor, .15, 'rgba(41,37,35,.15)'),
      '--visual-button-background': theme.buttonStyle === 'solid' ? theme.buttonBackgroundColor : theme.buttonStyle === 'soft' ? this.colorWithAlpha(theme.buttonBackgroundColor, .16, 'rgba(41,37,35,.16)') : 'transparent',
      '--visual-button-text': theme.buttonStyle === 'solid' ? theme.buttonTextColor : theme.buttonBackgroundColor,
      '--visual-button-border': theme.buttonStyle === 'outline' ? `2px solid ${theme.buttonBackgroundColor}` : '0 solid transparent',
      '--visual-button-radius': `${theme.buttonRadius}px`
    };
    this.cachedDesignThemeStyle = result;
    return result;
  }

  private colorWithAlpha(color: string, alpha: number, fallback: string): string {
    const value = String(color || '').trim();
    const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return fallback;
    const hex = match[1].length === 3 ? match[1].split('').map((part) => part + part).join('') : match[1];
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  isXvBurgundy(): boolean {
    this.checkCacheConsistency();
    if (this.cachedIsXvBurgundy !== null) return this.cachedIsXvBurgundy;
    const theme = this.invitation?.content?.visualDesign?.theme;
    const bg = String(theme?.backgroundColor || '').toLowerCase().trim();
    const accent = String(theme?.accentColor || '').toLowerCase().trim();
    const font = String(theme?.headingFont || '').toLowerCase();
    let result = false;
    if (bg === '#240308' || bg === '#180104' || bg === '#5c0d18' || bg === '#2d060e') {
      result = true;
    } else if (this.invitation?.template === 'xv-burgundy' || this.invitation?.content?.template === 'template-xv-burgundy' || this.invitation?.content?.template === 'xv-burgundy') {
      result = true;
    } else if (font.includes('great vibes') || (accent === '#d4af37' || accent === '#e8c85c')) {
      result = true;
    } else if (this.sections?.some((s) => s.background?.imageUrl?.includes('xv-burgundy'))) {
      result = true;
    } else if (this.sections?.some((s) => s.layers?.some((l) => l.url?.includes('xv-burgundy')))) {
      result = true;
    }
    this.cachedIsXvBurgundy = result;
    return result;
  }

  sectionStyle(section: VisualInvitationSection): Record<string, string> {
    this.checkCacheConsistency();
    const cached = this.cachedSectionStyles.get(section);
    if (cached) return cached;
    const background = section.background || {};
    const moduleStyle = section.moduleStyle || {};
    const overlay = Math.round((background.overlay || 0) * 255).toString(16).padStart(2, '0');
    const height = this.sectionRenderHeight(section);
    const naturalFlow = this.presentationMode === 'chapters' && !this.exportMode && !section.layers.length && !['hero', 'custom'].includes(section.type);
    const isXv = this.isXvBurgundy();
    const defaultBg = isXv ? '#240308' : '#ffffff';
    const resolvedBgColor = background.color && background.color !== '#fff' && background.color !== '#ffffff' ? background.color : defaultBg;
    const result: Record<string, string> = {
      height: naturalFlow ? 'auto' : `${height}px`,
      minHeight: `${height}px`,
      backgroundColor: resolvedBgColor,
      backgroundImage: background.imageUrl
        ? `linear-gradient(#000000${overlay},#000000${overlay}),url("${background.imageUrl}")`
        : (isXv ? 'radial-gradient(ellipse at 50% 25%, #380712 0%, #1f0207 65%, #130104 100%)' : 'none'),
      '--module-columns': String(moduleStyle.columns || 2),
      '--module-gap': `${Number(moduleStyle.gap ?? 14)}px`
    };
    this.cachedSectionStyles.set(section, result);
    return result;
  }

  sectionHasOverflowLayers(section: VisualInvitationSection): boolean {
    if (this.presentationMode !== 'continuous') return false;
    return section.layers.some((layer) => {
      if (layer.hidden || this.isFloatingAudio(layer)) return false;
      const layout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && layer.layouts?.[this.device]
        ? layer.layouts[this.device]!
        : layer;
      return layout.y < 0 || layout.y + layout.height > 100;
    });
  }

  sectionRenderHeight(section: VisualInvitationSection): number {
    this.checkCacheConsistency();
    const cached = this.cachedSectionHeights.get(section);
    if (cached !== undefined) return cached;
    const isXv = this.isXvBurgundy();
    let height: number;
    if (section.type === 'rsvp' && isXv && section.height && section.height > 720 && this.hasRsvpCanvasLayers(section)) {
      height = 680;
    } else {
      height = visualSectionHeight(section);
    }
    this.cachedSectionHeights.set(section, height);
    return height;
  }

  continuousSectionOffset(section: VisualInvitationSection): number {
    this.checkCacheConsistency();
    const cached = this.cachedSectionOffsets.get(section);
    if (cached !== undefined) return cached;
    let offset = 0;
    for (const item of this.displayedSections) {
      this.cachedSectionOffsets.set(item, offset);
      offset += this.sectionRenderHeight(item);
    }
    return this.cachedSectionOffsets.get(section) ?? 0;
  }

  continuousLayerStyle(section: VisualInvitationSection, layer: VisualInvitationLayer): Record<string, string> {
    this.checkCacheConsistency();
    const sectionOffset = this.continuousSectionOffset(section);
    const sectionHeight = this.sectionRenderHeight(section);
    const cached = this.cachedContinuousLayerStyles.get(layer);
    if (
      cached &&
      cached.section === section &&
      cached.styleRef === layer.style &&
      cached.device === this.device &&
      cached.exportMode === this.exportMode &&
      cached.sectionOffset === sectionOffset &&
      cached.sectionHeight === sectionHeight
    ) {
      return cached.result;
    }
    const layout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && layer.layouts?.[this.device]
      ? layer.layouts[this.device]!
      : layer;
    const result: Record<string, string> = {
      ...this.layerStyle(layer),
      top: `${sectionOffset + sectionHeight * layout.y / 100}px`,
      height: `${sectionHeight * layout.height / 100}px`
    };
    if (layer.binding === 'countdown.expired' && this.countdown.isOver) {
      const plaque = section.layers.find((l) => l.binding === 'display.countdown.plaque' || l.binding === 'display.countdown.frame');
      if (plaque) {
        const pLayout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && plaque.layouts?.[this.device]
          ? plaque.layouts[this.device]!
          : plaque;
        const centerY = pLayout.y + (pLayout.height - layout.height) / 2;
        result['top'] = `${sectionOffset + sectionHeight * centerY / 100}px`;
      }
    }
    this.cachedContinuousLayerStyles.set(layer, {
      section,
      styleRef: layer.style,
      device: this.device,
      exportMode: this.exportMode,
      sectionOffset,
      sectionHeight,
      result
    });
    return result;
  }

  moduleClasses(section: VisualInvitationSection): string[] {
    this.checkCacheConsistency();
    const cached = this.cachedModuleClasses.get(section);
    if (cached) return cached;
    const style = section.moduleStyle || {};
    const result = [
      `module-layout-${style.layout || 'grid'}`,
      `module-align-${style.alignment || 'center'}`,
      `module-surface-${style.surface || 'solid'}`,
      `module-cards-${style.cardStyle || 'bordered'}`,
      style.showTitle === false ? 'module-title-hidden' : 'module-title-visible'
    ];
    this.cachedModuleClasses.set(section, result);
    return result;
  }

  layerStyle(layer: VisualInvitationLayer): Record<string, string> {
    this.checkCacheConsistency();
    const cached = this.cachedLayerStyles.get(layer);
    if (cached && cached.styleRef === layer.style && cached.device === this.device && cached.exportMode === this.exportMode) {
      return cached.result;
    }
    const style = layer.style || {};
    const shape = layer.type === 'shape';
    const isIcon = layer.type === 'text' && Boolean(style.iconName);
    const maskedImage = layer.type === 'image' && !!style.imageMask && style.imageMask !== 'none';
    const responsiveScale = this.sharedStyleScale();
    const layout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && layer.layouts?.[this.device]
      ? layer.layouts[this.device]!
      : layer;
    const result: Record<string, string> = {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(style.color || '#25211f'), backgroundColor: shape || maskedImage ? 'transparent' : String(style.backgroundColor || 'transparent'),
      fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${this.scaledLayerPixels(style.fontSize || 30, responsiveScale, 10)}px`,
      fontWeight: String(style.fontWeight || 400), fontStyle: String(style.fontStyle || 'normal'), textAlign: String(style.textAlign || 'center'),
      lineHeight: isIcon ? '1' : String(style.lineHeight || 1.2), letterSpacing: `${this.scaledLayerPixels(style.letterSpacing || 0, responsiveScale)}px`, textTransform: String(style.textTransform || 'none'),
      textDecoration: String(style.textDecoration || 'none'), textShadow: String(style.textShadow || 'none'),
      borderRadius: shape ? '0' : `${this.scaledLayerPixels(style.borderRadius || 0, responsiveScale)}px`, borderColor: shape ? 'transparent' : String(style.borderColor || 'transparent'),
      borderStyle: !shape && !maskedImage && Number(style.borderWidth || 0) > 0 ? String(style.borderStyle || 'solid') : 'none', borderWidth: shape || maskedImage ? '0' : `${this.scaledLayerPixels(style.borderWidth || 0, responsiveScale)}px`,
      backgroundImage: !shape && style.gradientEnabled
        ? `linear-gradient(${Number(style.gradientAngle || 0)}deg,${String(style.gradientStart || '#ffffff')},${String(style.gradientEnd || '#000000')})`
        : !shape && style.backgroundImageUrl ? `url("${String(style.backgroundImageUrl)}")` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center', padding: shape || isIcon ? '0' : `${this.scaledLayerPixels(style.padding || 0, responsiveScale)}px`,
      boxShadow: shape ? 'none' : String(style.boxShadow || 'none'), opacity: String(style.opacity ?? 1),
      '--button-hover-background': String(style.hoverBackgroundColor || style.backgroundColor || 'transparent'),
      '--button-hover-color': String(style.hoverColor || style.color || '#25211f'),
      '--button-pressed-scale': String(style.pressedScale ?? .97),
      animationDuration: `${Number(layer.animation?.duration || 1)}s`, animationDelay: `${Number(layer.animation?.delay || 0)}s`,
      animationIterationCount: layer.animation?.repeat ? 'infinite' : '1'
    };
    if (layer.binding === 'countdown.expired' && this.countdown.isOver) {
      const countdownSection = this.sections.find((s) => s.type === 'countdown' || s.layers.some((l) => l.binding === 'countdown.expired'));
      const plaque = countdownSection?.layers.find((l) => l.binding === 'display.countdown.plaque' || l.binding === 'display.countdown.frame');
      if (plaque) {
        const pLayout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && plaque.layouts?.[this.device]
          ? plaque.layouts[this.device]!
          : plaque;
        const centerY = pLayout.y + (pLayout.height - layout.height) / 2;
        result['top'] = `${centerY}%`;
      }
    }
    if (!this.exportMode && this.isFloatingAudio(layer)) {
      const size = Math.max(40, Math.min(140, Number(style.audioSize || 64)));
      const offset = Math.max(8, Math.min(80, Number(style.audioOffset || 20)));
      const corner = style.audioCorner || 'bottom-right';
      result['position'] = 'fixed';
      result['width'] = `${size}px`;
      result['height'] = `${size}px`;
      result['left'] = corner.endsWith('left') ? `${offset}px` : 'auto';
      result['right'] = corner.endsWith('right') ? `${offset}px` : 'auto';
      result['top'] = corner.startsWith('top') ? `${offset}px` : 'auto';
      result['bottom'] = corner.startsWith('bottom') ? `${offset}px` : 'auto';
      result['transform'] = 'none';
      result['zIndex'] = '12000';
    }
    this.cachedLayerStyles.set(layer, { styleRef: layer.style, device: this.device, exportMode: this.exportMode, result });
    return result;
  }

  isFloatingAudio(layer: VisualInvitationLayer): boolean {
    return layer.type === 'audio'
      && layer.style?.audioPresentation === 'button'
      && layer.style?.audioPosition === 'fixed'
      && ['direct', 'youtube', 'spotify'].includes(resolveVisualMediaSource(layer.url).provider);
  }

  private sharedStyleScale(): number {
    if (this.invitation?.content?.visualDesign?.responsiveMode === 'independent') return 1;
    return this.device === 'mobile' ? .68 : this.device === 'tablet' ? .84 : 1;
  }

  private scaledLayerPixels(value: number, scale: number, minimum = 0): number {
    return Math.round(Math.max(minimum, Number(value || 0) * scale) * 100) / 100;
  }

  animationClass(layer: VisualInvitationLayer): string[] {
    this.checkCacheConsistency();
    const type = layer.animation?.type || 'none';
    const key = `${layer.id || ''}:${layer.type}:${type}`;
    const cached = this.cachedAnimationClasses.get(key);
    if (cached) return cached;
    const result = type === 'none' ? [`layer-${layer.type}`] : [`layer-${layer.type}`, 'animated-layer', `animation-${type}`];
    this.cachedAnimationClasses.set(key, result);
    return result;
  }

  imageStyle(layer: VisualInvitationLayer): Record<string, string> {
    this.checkCacheConsistency();
    const cached = this.cachedImageStyles.get(layer);
    if (cached && cached.styleRef === layer.style && cached.device === this.device) return cached.result;
    const style = layer.style || {};
    const scale = Number(style.imageScale || 1);
    const result: Record<string, string> = {
      objectFit: style.preserveAspectRatio !== false ? 'contain' : (style.objectFit || 'cover'),
      objectPosition: `${style.objectPositionX ?? 50}% ${style.objectPositionY ?? 50}%`,
      clipPath: style.imageMask && style.imageMask !== 'none' && Number(style.borderWidth || 0) > 0 ? this.imageMaskStyle(layer)['clipPath'] : 'none',
      borderRadius: style.imageMask === 'rounded' ? '12%' : '0',
      transform: `scale(${scale * (style.flipX ? -1 : 1)},${scale * (style.flipY ? -1 : 1)}) rotate(${Number(style.imageRotation || 0)}deg)`,
      filter: `brightness(${Number(style.brightness ?? 100)}%) contrast(${Number(style.contrast ?? 100)}%) saturate(${Number(style.saturation ?? 100)}%) blur(${Number(style.blur || 0)}px)`
    };
    this.cachedImageStyles.set(layer, { styleRef: layer.style, device: this.device, result });
    return result;
  }

  imageMaskStyle(layer: VisualInvitationLayer): Record<string, string> {
    this.checkCacheConsistency();
    const cached = this.cachedImageMaskStyles.get(layer);
    if (cached && cached.styleRef === layer.style && cached.device === this.device) return cached.result;
    const mask = layer.style?.imageMask || 'none';
    const masks: Record<string, string> = {
      none: 'none', circle: 'circle(50% at 50% 50%)', rounded: 'inset(0 round 12%)',
      arch: 'inset(0 round 50% 50% 10% 10%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
      hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)',
      ticket: 'polygon(0 0,100% 0,100% 38%,92% 50%,100% 62%,100% 100%,0 100%,0 62%,8% 50%,0 38%)'
    };
    const framed = mask !== 'none' && Number(layer.style?.borderWidth || 0) > 0;
    const result: Record<string, string> = {
      clipPath: masks[mask] || 'none', borderRadius: mask === 'rounded' ? '12%' : '0',
      boxSizing: 'border-box',
      padding: framed ? `${this.scaledLayerPixels(Number(layer.style?.borderWidth || 0), this.sharedStyleScale())}px` : '0',
      backgroundColor: framed ? String(layer.style?.borderColor || '#ffffff') : 'transparent'
    };
    this.cachedImageMaskStyles.set(layer, { styleRef: layer.style, device: this.device, result });
    return result;
  }

  shapeContentStyle(layer: VisualInvitationLayer): Record<string, string> {
    this.checkCacheConsistency();
    const cached = this.cachedShapeContentStyles.get(layer);
    if (cached && cached.styleRef === layer.style) return cached.result;
    const style = layer.style || {};
    const shapes: Record<string, string> = {
      rectangle: 'none',
      rounded: 'inset(0 round 12px)',
      pill: 'inset(0 round 9999px)',
      circle: 'circle(50% at 50% 50%)',
      ellipse: 'ellipse(50% 42% at 50% 50%)',
      arch: 'inset(0 round 50% 50% 0 0)',
      'arch-inverted': 'inset(0 round 0 0 50% 50%)',
      window: 'inset(0 round 48% 48% 6% 6%)',
      triangle: 'polygon(50% 0, 100% 100%, 0 100%)',
      'triangle-down': 'polygon(0 0, 100% 0, 50% 100%)',
      diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
      pentagon: 'polygon(50% 0, 100% 38%, 81% 100%, 19% 100%, 0 38%)',
      hexagon: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
      octagon: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)',
      star: 'polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 93%, 50% 72%, 21% 93%, 32% 57%, 2% 35%, 39% 35%)',
      'star-4': 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)',
      'star-8': 'polygon(50% 0, 65% 20%, 85% 15%, 80% 35%, 100% 50%, 80% 65%, 85% 85%, 65% 80%, 50% 100%, 35% 80%, 15% 85%, 20% 65%, 0 50%, 20% 35%, 15% 15%, 35% 20%)',
      heart: 'polygon(50% 88%, 35% 73%, 20% 58%, 10% 42%, 8% 26%, 16% 12%, 30% 8%, 42% 14%, 50% 26%, 58% 14%, 70% 8%, 84% 12%, 92% 26%, 90% 42%, 80% 58%, 65% 73%)',
      shield: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)',
      ticket: 'polygon(0 0, 100% 0, 100% 38%, 92% 50%, 100% 62%, 100% 100%, 0 100%, 0 62%, 8% 50%, 0 38%)',
      banner: 'polygon(100% 0, 90% 50%, 100% 100%, 0 100%, 10% 50%, 0 0)',
      pennant: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
      chevron: 'polygon(75% 0, 100% 50%, 75% 100%, 0 100%, 25% 50%, 0 0)',
      clover: 'polygon(50% 0, 65% 8%, 80% 0, 92% 12%, 92% 28%, 100% 40%, 98% 56%, 92% 70%, 92% 86%, 80% 98%, 65% 90%, 50% 100%, 35% 90%, 20% 98%, 8% 86%, 8% 70%, 2% 56%, 0 40%, 8% 28%, 8% 12%, 20% 0, 35% 8%)',
      line: 'inset(42% 0)',
      'line-diamond': 'polygon(0 46%, 45% 46%, 50% 15%, 55% 46%, 100% 46%, 100% 54%, 55% 54%, 50% 85%, 45% 54%, 0 54%)'
    };
    let shapeBgColor = String(style.backgroundColor || '#d88f7d');
    const dressOptionMatch = String(layer.binding || '').match(/^dress\.option\.(\d+)\.color$/);
    if (dressOptionMatch) {
      const optColor = this.invitation?.content?.dressCodeOptions?.[Number(dressOptionMatch[1])]?.color;
      if (optColor) shapeBgColor = optColor;
    }
    const result: Record<string, string> = {
      boxSizing: 'border-box',
      width: '100%', height: '100%', backgroundColor: shapeBgColor,
      backgroundImage: style.gradientEnabled ? `linear-gradient(${Number(style.gradientAngle || 0)}deg,${String(style.gradientStart || '#ffffff')},${String(style.gradientEnd || '#000000')})` : 'none',
      border: `${Number(style.borderWidth || 0)}px ${String(style.borderStyle || 'solid')} ${String(style.borderColor || 'transparent')}`,
      borderRadius: `${Number(style.borderRadius || 0)}px`, boxShadow: String(style.boxShadow || 'none'),
      clipPath: shapes[style.shapeKind || 'rectangle'] || 'none',
      ...(style.backdropFilter ? { backdropFilter: style.backdropFilter, WebkitBackdropFilter: style.backdropFilter } : {})
    };
    this.cachedShapeContentStyles.set(layer, { styleRef: layer.style, result });
    return result;
  }

  assetCredit(url?: string): { label: string; url: string } | undefined {
    if (!url) return undefined;
    const asset = this.invitation?.content?.visualDesign?.assets?.find((item) => item.url === url && item.attribution && item.attributionUrl);
    return asset ? { label: asset.attribution!, url: asset.attributionUrl! } : undefined;
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    if (!this.forcedDevice) {
      const nextDevice = this.detectDevice();
      if (nextDevice !== this.device) {
        this.device = nextDevice;
        this.clearRenderCache();
        this.cdr?.markForCheck();
      }
    }
  }

  private resetSandboxForms(): void {
    this.guestEmail = '';
    this.guestPhone = '';
    this.rsvp = { name: '', email: '', response: 'confirmed', companions: 0, dietaryRestrictions: '', message: '' };
    this.dedication = { publicName: '', message: '' };
    this.song = { title: '', artist: '', dedication: '', sourceUrl: '' };
  }

  @HostListener('document:keydown.escape')
  closeActivityOnEscape(): void {
    if (this.activityPanelOpen) this.closeActivityPanel();
  }

  identifyGuest(): void {
    if (!this.guestEmail.trim() && !this.guestPhone.trim()) return;
    this.verifyGuestAccess.emit({ email: this.guestEmail.trim(), phone: this.guestPhone.trim() });
  }

  sendRsvp(): void {
    if (this.sending) return;
    this.submitRsvp.emit({ ...this.rsvp, companions: Number(this.rsvp.companions || 0) });
  }

  selectPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadPhoto.emit(file);
  }

  sendDedication(): void {
    if (this.sending || !this.dedication.message.trim()) return;
    this.submitDedication.emit({ ...this.dedication });
  }

  sendSong(): void {
    if (this.sending || (!this.song.title.trim() && !this.song.sourceUrl.trim())) return;
    this.requestSong.emit({ ...this.song });
  }

  copyGiftValue(value?: string): void {
    if (!value) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        this.giftCopyMessage = 'Datos copiados.';
        this.cdr?.markForCheck();
      }).catch(() => {
        this.giftCopyMessage = 'No fue posible copiar automáticamente.';
        this.cdr?.markForCheck();
      });
      return;
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    this.giftCopyMessage = document.execCommand('copy') ? 'Datos copiados.' : 'No fue posible copiar automáticamente.';
    input.remove();
    this.cdr?.markForCheck();
  }

  private detectDevice(): 'mobile' | 'tablet' | 'desktop' {
    const width = typeof window === 'undefined' ? 390 : window.innerWidth;
    return width <= 600 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop';
  }

  private configureGalleryTimer(): void {
    this.clearGalleryTimer();
    if (this.exportMode) return;
    const settings = this.invitation?.content?.gallerySettings;
    const carouselEnabled = this.sections.some((section) => section.type === 'gallery' && this.galleryDisplayModeFor(section) === 'carousel');
    if (!carouselEnabled || !settings?.autoplay || this.galleryItems.length < 2) return;
    const seconds = Math.max(2, Math.min(30, Number(settings.intervalSeconds || 5)));
    this.galleryTimer = setInterval(() => this.moveGallery(1), seconds * 1000);
  }

  private configureCountdownTimer(): void {
    this.clearCountdownTimer();
    this.updateCountdown();
    if ((this.event?.date || this.isPreview()) && !this.countdown.isOver) {
      this.countdownTimer = setInterval(() => this.updateCountdown(), 1000);
    }
  }

  private isPreview(): boolean {
    if (typeof window === 'undefined') return false;
    const search = window.location?.search || '';
    return search.includes('preview=true') || search.includes('previewId=') || Boolean(this.invitation?.content?.visualDesignDraft);
  }

  private updateCountdown(): void {
    let target = this.eventTargetDate();
    let distance = target ? target.getTime() - Date.now() : 0;
    const isPrev = this.isPreview();
    if ((!target || Number.isNaN(distance) || distance <= 0) && isPrev) {
      distance = 38 * 24 * 60 * 60 * 1000;
    }
    if (distance <= 0) {
      const wasOver = this.countdown.isOver;
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
      if (!wasOver) this.cachedLayerStyles.clear();
      this.cdr?.markForCheck();
      return;
    }
    const wasOver = this.countdown.isOver;
    this.countdown = {
      days: Math.floor(distance / 86400000),
      hours: Math.floor(distance / 3600000) % 24,
      minutes: Math.floor(distance / 60000) % 60,
      seconds: Math.floor(distance / 1000) % 60,
      isOver: false
    };
    if (wasOver) this.cachedLayerStyles.clear();
    this.cdr?.markForCheck();
  }

  private eventTargetDate(): Date | null {
    if (!this.event?.date) return null;
    const dateOnly = this.event.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const target = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
      : new Date(this.event.date);
    if (this.event.time && /^\d{2}:\d{2}/.test(this.event.time)) {
      const [hours, minutes] = this.event.time.split(':').map(Number);
      target.setHours(hours, minutes, 0, 0);
    }
    return Number.isNaN(target.getTime()) ? null : target;
  }

  private clearGalleryTimer(): void {
    if (this.galleryTimer) clearInterval(this.galleryTimer);
    this.galleryTimer = undefined;
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = undefined;
  }
}
