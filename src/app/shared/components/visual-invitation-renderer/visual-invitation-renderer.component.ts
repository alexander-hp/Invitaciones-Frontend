import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import {
  DedicationModel, EventModel, ExternalGuestStatusResponse, GuestAccessResponse, GuestActivityNotification, InvitationGalleryItem, InvitationLocation, InvitationModel, RsvpResponse,
  VisualInvitationLayer, VisualInvitationSection, VisualPluginPartDesign
} from '../../../core/models';
import { resolveVisualTemplateText, visualTemplateContext } from '../../../core/visual-template-bindings';

@Component({
  selector: 'app-visual-invitation-renderer',
  templateUrl: './visual-invitation-renderer.component.html',
  styleUrls: ['./visual-invitation-renderer.component.css']
})
export class VisualInvitationRendererComponent implements OnChanges, OnDestroy {
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
  @Input() sandboxResetKey = 0;

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

  activityPanelOpen = false;
  quickRsvp = { response: 'confirmed' as RsvpResponse, companions: 0, companionNames: '', message: '' };
  editingActivityDedicationId = '';
  activityDedicationDraft = '';

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
  countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false };
  private galleryTimer?: ReturnType<typeof setInterval>;
  private countdownTimer?: ReturnType<typeof setInterval>;

  get sections(): VisualInvitationSection[] {
    return (this.invitation?.content?.visualDesign?.sections || []).filter((section) => section.enabled);
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
    if (changes['sandboxResetKey'] && !changes['sandboxResetKey'].firstChange) this.resetSandboxForms();
    this.galleryIndex = Math.min(this.galleryIndex, Math.max(0, this.galleryItems.length - 1));
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
  }

  trackVisualById(index: number, item: VisualInvitationSection | VisualInvitationLayer): string | number {
    return item.id || index;
  }

  pluginSetting(section: VisualInvitationSection, key: string, fallback: string | number | boolean = ''): string | number | boolean {
    return section.pluginSettings?.[key] ?? fallback;
  }

  pluginPartDesign(section: VisualInvitationSection, key: string): VisualPluginPartDesign {
    const theme = this.invitation?.content?.visualDesign?.theme;
    const displayPart = ['eyebrow', 'title', 'intro'].includes(key);
    const defaults: VisualPluginPartDesign = displayPart
      ? { backgroundColor: 'transparent', borderWidth: 0, padding: 3, textAlign: 'center', fontSize: key === 'title' ? 34 : key === 'eyebrow' ? 11 : 14 }
      : { backgroundColor: '#ffffff', borderColor: '#d5cbc4', borderWidth: 1, borderRadius: 8, padding: 10, textAlign: key === 'submit' || key === 'feedback' ? 'center' : 'left', fontSize: 14 };
    if (key === 'title') defaults.fontFamily = theme?.headingFont || 'Georgia, serif';
    if (key === 'submit') Object.assign(defaults, { backgroundColor: theme?.buttonBackgroundColor || '#292523', color: theme?.buttonTextColor || '#ffffff', borderWidth: 0, fontWeight: 700 });
    if (key === 'feedback') Object.assign(defaults, { backgroundColor: '#edf5fb', borderWidth: 0, fontSize: 12 });
    return { ...defaults, ...(section.pluginDesign?.parts?.[key] || {}) };
  }

  pluginPartLabel(section: VisualInvitationSection, key: string, fallback: string): string {
    return this.pluginPartDesign(section, key).label || fallback;
  }

  pluginPartPlaceholder(section: VisualInvitationSection, key: string, fallback: string): string {
    return this.pluginPartDesign(section, key).placeholder || fallback;
  }

  pluginPartClasses(section: VisualInvitationSection, key: string): string[] {
    const design = this.pluginPartDesign(section, key);
    return [`plugin-part-${key}`, `plugin-shape-${design.shape || 'rectangle'}`, design.variant === 'cards' ? 'plugin-variant-cards' : 'plugin-variant-default'];
  }

  pluginPartStyle(section: VisualInvitationSection, key: string): Record<string, string> {
    const part = this.pluginPartDesign(section, key);
    const free = section.pluginDesign?.layout === 'free';
    return {
      position: free ? 'absolute' : 'relative', left: free ? `${part.x ?? 5}%` : 'auto', top: free ? `${part.y ?? 5}%` : 'auto',
      width: free ? `${part.width ?? 90}%` : 'auto', minHeight: free ? `${part.height ?? 8}%` : '0',
      color: String(part.color || 'var(--visual-text)'), backgroundColor: String(part.backgroundColor || 'transparent'),
      backgroundImage: part.backgroundImageUrl ? `url("${part.backgroundImageUrl}")` : 'none',
      fontFamily: String(part.fontFamily || 'var(--visual-body-font)'), fontSize: `${Number(part.fontSize || 14)}px`, fontWeight: String(part.fontWeight || 500),
      textAlign: String(part.textAlign || 'left'), borderColor: String(part.borderColor || 'transparent'), borderWidth: `${Number(part.borderWidth || 0)}px`,
      borderStyle: Number(part.borderWidth || 0) ? 'solid' : 'none', borderRadius: `${Number(part.borderRadius || 0)}px`, padding: `${Number(part.padding ?? 8)}px`,
      boxShadow: String(part.boxShadow || 'none'), backgroundSize: 'cover', backgroundPosition: 'center', boxSizing: 'border-box'
    };
  }

  rsvpDesignCanvasStyle(section: VisualInvitationSection): Record<string, string> {
    return { minHeight: section.pluginDesign?.layout === 'free' ? `${Number(section.pluginDesign?.minHeight || 560)}px` : '0' };
  }

  locationsFor(section: VisualInvitationSection): InvitationLocation[] {
    const configured = this.invitation?.content?.locations || [];
    const locations: InvitationLocation[] = configured.length ? configured : (this.event?.venue?.name || this.event?.venue?.address || this.event?.venue?.mapUrl ? [{
      type: 'principal', name: this.event?.venue?.name || 'Lugar del evento', address: this.event?.venue?.address || '', mapUrl: this.event?.venue?.mapUrl || ''
    }] : []);
    const limit = Number(this.pluginSetting(section, 'locationLimit', 0));
    return limit > 0 ? locations.slice(0, limit) : locations;
  }

  get guestQrUrl(): string {
    const value = this.verifiedGuest?.checkInCode || this.verifiedGuest?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}` : '';
  }

  resolveLayerText(layer: VisualInvitationLayer): string {
    return resolveVisualTemplateText(layer.text, visualTemplateContext(this.invitation, this.event, this.verifiedGuest));
  }

  visualLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => !this.isNativeFunctionalLayer(layer));
  }

  rsvpCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => this.isRsvpFunctionalLayer(layer));
  }

  hasRsvpCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'rsvp' && this.rsvpCanvasLayers(section).length > 0;
  }

  isRsvpFunctionalLayer(layer: VisualInvitationLayer): boolean {
    const binding = String(layer.binding || '');
    return binding.startsWith('rsvp.') || binding.startsWith('display.rsvp.');
  }

  dedicationCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('dedication.') || String(layer.binding || '').startsWith('display.dedications.'));
  }

  hasDedicationCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'dedications' && this.dedicationCanvasLayers(section).length > 0;
  }

  isNativeFunctionalLayer(layer: VisualInvitationLayer): boolean {
    const binding = String(layer.binding || '');
    return this.isRsvpFunctionalLayer(layer) || binding.startsWith('dedication.') || binding.startsWith('display.dedications.') || binding.startsWith('song.') || binding.startsWith('display.songs.') || binding.startsWith('album.') || binding.startsWith('display.album.') || binding.startsWith('pass.') || binding.startsWith('display.guestPass.') || binding.startsWith('activity.') || binding.startsWith('display.guestActivity.') || binding.startsWith('countdown.') || binding.startsWith('display.countdown.') || binding.startsWith('location.') || binding.startsWith('display.locations.') || binding.startsWith('gift.') || binding.startsWith('envelope.') || binding.startsWith('display.gifts.') || binding.startsWith('itinerary.') || binding.startsWith('display.itinerary.') || binding.startsWith('dress.') || binding.startsWith('display.dressCode.') || binding.startsWith('lodging.') || binding.startsWith('display.lodging.') || binding.startsWith('gallery.') || binding.startsWith('display.gallery.');
  }

  shouldRenderDedicationLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    if (layer.binding === 'dedication.feedback') return Boolean(this.dedicationMessage);
    if (layer.binding === 'dedication.wall') return this.pluginSetting(section, 'showWall', true) !== false;
    return true;
  }

  songCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('song.') || String(layer.binding || '').startsWith('display.songs.'));
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
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('album.') || String(layer.binding || '').startsWith('display.album.'));
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
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('pass.') || String(layer.binding || '').startsWith('display.guestPass.'));
  }

  hasGuestPassCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'guestPass' && this.guestPassCanvasLayers(section).length > 0;
  }

  shouldRenderGuestPassLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.guestPass.')) return true;
    if (binding === 'pass.feedback') return Boolean(this.error);
    if (!this.verifiedGuest) return ['pass.email', 'pass.phone', 'pass.identify'].includes(binding);
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
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('activity.') || String(layer.binding || '').startsWith('display.guestActivity.'));
  }

  hasGuestActivityCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'guestActivity' && this.guestActivityCanvasLayers(section).length > 0;
  }

  shouldRenderGuestActivityLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.guestActivity.')) return true;
    if (!this.verifiedGuest) return ['activity.email', 'activity.phone', 'activity.identify'].includes(binding);
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
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('countdown.') || String(layer.binding || '').startsWith('display.countdown.'));
  }

  hasCountdownCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'countdown' && this.countdownCanvasLayers(section).length > 0;
  }

  shouldRenderCountdownLayer(layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
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
    return this.resolveLayerText(layer);
  }

  locationCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('location.') || String(layer.binding || '').startsWith('display.locations.'));
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
    if (!parsed || !location) return false;
    if (parsed.key === 'card') return true;
    if (parsed.key === 'details') return Boolean(location.parking || location.transport || location.accessibility || location.schedule?.length);
    if (parsed.key === 'map') return Boolean(location.mapUrl);
    if (parsed.key === 'waze') return Boolean(location.wazeUrl);
    if (parsed.key === 'phone') return Boolean(location.phone);
    if (parsed.key === 'website') return Boolean(location.websiteUrl);
    return Boolean(this.locationLayerText(section, layer));
  }

  locationLayerText(section: VisualInvitationSection, layer: VisualInvitationLayer): string {
    const parsed = this.locationLayerParts(String(layer.binding || ''));
    const location = parsed ? this.locationsFor(section)[parsed.index] : undefined;
    if (!parsed || !location) return '';
    if (parsed.key === 'name') return location.name || location.type || `Ubicación ${parsed.index + 1}`;
    if (parsed.key === 'address') return location.address || '';
    if (parsed.key === 'notes') return location.notes || '';
    if (parsed.key === 'details') {
      return [
        location.parking ? `Estacionamiento: ${location.parking}` : '',
        location.transport ? `Transporte: ${location.transport}` : '',
        location.accessibility ? `Accesibilidad: ${location.accessibility}` : '',
        ...(location.schedule || [])
      ].filter(Boolean).join('\n');
    }
    return layer.text || '';
  }

  locationLayerHref(section: VisualInvitationSection, layer: VisualInvitationLayer): string {
    const parsed = this.locationLayerParts(String(layer.binding || ''));
    const location = parsed ? this.locationsFor(section)[parsed.index] : undefined;
    if (!parsed || !location) return '';
    if (parsed.key === 'map') return location.mapUrl || '';
    if (parsed.key === 'waze') return location.wazeUrl || '';
    if (parsed.key === 'phone') return location.phone ? `tel:${location.phone}` : '';
    if (parsed.key === 'website') return location.websiteUrl || '';
    return '';
  }

  private locationLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^location\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  giftCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('gift.') || String(layer.binding || '').startsWith('envelope.') || String(layer.binding || '').startsWith('display.gifts.'));
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
      if (!item) return false;
      if (gift.key === 'card') return true;
      if (gift.key === 'image') return Boolean(item.imageUrl);
      if (gift.key === 'open') return Boolean(item.url);
      return Boolean(this.giftLayerText(layer));
    }
    if (!binding.startsWith('envelope.') && binding !== 'display.gifts.envelopeTitle') return false;
    if (this.pluginSetting(section, 'showEnvelope', true) === false || !this.hasDigitalEnvelopeData()) return false;
    const envelope = this.invitation?.content?.digitalEnvelope;
    if (binding === 'envelope.card' || binding === 'display.gifts.envelopeTitle') return true;
    if (binding === 'envelope.qr') return Boolean(envelope?.qrImageUrl);
    if (binding === 'envelope.copyAccount') return Boolean(envelope?.account);
    if (binding === 'envelope.copyClabe') return Boolean(envelope?.clabe);
    if (binding === 'envelope.feedback') return Boolean(this.giftCopyMessage);
    return Boolean(this.giftLayerText(layer));
  }

  giftLayerText(layer: VisualInvitationLayer): string {
    const parsed = this.giftLayerParts(String(layer.binding || ''));
    if (parsed) {
      const gift = this.invitation?.content?.giftRegistry?.[parsed.index];
      if (!gift) return '';
      if (parsed.key === 'title') return gift.title || gift.store || `Mesa ${parsed.index + 1}`;
      if (parsed.key === 'store') return gift.store || '';
      if (parsed.key === 'note') return gift.note || '';
      return layer.text || '';
    }
    const envelope = this.invitation?.content?.digitalEnvelope;
    if (layer.binding === 'envelope.bank') return envelope?.bank || '';
    if (layer.binding === 'envelope.holder') return envelope?.holder || '';
    if (layer.binding === 'envelope.account') return envelope?.account ? `Cuenta: ${envelope.account}` : '';
    if (layer.binding === 'envelope.clabe') return envelope?.clabe ? `CLABE: ${envelope.clabe}` : '';
    if (layer.binding === 'envelope.note') return envelope?.note || '';
    if (layer.binding === 'envelope.feedback') return this.giftCopyMessage;
    return layer.text || '';
  }

  giftLayerImageUrl(layer: VisualInvitationLayer): string {
    const parsed = this.giftLayerParts(String(layer.binding || ''));
    if (parsed?.key === 'image') return this.invitation?.content?.giftRegistry?.[parsed.index]?.imageUrl || '';
    if (layer.binding === 'envelope.qr') return this.invitation?.content?.digitalEnvelope?.qrImageUrl || '';
    return '';
  }

  giftLayerHref(layer: VisualInvitationLayer): string {
    const parsed = this.giftLayerParts(String(layer.binding || ''));
    return parsed?.key === 'open' ? this.invitation?.content?.giftRegistry?.[parsed.index]?.url || '' : '';
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
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('itinerary.') || String(layer.binding || '').startsWith('display.itinerary.'));
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
    if (!parsed || !item) return false;
    if (parsed.key === 'card') return true;
    if (parsed.key === 'description' && this.pluginSetting(section, 'showDescription', true) === false) return false;
    if (parsed.key === 'location') return Boolean(item.locationUrl);
    return Boolean(this.itineraryLayerText(layer));
  }

  itineraryLayerText(layer: VisualInvitationLayer): string {
    const parsed = this.itineraryLayerParts(String(layer.binding || ''));
    const item = parsed ? this.invitation?.content?.itinerary?.[parsed.index] : undefined;
    if (!parsed || !item) return '';
    if (parsed.key === 'icon') return item.icon || '';
    if (parsed.key === 'time') return item.time || '';
    if (parsed.key === 'title') return item.title || '';
    if (parsed.key === 'description') return item.description || '';
    return layer.text || '';
  }

  itineraryLayerHref(layer: VisualInvitationLayer): string {
    const parsed = this.itineraryLayerParts(String(layer.binding || ''));
    return parsed?.key === 'location' ? this.invitation?.content?.itinerary?.[parsed.index]?.locationUrl || '' : '';
  }

  private itineraryLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^itinerary\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  dressCodeCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('dress.') || String(layer.binding || '').startsWith('display.dressCode.'));
  }

  hasDressCodeCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'dressCode' && this.dressCodeCanvasLayers(section).length > 0;
  }

  shouldRenderDressCodeLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (layer.hidden) return false;
    const binding = String(layer.binding || '');
    if (binding.startsWith('display.dressCode.')) return true;
    if (binding === 'dress.image') return this.pluginSetting(section, 'showImage', true) !== false && Boolean(this.invitation?.content?.dressCodeImageUrl);
    if (binding === 'dress.code') return Boolean(this.invitation?.content?.dressCode);
    if (binding === 'dress.description') return this.pluginSetting(section, 'showDescription', true) !== false && Boolean(this.invitation?.content?.dressCodeDescription);
    const parsed = this.dressCodeOptionLayerParts(binding);
    const option = parsed ? this.invitation?.content?.dressCodeOptions?.[parsed.index] : undefined;
    if (!parsed || !option) return false;
    if (parsed.key === 'card') return true;
    if (parsed.key === 'color') return Boolean(option.color);
    return Boolean(this.dressCodeLayerText(layer));
  }

  dressCodeLayerText(layer: VisualInvitationLayer): string {
    if (layer.binding === 'dress.code') return this.invitation?.content?.dressCode || '';
    if (layer.binding === 'dress.description') return this.invitation?.content?.dressCodeDescription || '';
    const parsed = this.dressCodeOptionLayerParts(String(layer.binding || ''));
    const option = parsed ? this.invitation?.content?.dressCodeOptions?.[parsed.index] : undefined;
    if (!parsed || !option) return '';
    if (parsed.key === 'title') return option.title || '';
    if (parsed.key === 'description') return option.description || '';
    return layer.text || '';
  }

  dressCodeLayerImageUrl(layer: VisualInvitationLayer): string {
    return layer.binding === 'dress.image' ? this.invitation?.content?.dressCodeImageUrl || '' : '';
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
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('lodging.') || String(layer.binding || '').startsWith('display.lodging.'));
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
    if (!parsed || !hotel) return false;
    if (parsed.key === 'card') return true;
    if (parsed.key === 'image') return Boolean(hotel.imageUrl);
    if (parsed.key === 'price') return this.pluginSetting(section, 'showPrice', true) !== false && Boolean(hotel.priceLabel);
    if (parsed.key === 'agreement' || parsed.key === 'discount') return this.pluginSetting(section, 'showDiscount', true) !== false && Boolean(this.lodgingLayerText(layer));
    if (parsed.key === 'services') return this.pluginSetting(section, 'showServices', true) !== false && Boolean(hotel.services?.length);
    if (parsed.key === 'reserve') return Boolean(hotel.url);
    if (parsed.key === 'map') return this.pluginSetting(section, 'showMap', true) !== false && Boolean(hotel.mapUrl);
    if (parsed.key === 'phone') return this.pluginSetting(section, 'showPhone', true) !== false && Boolean(hotel.phone);
    return Boolean(this.lodgingLayerText(layer));
  }

  lodgingLayerText(layer: VisualInvitationLayer): string {
    const parsed = this.lodgingLayerParts(String(layer.binding || ''));
    const hotel = parsed ? this.invitation?.content?.lodging?.[parsed.index] : undefined;
    if (!parsed || !hotel) return '';
    if (parsed.key === 'name') return hotel.name || '';
    if (parsed.key === 'description') return hotel.description || '';
    if (parsed.key === 'address') return hotel.address || '';
    if (parsed.key === 'price') return hotel.priceLabel || '';
    if (parsed.key === 'agreement') return hotel.agreementLabel || '';
    if (parsed.key === 'discount') return [hotel.discountCode, hotel.discountDescription].filter(Boolean).join(' · ');
    if (parsed.key === 'services') return (hotel.services || []).join(' · ');
    if (parsed.key === 'notes') return hotel.notes || '';
    return layer.text || '';
  }

  lodgingLayerImageUrl(layer: VisualInvitationLayer): string {
    const parsed = this.lodgingLayerParts(String(layer.binding || ''));
    return parsed?.key === 'image' ? this.invitation?.content?.lodging?.[parsed.index]?.imageUrl || '' : '';
  }

  lodgingLayerHref(layer: VisualInvitationLayer): string {
    const parsed = this.lodgingLayerParts(String(layer.binding || ''));
    const hotel = parsed ? this.invitation?.content?.lodging?.[parsed.index] : undefined;
    if (!parsed || !hotel) return '';
    if (parsed.key === 'reserve') return hotel.url || '';
    if (parsed.key === 'map') return hotel.mapUrl || '';
    if (parsed.key === 'phone') return hotel.phone ? `tel:${hotel.phone}` : '';
    return '';
  }

  private lodgingLayerParts(binding: string): { index: number; key: string } | null {
    const match = binding.match(/^lodging\.(\d+)\.([^.]+)$/);
    return match ? { index: Number(match[1]), key: match[2] } : null;
  }

  galleryCanvasLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => String(layer.binding || '').startsWith('gallery.') || String(layer.binding || '').startsWith('display.gallery.'));
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
      if (!carousel || !this.galleryItems.length) return false;
      if (binding === 'gallery.carousel.previous' || binding === 'gallery.carousel.next') return this.galleryItems.length > 1;
      if (binding === 'gallery.carousel.counter' || binding === 'gallery.carousel.image') return true;
      return this.galleryCaptionsFor(section) && Boolean(this.galleryLayerText(layer));
    }
    if (carousel) return false;
    const parsed = this.galleryItemLayerParts(binding);
    const item = parsed ? this.invitation?.content?.galleryItems?.[parsed.index] : undefined;
    if (!parsed || !item?.url) return false;
    if (parsed.key === 'card' || parsed.key === 'image') return true;
    return this.galleryCaptionsFor(section) && Boolean(this.galleryLayerText(layer));
  }

  galleryLayerText(layer: VisualInvitationLayer): string {
    const binding = String(layer.binding || '');
    if (binding === 'gallery.carousel.counter') return `${this.galleryIndex + 1} / ${this.galleryItems.length}`;
    const carouselMatch = binding.match(/^gallery\.carousel\.(title|description|dedication)$/);
    if (carouselMatch) return this.galleryItems[this.galleryIndex]?.[carouselMatch[1] as 'title' | 'description' | 'dedication'] || '';
    const parsed = this.galleryItemLayerParts(binding);
    const item = parsed ? this.invitation?.content?.galleryItems?.[parsed.index] : undefined;
    if (!parsed || !item) return '';
    if (parsed.key === 'title') return item.title || '';
    if (parsed.key === 'description') return item.description || '';
    if (parsed.key === 'dedication') return item.dedication || '';
    return layer.text || '';
  }

  galleryLayerImageUrl(layer: VisualInvitationLayer): string {
    if (layer.binding === 'gallery.carousel.image') return this.galleryItems[this.galleryIndex]?.url || '';
    const parsed = this.galleryItemLayerParts(String(layer.binding || ''));
    return parsed?.key === 'image' ? this.invitation?.content?.galleryItems?.[parsed.index]?.url || '' : '';
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
    if (this.verifiedGuest && (layer.binding === 'rsvp.name' || layer.binding === 'rsvp.email')) return false;
    if (layer.binding === 'rsvp.companions') return this.rsvp.response !== 'declined' && this.maxCompanions > 0;
    if (layer.binding === 'rsvp.dietaryRestrictions') return this.pluginSetting(section, 'showDietary', true) !== false;
    if (layer.binding === 'rsvp.message') return this.pluginSetting(section, 'showMessage', true) !== false;
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
    const theme = this.invitation?.content?.visualDesign?.theme;
    if (!theme) return {};
    return {
      '--visual-background': theme.backgroundColor,
      '--visual-text': theme.textColor,
      '--visual-accent': theme.accentColor,
      '--visual-heading-font': theme.headingFont,
      '--visual-body-font': theme.bodyFont,
      '--visual-button-background': theme.buttonStyle === 'solid' ? theme.buttonBackgroundColor : theme.buttonStyle === 'soft' ? `color-mix(in srgb,${theme.buttonBackgroundColor} 16%,transparent)` : 'transparent',
      '--visual-button-text': theme.buttonStyle === 'solid' ? theme.buttonTextColor : theme.buttonBackgroundColor,
      '--visual-button-border': theme.buttonStyle === 'outline' ? `2px solid ${theme.buttonBackgroundColor}` : '0 solid transparent',
      '--visual-button-radius': `${theme.buttonRadius}px`
    };
  }

  sectionStyle(section: VisualInvitationSection): Record<string, string> {
    const background = section.background || {};
    const moduleStyle = section.moduleStyle || {};
    const overlay = Math.round((background.overlay || 0) * 255).toString(16).padStart(2, '0');
    const height = this.sectionRenderHeight(section);
    return {
      height: `${height}px`,
      backgroundColor: background.color || '#fff',
      backgroundImage: background.imageUrl
        ? `linear-gradient(#000000${overlay},#000000${overlay}),url("${background.imageUrl}")`
        : 'none',
      '--module-columns': String(moduleStyle.columns || 2),
      '--module-gap': `${Number(moduleStyle.gap ?? 14)}px`
    };
  }

  sectionRenderHeight(section: VisualInvitationSection): number {
    return section.type === 'rsvp'
      ? Math.max(section.height, section.pluginDesign?.layout === 'free' ? Number(section.pluginDesign.minHeight || 560) + 150 : 820)
      : section.height;
  }

  moduleClasses(section: VisualInvitationSection): string[] {
    const style = section.moduleStyle || {};
    return [
      `module-layout-${style.layout || 'grid'}`,
      `module-align-${style.alignment || 'center'}`,
      `module-surface-${style.surface || 'solid'}`,
      `module-cards-${style.cardStyle || 'bordered'}`,
      style.showTitle === false ? 'module-title-hidden' : 'module-title-visible'
    ];
  }

  layerStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    const shape = layer.type === 'shape';
    const responsiveScale = this.sharedStyleScale();
    const layout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && layer.layouts?.[this.device]
      ? layer.layouts[this.device]!
      : layer;
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(style.color || '#25211f'), backgroundColor: shape ? 'transparent' : String(style.backgroundColor || 'transparent'),
      fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${this.scaledLayerPixels(style.fontSize || 30, responsiveScale, 10)}px`,
      fontWeight: String(style.fontWeight || 400), textAlign: String(style.textAlign || 'center'),
      lineHeight: String(style.lineHeight || 1.2), letterSpacing: `${this.scaledLayerPixels(style.letterSpacing || 0, responsiveScale)}px`, textTransform: String(style.textTransform || 'none'),
      textDecoration: String(style.textDecoration || 'none'), textShadow: String(style.textShadow || 'none'),
      borderRadius: shape ? '0' : `${this.scaledLayerPixels(style.borderRadius || 0, responsiveScale)}px`, borderColor: shape ? 'transparent' : String(style.borderColor || 'transparent'),
      borderStyle: !shape && Number(style.borderWidth || 0) > 0 ? String(style.borderStyle || 'solid') : 'none', borderWidth: shape ? '0' : `${this.scaledLayerPixels(style.borderWidth || 0, responsiveScale)}px`,
      backgroundImage: !shape && style.gradientEnabled
        ? `linear-gradient(${Number(style.gradientAngle || 0)}deg,${String(style.gradientStart || '#ffffff')},${String(style.gradientEnd || '#000000')})`
        : !shape && style.backgroundImageUrl ? `url("${String(style.backgroundImageUrl)}")` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center', padding: shape ? '0' : `${this.scaledLayerPixels(style.padding || 0, responsiveScale)}px`,
      boxShadow: shape ? 'none' : String(style.boxShadow || 'none'), opacity: String(style.opacity ?? 1),
      '--button-hover-background': String(style.hoverBackgroundColor || style.backgroundColor || 'transparent'),
      '--button-hover-color': String(style.hoverColor || style.color || '#25211f'),
      '--button-pressed-scale': String(style.pressedScale ?? .97),
      animationDuration: `${Number(layer.animation?.duration || 1)}s`, animationDelay: `${Number(layer.animation?.delay || 0)}s`,
      animationIterationCount: layer.animation?.repeat ? 'infinite' : '1'
    };
  }

  private sharedStyleScale(): number {
    if (this.invitation?.content?.visualDesign?.responsiveMode === 'independent') return 1;
    return this.device === 'mobile' ? .68 : this.device === 'tablet' ? .84 : 1;
  }

  private scaledLayerPixels(value: number, scale: number, minimum = 0): number {
    return Math.round(Math.max(minimum, Number(value || 0) * scale) * 100) / 100;
  }

  animationClass(layer: VisualInvitationLayer): string[] {
    const type = layer.animation?.type || 'none';
    return type === 'none' ? [`layer-${layer.type}`] : [`layer-${layer.type}`, 'animated-layer', `animation-${type}`];
  }

  imageStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    const scale = Number(style.imageScale || 1);
    return {
      objectFit: style.objectFit || 'cover',
      objectPosition: `${style.objectPositionX ?? 50}% ${style.objectPositionY ?? 50}%`,
      transform: `scale(${scale * (style.flipX ? -1 : 1)},${scale * (style.flipY ? -1 : 1)}) rotate(${Number(style.imageRotation || 0)}deg)`,
      filter: `brightness(${Number(style.brightness ?? 100)}%) contrast(${Number(style.contrast ?? 100)}%) saturate(${Number(style.saturation ?? 100)}%) blur(${Number(style.blur || 0)}px)`
    };
  }

  imageMaskStyle(layer: VisualInvitationLayer): Record<string, string> {
    const mask = layer.style?.imageMask || 'none';
    const masks: Record<string, string> = {
      none: 'none', circle: 'circle(50% at 50% 50%)', rounded: 'inset(0 round 12%)',
      arch: 'inset(0 round 50% 50% 10% 10%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
      hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)',
      ticket: 'polygon(0 0,100% 0,100% 38%,92% 50%,100% 62%,100% 100%,0 100%,0 62%,8% 50%,0 38%)'
    };
    return { clipPath: masks[mask] || 'none', borderRadius: mask === 'rounded' ? '12%' : '0' };
  }

  shapeContentStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    const shapes: Record<string, string> = {
      rectangle: 'none', circle: 'circle(50% at 50% 50%)', ellipse: 'ellipse(50% 42% at 50% 50%)',
      triangle: 'polygon(50% 0,100% 100%,0 100%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
      star: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 93%,50% 72%,21% 93%,32% 57%,2% 35%,39% 35%)',
      hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)', line: 'inset(42% 0)'
    };
    return {
      width: '100%', height: '100%', backgroundColor: String(style.backgroundColor || '#d88f7d'),
      backgroundImage: style.gradientEnabled ? `linear-gradient(${Number(style.gradientAngle || 0)}deg,${String(style.gradientStart || '#ffffff')},${String(style.gradientEnd || '#000000')})` : 'none',
      border: `${Number(style.borderWidth || 0)}px ${String(style.borderStyle || 'solid')} ${String(style.borderColor || 'transparent')}`,
      borderRadius: `${Number(style.borderRadius || 0)}px`, boxShadow: String(style.boxShadow || 'none'),
      clipPath: shapes[style.shapeKind || 'rectangle'] || 'none'
    };
  }

  assetCredit(url?: string): { label: string; url: string } | undefined {
    if (!url) return undefined;
    const asset = this.invitation?.content?.visualDesign?.assets?.find((item) => item.url === url && item.attribution && item.attributionUrl);
    return asset ? { label: asset.attribution!, url: asset.attributionUrl! } : undefined;
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    if (!this.forcedDevice) this.device = this.detectDevice();
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
    this.submitRsvp.emit({ ...this.rsvp, companions: Number(this.rsvp.companions || 0) });
  }

  selectPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadPhoto.emit(file);
  }

  sendDedication(): void {
    if (!this.dedication.message.trim()) return;
    this.submitDedication.emit({ ...this.dedication });
  }

  sendSong(): void {
    if (!this.song.title.trim() && !this.song.sourceUrl.trim()) return;
    this.requestSong.emit({ ...this.song });
  }

  copyGiftValue(value?: string): void {
    if (!value) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => { this.giftCopyMessage = 'Datos copiados.'; }).catch(() => { this.giftCopyMessage = 'No fue posible copiar automáticamente.'; });
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
  }

  private detectDevice(): 'mobile' | 'tablet' | 'desktop' {
    const width = typeof window === 'undefined' ? 390 : window.innerWidth;
    return width <= 600 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop';
  }

  private configureGalleryTimer(): void {
    this.clearGalleryTimer();
    const settings = this.invitation?.content?.gallerySettings;
    const carouselEnabled = this.sections.some((section) => section.type === 'gallery' && this.galleryDisplayModeFor(section) === 'carousel');
    if (!carouselEnabled || !settings?.autoplay || this.galleryItems.length < 2) return;
    const seconds = Math.max(2, Math.min(30, Number(settings.intervalSeconds || 5)));
    this.galleryTimer = setInterval(() => this.moveGallery(1), seconds * 1000);
  }

  private configureCountdownTimer(): void {
    this.clearCountdownTimer();
    this.updateCountdown();
    if (this.event?.date && !this.countdown.isOver) this.countdownTimer = setInterval(() => this.updateCountdown(), 1000);
  }

  private updateCountdown(): void {
    if (!this.event?.date) { this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true }; return; }
    const dateOnly = this.event.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const target = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
      : new Date(this.event.date);
    if (this.event.time && /^\d{2}:\d{2}/.test(this.event.time)) {
      const [hours, minutes] = this.event.time.split(':').map(Number);
      target.setHours(hours, minutes, 0, 0);
    }
    const distance = target.getTime() - Date.now();
    if (Number.isNaN(distance) || distance <= 0) { this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true }; return; }
    this.countdown = {
      days: Math.floor(distance / 86400000), hours: Math.floor(distance / 3600000) % 24,
      minutes: Math.floor(distance / 60000) % 60, seconds: Math.floor(distance / 1000) % 60, isOver: false
    };
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
