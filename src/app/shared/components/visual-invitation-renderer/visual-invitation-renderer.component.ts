import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import {
  DedicationModel, EventModel, GuestAccessResponse, InvitationGalleryItem, InvitationLocation, InvitationModel,
  VisualInvitationLayer, VisualInvitationSection
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

  @Output() verifyGuestAccess = new EventEmitter<{ email: string; phone: string }>();
  @Output() submitRsvp = new EventEmitter<any>();
  @Output() uploadPhoto = new EventEmitter<File>();
  @Output() submitDedication = new EventEmitter<{ publicName: string; message: string }>();
  @Output() requestSong = new EventEmitter<{ title: string; artist: string; dedication: string; sourceUrl: string }>();
  @Output() openLightbox = new EventEmitter<string>();

  guestEmail = '';
  guestPhone = '';
  rsvp = { name: '', email: '', response: 'confirmed', companions: 0, dietaryRestrictions: '', message: '' };
  dedication = { publicName: '', message: '' };
  song = { title: '', artist: '', dedication: '', sourceUrl: '' };
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

  ngOnChanges(): void {
    this.galleryIndex = Math.min(this.galleryIndex, Math.max(0, this.galleryItems.length - 1));
    this.configureGalleryTimer();
    this.configureCountdownTimer();
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
    if (/^https?:\/\//i.test(String(layer.url || ''))) window.open(layer.url, '_blank', 'noopener');
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
    return {
      height: `${section.height}px`,
      backgroundColor: background.color || '#fff',
      backgroundImage: background.imageUrl
        ? `linear-gradient(#000000${overlay},#000000${overlay}),url("${background.imageUrl}")`
        : 'none',
      '--module-columns': String(moduleStyle.columns || 2),
      '--module-gap': `${Number(moduleStyle.gap ?? 14)}px`
    };
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
    const layout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && layer.layouts?.[this.device]
      ? layer.layouts[this.device]!
      : layer;
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(style.color || '#25211f'), backgroundColor: shape ? 'transparent' : String(style.backgroundColor || 'transparent'),
      fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(style.fontSize || 30)}px`,
      fontWeight: String(style.fontWeight || 400), textAlign: String(style.textAlign || 'center'),
      lineHeight: String(style.lineHeight || 1.2), letterSpacing: `${Number(style.letterSpacing || 0)}px`, textTransform: String(style.textTransform || 'none'),
      textDecoration: String(style.textDecoration || 'none'), textShadow: String(style.textShadow || 'none'),
      borderRadius: shape ? '0' : `${Number(style.borderRadius || 0)}px`, borderColor: shape ? 'transparent' : String(style.borderColor || 'transparent'),
      borderStyle: !shape && Number(style.borderWidth || 0) > 0 ? String(style.borderStyle || 'solid') : 'none', borderWidth: shape ? '0' : `${Number(style.borderWidth || 0)}px`,
      backgroundImage: !shape && style.gradientEnabled ? `linear-gradient(${Number(style.gradientAngle || 0)}deg,${String(style.gradientStart || '#ffffff')},${String(style.gradientEnd || '#000000')})` : 'none',
      boxShadow: shape ? 'none' : String(style.boxShadow || 'none'), opacity: String(style.opacity ?? 1),
      animationDuration: `${Number(layer.animation?.duration || 1)}s`, animationDelay: `${Number(layer.animation?.delay || 0)}s`,
      animationIterationCount: layer.animation?.repeat ? 'infinite' : '1'
    };
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
    this.device = this.detectDevice();
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

  private detectDevice(): 'mobile' | 'tablet' | 'desktop' {
    const width = typeof window === 'undefined' ? 390 : window.innerWidth;
    return width <= 600 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop';
  }

  private configureGalleryTimer(): void {
    this.clearGalleryTimer();
    const settings = this.invitation?.content?.gallerySettings;
    if (this.galleryDisplayMode !== 'carousel' || !settings?.autoplay || this.galleryItems.length < 2) return;
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
