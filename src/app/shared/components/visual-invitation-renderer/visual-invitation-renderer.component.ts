import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import {
  DedicationModel, EventModel, GuestAccessResponse, InvitationModel,
  VisualInvitationLayer, VisualInvitationSection
} from '../../../core/models';

@Component({
  selector: 'app-visual-invitation-renderer',
  templateUrl: './visual-invitation-renderer.component.html',
  styleUrls: ['./visual-invitation-renderer.component.css']
})
export class VisualInvitationRendererComponent {
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

  get sections(): VisualInvitationSection[] {
    return (this.invitation?.content?.visualDesign?.sections || []).filter((section) => section.enabled);
  }

  get maxCompanions(): number {
    return this.verifiedGuest?.allowedCompanions
      ?? this.invitation?.rsvpSettings?.defaultAllowedCompanions
      ?? 0;
  }

  sectionStyle(section: VisualInvitationSection): Record<string, string> {
    const background = section.background || {};
    const overlay = Math.round((background.overlay || 0) * 255).toString(16).padStart(2, '0');
    return {
      height: `${section.height}px`,
      backgroundColor: background.color || '#fff',
      backgroundImage: background.imageUrl
        ? `linear-gradient(#000000${overlay},#000000${overlay}),url("${background.imageUrl}")`
        : 'none'
    };
  }

  layerStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    const layout = this.invitation?.content?.visualDesign?.responsiveMode === 'independent' && layer.layouts?.[this.device]
      ? layer.layouts[this.device]!
      : layer;
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(style.color || '#25211f'), backgroundColor: String(style.backgroundColor || 'transparent'),
      fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(style.fontSize || 30)}px`,
      fontWeight: String(style.fontWeight || 400), textAlign: String(style.textAlign || 'center'),
      lineHeight: String(style.lineHeight || 1.2), textTransform: String(style.textTransform || 'none'),
      textDecoration: String(style.textDecoration || 'none'), textShadow: String(style.textShadow || 'none'),
      borderRadius: `${Number(style.borderRadius || 0)}px`, opacity: String(style.opacity ?? 1),
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
}
