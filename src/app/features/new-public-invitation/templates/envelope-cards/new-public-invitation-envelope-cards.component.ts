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

export interface CardSection {
  key: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-new-public-invitation-envelope-cards',
  templateUrl: './new-public-invitation-envelope-cards.component.html',
  styleUrls: ['./new-public-invitation-envelope-cards.component.css']
})
export class NewPublicInvitationEnvelopeCardsComponent implements OnInit {
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
  envelopeOpened = false;
  isOpeningEnvelope = false;
  currentCardIndex = 0;
  guestAccessInput = '';
  newDedicationName = '';
  newDedicationMessage = '';
  selectedFile?: File;

  // Touch gesture handling
  touchStartX = 0;
  touchEndX = 0;

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

  get activeCards(): CardSection[] {
    const cards: CardSection[] = [
      { key: 'hero', title: 'Portada', icon: '' }
    ];

    if (this.isSectionActive('rsvp')) {
      cards.push({ key: 'rsvp', title: 'Confirmar RSVP', icon: '' });
    }
    if (this.isSectionActive('story')) {
      cards.push({ key: 'story', title: 'Nuestra Historia', icon: '' });
    }
    if (this.isSectionActive('locations')) {
      cards.push({ key: 'locations', title: 'Ubicaciones', icon: '' });
    }
    if (this.isSectionActive('itinerary')) {
      cards.push({ key: 'itinerary', title: 'Itinerario', icon: '' });
    }
    if (this.isSectionActive('dressCode')) {
      cards.push({ key: 'dressCode', title: 'Vestimenta', icon: '' });
    }
    if (this.isSectionActive('giftRegistry') || this.isSectionActive('digitalEnvelope')) {
      cards.push({ key: 'gifts', title: 'Regalos', icon: '' });
    }
    if (this.isSectionActive('guestAlbum') || this.isSectionActive('gallery')) {
      cards.push({ key: 'album', title: 'Fotos y Álbum', icon: '' });
    }
    if (this.isSectionActive('dedications')) {
      cards.push({ key: 'dedications', title: 'Dedicatorias', icon: '' });
    }
    if (this.isSectionActive('songRequests')) {
      cards.push({ key: 'dj', title: 'Música DJ', icon: '' });
    }

    return cards;
  }

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content) return true;
    const settings = this.invitation.content.sectionSettings || {};

    if (key === 'songRequests' || key === 'dj') {
      if (settings.songRequests === false) return false;
      if (this.event?.externalContent?.songRequestSettings?.enabled === false) return false;
      return true;
    }
    if (key === 'backgroundMusic') {
      return settings.backgroundMusic !== false;
    }
    if (key === 'guestAlbum') {
      return Boolean(settings.guestAlbum !== false && this.invitation.content.privateAlbumEnabled !== false);
    }
    if (key === 'dedications') {
      return Boolean(settings.dedications !== false && this.invitation.content.dedicationSettings?.enabled !== false);
    }
    if (key === 'giftRegistry') {
      return Boolean(settings.giftRegistry !== false && this.invitation.content.giftSettings?.showRegistry !== false);
    }
    if (key === 'digitalEnvelope') {
      return Boolean(settings.digitalEnvelope !== false && this.invitation.content.giftSettings?.showEnvelope !== false);
    }
    if (key === 'rsvp') {
      return settings.rsvp !== false;
    }

    return (settings as any)[key] !== false;
  }

  get requiresGuestAuth(): boolean {
    if (!this.invitation) return false;
    const mode = this.invitation.accessMode;
    const rsvpMethods = this.invitation.rsvpSettings?.identityMethods;
    return (mode === 'guest_list' || mode === 'specific_users' || (!!rsvpMethods && rsvpMethods.length > 0)) && !this.verifiedGuest;
  }

  openEnvelope(): void {
    if (this.isOpeningEnvelope) return;

    if (this.requiresGuestAuth) {
      if (!this.guestAccessInput.trim()) {
        return;
      }
      const val = this.guestAccessInput.trim();
      const isEmail = val.includes('@');
      this.verifyGuestAccess.emit({
        email: isEmail ? val : '',
        phone: isEmail ? '' : val
      });
      return;
    }

    this.isOpeningEnvelope = true;
    setTimeout(() => {
      this.envelopeOpened = true;
      this.isOpeningEnvelope = false;
      this.toggleMusic.emit();
    }, 1200);
  }

  nextCard(): void {
    if (this.currentCardIndex < this.activeCards.length - 1) {
      this.currentCardIndex++;
    }
  }

  prevCard(): void {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
    }
  }

  goToCard(index: number): void {
    if (index >= 0 && index < this.activeCards.length) {
      this.currentCardIndex = index;
    }
  }

  copiedClabe = false;

  get guestQrUrl(): string {
    if (!this.verifiedGuest || !this.invitation) return '';
    const code = this.verifiedGuest.id;
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(window.location.origin + '/i/' + this.invitation.slug + '?guest=' + code)}`;
  }

  get allDisplayPhotos(): string[] {
    const hostPhotos = this.invitation?.content?.gallery || [];
    const guestPhotos = (this.publicAlbumAssets || []).map(a => a.url);
    return [...hostPhotos, ...guestPhotos];
  }

  getCalendarUrl(): string {
    if (!this.event?.date) return '';
    const d = new Date(this.event.date);
    const start = d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(d.getTime() + 4 * 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(this.invitation?.content?.headline || this.event.title || 'Boda / Evento');
    const details = encodeURIComponent(this.invitation?.content?.subheadline || 'Invitación Digital');
    const location = encodeURIComponent(this.event.venue?.address || this.event.venue?.name || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  }

  shareWhatsApp(): void {
    const text = encodeURIComponent(`¡Te invito a mi evento! Abre nuestra invitación digital aquí: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  downloadPass(): void {
    window.print();
  }

  getDirectionsUrl(loc: any): string {
    if (loc.mapUrl) return loc.mapUrl;
    if (loc.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name || '')}`;
  }

  getWazeUrl(loc: any): string {
    if (loc.wazeUrl) return loc.wazeUrl;
    if (loc.address) return `https://waze.com/ul?q=${encodeURIComponent(loc.address)}`;
    return `https://waze.com/ul?q=${encodeURIComponent(loc.name || '')}`;
  }

  copyClabe(clabe: string): void {
    if (!clabe) return;
    navigator.clipboard.writeText(clabe).then(() => {
      this.copiedClabe = true;
      setTimeout(() => { this.copiedClabe = false; }, 2500);
    });
  }

  onPhotoSelected(evt: any): void {
    this.onFileSelected(evt);
  }

  submitDedicationForm(): void {
    this.onDedicationSubmit();
  }

  // Swipe Gestures
  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
  }

  onTouchMove(e: TouchEvent): void {
    this.touchEndX = e.touches[0].clientX;
  }

  onTouchEnd(): void {
    const diffX = this.touchStartX - this.touchEndX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        this.nextCard();
      } else {
        this.prevCard();
      }
    }
    this.touchStartX = 0;
    this.touchEndX = 0;
  }

  // Form Submissions
  onRsvpSubmit(): void {
    this.submitRsvp.emit();
  }

  onDedicationSubmit(): void {
    if (!this.newDedicationMessage.trim()) return;
    this.submitDedication.emit({
      publicName: this.newDedicationName.trim() || (this.verifiedGuest?.name || 'Invitado'),
      message: this.newDedicationMessage.trim()
    });
    this.newDedicationMessage = '';
  }

  onFileSelected(evt: any): void {
    const files = evt.target.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.uploadPhoto.emit(this.selectedFile);
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  get locationsList(): InvitationLocation[] {
    const locs: InvitationLocation[] = [];
    if (this.event?.venue?.name) {
      locs.push({
        name: this.event.venue.name,
        address: this.event.venue.address,
        mapUrl: this.event.venue.mapUrl
      });
    }
    if (this.invitation?.content?.locations) {
      locs.push(...this.invitation.content.locations);
    }
    return locs;
  }
}
