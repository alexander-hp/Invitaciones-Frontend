import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  selector: 'app-new-public-invitation-template3',
  templateUrl: './new-public-invitation-template3.component.html',
  styleUrls: ['./new-public-invitation-template3.component.css']
})
export class NewPublicInvitationTemplate3Component implements OnInit {
  @Input() invitation?: InvitationModel;
  @Input() event?: EventModel;
  @Input() countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false };
  @Input() verifiedGuest?: GuestAccessResponse['guest'];
  @Input() publicAlbumAssets: Array<{ url: string; uploaderName?: string; createdAt?: string }> = [];
  @Input() dedications: DedicationModel[] = [];
  @Input() isPlayingMusic = false;
  @Input() currentPlayingTrackUrl = '';
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

  @Output() toggleMusic = new EventEmitter<void>();
  @Output() verifyGuestAccess = new EventEmitter<{ email: string; phone: string }>();
  @Output() submitRsvp = new EventEmitter<void>();
  @Output() submitDedication = new EventEmitter<{ publicName: string; message: string }>();
  @Output() uploadPhoto = new EventEmitter<File>();
  @Output() openLightbox = new EventEmitter<string>();

  // State
  guestAccessInput = '';
  newDedicationName = '';
  newDedicationMessage = '';
  selectedFile?: File;
  copiedClabe = false;

  ngOnInit(): void {
    if (this.verifiedGuest) {
      this.rsvp.name = this.verifiedGuest.name || '';
      if (this.verifiedGuest.email) this.rsvp.email = this.verifiedGuest.email;
    }
  }

  getCoverImageUrl(): string {
    const url = this.invitation?.content?.coverImageUrl;
    if (url && url.trim().length > 5 && !url.includes('404') && !url.includes('OP2.png')) {
      return url;
    }
    return '/assets/RYA-film-23-scaled.jpg';
  }

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content?.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'guestAlbum' || key === 'guest_album') {
      return this.invitation.content.privateAlbumEnabled !== false && settings.guestAlbum !== false;
    }
    if (key === 'dedications') {
      return this.invitation.content.dedicationSettings?.enabled !== false && settings.dedications !== false;
    }
    if (key === 'giftRegistry' || key === 'gifts') {
      return this.invitation.content.giftSettings?.showRegistry !== false && settings.giftRegistry !== false;
    }
    if (key === 'digitalEnvelope') {
      return this.invitation.content.giftSettings?.showEnvelope !== false && settings.digitalEnvelope !== false;
    }
    if (key === 'rsvp') {
      return settings.rsvp !== false;
    }
    return settings[key] !== false;
  }

  get requiresGuestAuth(): boolean {
    const mode = this.invitation?.accessMode;
    return (mode === 'guest_list' || mode === 'specific_users') && !this.verifiedGuest;
  }

  formatDate(dateStr?: string | Date): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getDirectionsUrl(loc: InvitationLocation): string {
    if (loc.mapUrl && loc.mapUrl.trim()) return loc.mapUrl;
    const query = [loc.name, loc.address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  getWazeUrl(loc: InvitationLocation): string {
    if (loc.wazeUrl && loc.wazeUrl.trim()) return loc.wazeUrl;
    const query = [loc.name, loc.address].filter(Boolean).join(', ');
    return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
  }

  getCalendarUrl(): string {
    if (!this.event?.date) return '#';
    const start = new Date(this.event.date);
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
    const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const details = this.invitation?.content?.message || 'Invitación a nuestro evento';
    const location = (this.invitation?.content?.locations && this.invitation.content.locations[0])
      ? `${this.invitation.content.locations[0].name || ''}, ${this.invitation.content.locations[0].address || ''}`
      : '';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.event.title || 'Evento Especial')}&dates=${format(start)}/${format(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  }

  onVerifyAccess(): void {
    if (!this.guestAccessInput.trim()) return;
    const isEmail = this.guestAccessInput.includes('@');
    this.verifyGuestAccess.emit({
      email: isEmail ? this.guestAccessInput.trim() : '',
      phone: !isEmail ? this.guestAccessInput.trim() : ''
    });
  }

  onPhotoSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.uploadPhoto.emit(file);
    }
  }

  submitDedicationForm(): void {
    if (!this.newDedicationMessage.trim()) return;
    const author = this.verifiedGuest?.name || this.newDedicationName.trim() || 'Invitado Especial';
    this.submitDedication.emit({
      publicName: author,
      message: this.newDedicationMessage.trim()
    });
    this.newDedicationMessage = '';
  }

  copyClabe(clabe: string): void {
    if (!clabe) return;
    navigator.clipboard.writeText(clabe);
    this.copiedClabe = true;
    setTimeout(() => this.copiedClabe = false, 2500);
  }
}
