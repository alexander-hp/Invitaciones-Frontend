import { Component, EventEmitter, Input, Output } from '@angular/core';
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
    return {
      left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`,
      transform: `rotate(${layer.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(style.color || '#25211f'), backgroundColor: String(style.backgroundColor || 'transparent'),
      fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(style.fontSize || 30)}px`,
      fontWeight: String(style.fontWeight || 400), textAlign: String(style.textAlign || 'center'),
      borderRadius: `${Number(style.borderRadius || 0)}px`, opacity: String(style.opacity ?? 1)
    };
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
}
