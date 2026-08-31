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

  // DJ Song Requests inputs
  @Input() songSearchQuery = '';
  @Input() songSearchResults: Array<{ title: string; artist: string; sourceUrl: string; thumbnailUrl: string }> = [];
  @Input() searchingSongs = false;
  @Input() songRequest = { title: '', artist: '', dedication: '', sourceUrl: '', thumbnailUrl: '' };
  @Input() songRequestSending = false;
  @Input() songRequestMessage = '';
  @Input() maxSongRequestsAllowed = 3;
  @Input() guestSubmittedSongsCount = 0;
  @Input() requireSongApproval = true;
  @Input() allowDedicationsEnabled = true;

  @Output() toggleMusic = new EventEmitter<void>();
  @Output() verifyGuestAccess = new EventEmitter<{ email: string; phone: string }>();
  @Output() submitRsvp = new EventEmitter<void>();
  @Output() submitDedication = new EventEmitter<{ publicName: string; message: string; type?: string }>();
  @Output() uploadPhoto = new EventEmitter<File>();
  @Output() openLightbox = new EventEmitter<string>();
  @Output() searchSong = new EventEmitter<string>();
  @Output() selectSong = new EventEmitter<any>();
  @Output() requestSong = new EventEmitter<void>();
  @Output() resetGuest = new EventEmitter<void>();
  @Output() downloadPass = new EventEmitter<void>();

  // State
  envelopeOpened = false;
  isOpeningEnvelope = false;
  currentCardIndex = 0;
  guestAccessInput = '';
  newDedicationName = '';
  newDedicationType = 'dedication';
  newDedicationMessage = '';
  selectedFile?: File;
  copiedClabe = false;
  copiedAccount = false;

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
      { key: 'hero', title: 'Portada', icon: 'hero' }
    ];

    if (this.verifiedGuest) {
      cards.push({ key: 'vipPass', title: 'Pase VIP', icon: 'vip' });
    }
    if (this.isSectionActive('story') && (this.invitation?.content?.message || this.invitation?.content?.storyBody || this.invitation?.content?.storyTitle || this.invitation?.content?.subheadline)) {
      cards.push({ key: 'story', title: 'Nuestra Historia', icon: 'story' });
    }
    if (this.isSectionActive('locations') && (this.invitation?.content?.locations?.length || this.event?.venue?.name)) {
      cards.push({ key: 'locations', title: 'Ubicaciones', icon: 'locations' });
    }
    if (this.isSectionActive('itinerary') && this.invitation?.content?.itinerary?.length) {
      cards.push({ key: 'itinerary', title: 'Itinerario', icon: 'itinerary' });
    }
    if (this.isSectionActive('dressCode') && this.invitation?.content?.dressCode) {
      cards.push({ key: 'dressCode', title: 'Vestimenta', icon: 'dressCode' });
    }
    if (this.isSectionActive('rsvp')) {
      cards.push({ key: 'rsvp', title: 'Confirmar RSVP', icon: 'rsvp' });
    }
    if ((this.isSectionActive('giftRegistry') && this.invitation?.content?.giftRegistry?.length) || (this.isSectionActive('digitalEnvelope') && (this.invitation?.content?.digitalEnvelope?.clabe || this.invitation?.content?.digitalEnvelope?.account || this.invitation?.content?.digitalEnvelope?.bank || this.invitation?.content?.digitalEnvelope?.qrImageUrl))) {
      cards.push({ key: 'gifts', title: 'Regalos', icon: 'gifts' });
    }
    if (this.isSectionActive('lodging') && this.invitation?.content?.lodging?.length) {
      cards.push({ key: 'lodging', title: 'Hospedaje', icon: 'lodging' });
    }
    if ((this.isSectionActive('guestAlbum') && this.invitation?.content?.privateAlbumEnabled) || (this.isSectionActive('gallery') && this.invitation?.content?.gallery?.length)) {
      cards.push({ key: 'album', title: 'Fotos y Álbum', icon: 'album' });
    }
    if (this.isSectionActive('dedications')) {
      cards.push({ key: 'dedications', title: 'Dedicatorias', icon: 'dedications' });
    }
    if (this.isSectionActive('songRequests')) {
      cards.push({ key: 'dj', title: 'Música DJ', icon: 'dj' });
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
    if (key === 'lodging') {
      return Boolean(settings.lodging !== false && this.invitation.content.lodging?.length);
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
    }, 800);
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

  triggerDownloadPass(): void {
    this.downloadPass.emit();
  }

  triggerResetGuest(): void {
    this.resetGuest.emit();
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

  copyAccount(acc: string): void {
    if (!acc) return;
    navigator.clipboard.writeText(acc).then(() => {
      this.copiedAccount = true;
      setTimeout(() => { this.copiedAccount = false; }, 2500);
    });
  }

  onPhotoSelected(evt: any): void {
    this.onFileSelected(evt);
  }

  submitDedicationForm(): void {
    if (!this.newDedicationMessage.trim()) return;
    this.submitDedication.emit({
      publicName: this.newDedicationName.trim() || (this.verifiedGuest?.name || this.rsvp.name || 'Invitado'),
      message: this.newDedicationMessage.trim(),
      type: this.newDedicationType
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

  getItineraryIconKey(title?: string): string {
    const t = (title || '').toLowerCase();
    if (t.includes('misa') || t.includes('religios') || t.includes('iglesia') || t.includes('ceremonia') || t.includes('templo') || t.includes('votos')) return 'church';
    if (t.includes('cocktail') || t.includes('cóctel') || t.includes('coctel') || t.includes('recep') || t.includes('bienvenida') || t.includes('copa')) return 'cocktail';
    if (t.includes('cena') || t.includes('banquete') || t.includes('comida') || t.includes('almuerzo') || t.includes('brindis') || t.includes('pastel') || t.includes('postre') || t.includes('gala')) return 'dinner';
    if (t.includes('fiesta') || t.includes('baile') || t.includes('vals') || t.includes('dj') || t.includes('pista') || t.includes('musica') || t.includes('música') || t.includes('trasnochador') || t.includes('fin')) return 'party';
    if (t.includes('brindis') || t.includes('honor')) return 'toast';
    return 'clock';
  }

  getStoreLogo(registry: any): string {
    if (registry.logoUrl) return registry.logoUrl;
    const store = (registry.store || registry.title || '').toLowerCase();
    if (store.includes('liverpool')) return 'https://assetspwa.liverpool.com.mx/assets/images/logos/liverpool-logo.svg';
    if (store.includes('palacio')) return 'https://www.elpalaciodehierro.com/on/demandware.static/Sites-Palacio-Site/-/default/dw9e13b0d2/images/logo.svg';
    if (store.includes('amazon')) return 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg';
    if (store.includes('sears')) return 'https://www.sears.com.mx/assets/img/sears-logo.svg';
    return '';
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

  getQuestionKey(question: RsvpCustomQuestion): string {
    return (question as any).id || question.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  getCustomAnswer(question: RsvpCustomQuestion): any {
    const key = this.getQuestionKey(question);
    return this.customAnswers[key] ?? '';
  }

  setCustomAnswer(question: RsvpCustomQuestion, value: any): void {
    const key = this.getQuestionKey(question);
    this.customAnswers[key] = value;
  }

  get songRequestsLimitReached(): boolean {
    return this.guestSubmittedSongsCount >= this.maxSongRequestsAllowed;
  }

  onSearchSong(): void {
    if (!this.songSearchQuery.trim()) return;
    this.searchSong.emit(this.songSearchQuery.trim());
  }

  onSelectSong(song: any): void {
    this.selectSong.emit(song);
  }

  onRequestSong(): void {
    this.requestSong.emit();
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
}
