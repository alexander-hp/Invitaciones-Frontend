import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, AssetFolder, DashboardMetrics, DedicationModel, DedicationStatus, EmbedManifestResponse, EventAccessLinkModel, EventAccessRole, EventModel, EventTableModel, ExternalContent, GuestCommunicationStatus, GuestMessageChannel, GuestMessageType, GuestModel, GuestPayload, InvitationModel, PaymentPackage, PlanDefinition, RsvpModel, SongRequestModel, SongRequestStatus, WhatsAppMediaAssetModel, WhatsAppMediaInspection, WhatsAppMediaPayload, WhatsAppMediaType, WhatsAppProvider } from '../../core/models';
import { environment } from '../../../environments/environment';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { generateGuestPassHtml } from '../new-public-invitation/guest-pass-template';

interface MessageTemplateOption {
  value: GuestMessageType;
  label: string;
}

@Component({ selector: 'app-event-detail', templateUrl: './event-detail.component.html' })
export class EventDetailComponent implements OnInit {
  activePlayingSong?: {
    title: string;
    artist?: string;
    thumbnailUrl?: string;
    sourceUrl?: string;
    embedUrl?: SafeResourceUrl | null;
    previewUrl?: string;
    isDirectAudio?: boolean;
    isSpotify?: boolean;
  };
  event?: EventModel;
  invitations: InvitationModel[] = [];
  guests: GuestModel[] = [];
  rsvps: RsvpModel[] = [];
  tables: EventTableModel[] = [];
  albumAssets: AlbumAssetModel[] = [];
  whatsappMediaAssets: WhatsAppMediaAssetModel[] = [];
  eventAccessLinks: EventAccessLinkModel[] = [];
  songRequests: SongRequestModel[] = [];
  dedications: DedicationModel[] = [];
  embedManifest?: EmbedManifestResponse;
  loading = false;
  saving = false;
  guestSaving = false;
  guestsLoading = false;
  rsvpsLoading = false;
  importing = false;
  exportingGuests = false;
  exportingRsvps = false;
  emailSending = '';
  emailBulkSending = false;
  whatsappSending = '';
  whatsappBulkSending = false;
  whatsappMediaUploading = false;
  externalAssetUploading = '';
  checkoutLoading = '';
  selectedImportFile?: File;
  selectedWhatsappMediaFile?: File;
  error = '';
  guestError = '';
  rsvpError = '';
  albumError = '';
  checkInCode = '';
  checkInLink = '';
  guestMessage = '';
  tableMessage = '';
  albumMessage = '';
  importMessage = '';
  importDuplicateDetails: string[] = [];
  whatsappProvider: WhatsAppProvider = 'disabled';
  whatsappFallbackProvider: WhatsAppProvider | '' = '';
  whatsappEnabled = false;
  whatsappFallbackEnabled = false;
  openWaReady = false;
  openWaStatus = '';
  mediaInspection?: WhatsAppMediaInspection;
  mediaInspecting = false;
  eventMetrics: Partial<DashboardMetrics> = {};
  currentPlan?: PlanDefinition;
  eventPlanActive = false;
  eventPlanExpiresAt = '';
  subscriptionActive = false;
  editingGuest?: GuestModel;
  countryCodes = [
    { code: '+52', country: '🇲🇽 México (+52)' },
    { code: '+1', country: '🇺🇸 EE.UU. / 🇨🇦 Canadá (+1)' },
    { code: '+54', country: '🇦🇷 Argentina (+54)' },
    { code: '+56', country: '🇨🇱 Chile (+56)' },
    { code: '+57', country: '🇨🇴 Colombia (+57)' },
    { code: '+593', country: '🇪🇨 Ecuador (+593)' },
    { code: '+34', country: '🇪🇸 España (+34)' },
    { code: '+502', country: '🇬🇹 Guatemala (+502)' },
    { code: '+51', country: '🇵🇪 Perú (+51)' },
    { code: '+506', country: '🇨🇷 Costa Rica (+506)' },
    { code: '+503', country: '🇸🇻 El Salvador (+503)' },
    { code: '+504', country: '🇭🇳 Honduras (+504)' },
    { code: '+595', country: '🇵🇾 Paraguay (+595)' },
    { code: '+598', country: '🇺🇾 Uruguay (+598)' },
    { code: '+58', country: '🇻🇪 Venezuela (+58)' }
  ];
  guestForm = { name: '', email: '', phone: '', phoneCountryCode: '+52', phoneLocal: '', group: '', rolesText: '', tagsText: '', relationshipLabel: '', visibilityGroup: '', tableName: '', seatLabel: '', allowedCompanions: 0 };
  companionNames = '';
  tableForm = { name: '', capacity: 10, notes: '', order: 0 };
  guestFilters = { search: '', status: '', communicationStatus: '', group: '' };
  selectedMessageType: GuestMessageType = 'invitation';
  whatsappMedia = {
    enabled: false,
    assetId: '',
    type: 'image' as WhatsAppMediaType,
    url: '',
    mimetype: '',
    filename: '',
    caption: ''
  };
  externalForm = new FormGroup({
    externalSiteUrl: new FormControl(''),
    externalSiteLabel: new FormControl(''),
    externalPortalEnabled: new FormControl(true),
    welcomeMessage: new FormControl(''),
    brandLabel: new FormControl(''),
    coverImageUrl: new FormControl(''),
    heroImageUrl: new FormControl(''),
    musicUrl: new FormControl(''),
    carousel: new FormArray([]),
    gallery: new FormArray([]),
    spectacularImages: new FormArray([]),
    audioSections: new FormArray([]),
    locations: new FormArray([]),
    sections: new FormArray([]),
    giftRegistry: new FormArray([]),
    giftEnabled: new FormControl(true),
    giftIntroText: new FormControl(''),
    giftShowRegistry: new FormControl(true),
    giftShowEnvelope: new FormControl(true),
    envelopeBank: new FormControl(''),
    envelopeHolder: new FormControl(''),
    envelopeAccount: new FormControl(''),
    envelopeClabe: new FormControl(''),
    envelopeNote: new FormControl(''),
    envelopeQrImageUrl: new FormControl(''),
    dedicationsEnabled: new FormControl(true),
    dedicationsRequireApproval: new FormControl(true),
    dedicationsIntroText: new FormControl(''),
    songRequestsEnabled: new FormControl(true),
    songRequestsMax: new FormControl(3),
    songRequestsDedications: new FormControl(true)
  });
  accessLinkForm = { role: 'check_in' as EventAccessRole, label: '', days: 7 };
  messageTemplates: MessageTemplateOption[] = [
    { value: 'invitation', label: 'Invitacion' },
    { value: 'reminder', label: 'Recordatorio RSVP' },
    { value: 'event_reminder', label: 'Recordatorio evento' },
    { value: 'location_change', label: 'Cambio de ubicacion' },
    { value: 'thanks', label: 'Agradecimiento' }
  ];
  private readonly imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  private readonly audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav']);
  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly maxAudioSize = 10 * 1024 * 1024;

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService, private confirmDialog: ConfirmDialogService, private sanitizer: DomSanitizer) {}

  playSong(sr: Partial<SongRequestModel> | SongRequestModel): void {
    if (!sr) return;
    const sourceUrl = sr.sourceUrl || '';
    const previewUrl = sr.previewUrl || '';
    const { embedUrl, isDirectAudio, isSpotify } = this.parseSongEmbedUrl(sourceUrl, previewUrl);
    this.activePlayingSong = {
      title: sr.title || 'Canción',
      artist: sr.artist || '',
      thumbnailUrl: sr.thumbnailUrl || '',
      sourceUrl,
      previewUrl,
      embedUrl,
      isDirectAudio,
      isSpotify
    };
  }

  closePlayer(): void {
    this.activePlayingSong = undefined;
  }

  private parseSongEmbedUrl(sourceUrl?: string, previewUrl?: string): { embedUrl: SafeResourceUrl | null; isDirectAudio: boolean; isSpotify: boolean } {
    const url = sourceUrl || previewUrl || '';
    if (!url) return { embedUrl: null, isDirectAudio: false, isSpotify: false };

    if (/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url) || (previewUrl && !sourceUrl)) {
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url), isDirectAudio: true, isSpotify: false };
    }

    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const embedStr = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`;
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(embedStr), isDirectAudio: false, isSpotify: false };
    }

    const spMatch = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/i);
    if (spMatch && spMatch[1]) {
      const embedStr = `https://open.spotify.com/embed/track/${spMatch[1]}?utm_source=generator&theme=0`;
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(embedStr), isDirectAudio: false, isSpotify: true };
    }

    if (/^https?:\/\//i.test(url)) {
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url), isDirectAudio: false, isSpotify: false };
    }

    return { embedUrl: null, isDirectAudio: false, isSpotify: false };
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.getEvent(id).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.syncExternalConfig(event);
        this.loadInvitations(id);
        this.loadGuests(id);
        this.loadRsvps(id);
        this.loadTables(id);
        this.loadAlbum(id);
        this.loadEventMetrics(id);
        this.loadWhatsAppMedia(id);
        this.loadWhatsAppStatus();
        this.loadPaymentStatus();
        this.loadAccessLinks(id);
        this.loadSongRequests(id);
        this.loadDedications(id);
        this.loadEmbedManifest(event);
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar el evento.';
        this.loading = false;
      }
    });
  }

  createInvitation(): void {
    if (!this.event) return;
    if (this.event.mode === 'external_dashboard') {
      this.error = 'Este evento esta en modo dashboard externo. Puedes manejar invitados, mesas, RSVP, album y check-in sin crear invitacion publica.';
      return;
    }
    this.saving = true;
    this.error = '';
    const eventId = this.getEventId();
    this.api.createInvitation({
      event: eventId,
      slug: this.slugify(this.event.title),
      accessMode: 'guest_list',
      content: {
        headline: this.event.title,
        subheadline: 'Nos encantaria que nos acompanes',
        message: 'Confirma tu asistencia y comparte este dia especial con nosotros.',
        palette: { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' },
        gallery: []
      }
    }).subscribe({
      next: ({ invitation }) => this.router.navigate(['/invitations', this.getInvitationId(invitation), 'editor']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo crear la invitacion.';
        this.saving = false;
      }
    });
  }

  parsePhoneParts(phone?: string): { countryCode: string; localNumber: string } {
    if (!phone) return { countryCode: '+52', localNumber: '' };
    const clean = phone.trim();
    const codes = ['+52', '+1', '+54', '+56', '+57', '+593', '+34', '+502', '+51', '+506', '+503', '+504', '+595', '+598', '+58'];
    for (const code of codes) {
      if (clean.startsWith(code)) {
        return { countryCode: code, localNumber: clean.substring(code.length).replace(/\D/g, '') };
      }
    }
    return { countryCode: '+52', localNumber: clean.replace(/\D/g, '') };
  }

  saveGuest(keepOpen = false): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    if (!this.guestForm.name.trim()) { this.guestError = 'El nombre del invitado es obligatorio'; return; }

    const cleanLocal = (this.guestForm.phoneLocal || '').trim().replace(/\D/g, '');
    const fullPhone = cleanLocal ? `${this.guestForm.phoneCountryCode || '+52'}${cleanLocal}` : '';
    this.guestForm.phone = fullPhone;

    const duplicate = this.findDuplicateGuest(this.editingGuest ? this.getGuestId(this.editingGuest) : undefined);
    if (duplicate) {
      this.guestError = `Ese ${duplicate.field === 'email' ? 'correo' : 'telefono'} ya pertenece a ${duplicate.guest.name}. Puedes editar ese invitado en la lista.`;
      return;
    }

    this.guestSaving = true;
    this.guestError = '';
    this.guestMessage = '';
    const wasEditing = Boolean(this.editingGuest);
    const guestData: Omit<GuestPayload, 'event'> = {
      name: this.guestForm.name,
      email: this.guestForm.email || undefined,
      phone: fullPhone || undefined,
      group: this.guestForm.group || undefined,
      roles: this.splitCsv(this.guestForm.rolesText),
      tags: this.splitCsv(this.guestForm.tagsText),
      relationshipLabel: this.guestForm.relationshipLabel || undefined,
      visibilityGroup: this.guestForm.visibilityGroup || undefined,
      tableName: this.guestForm.tableName || undefined,
      seatLabel: this.guestForm.seatLabel || undefined,
      allowedCompanions: Number(this.guestForm.allowedCompanions || 0)
    };
    const companions = this.companionNames.split('\n').map((name) => name.trim()).filter(Boolean).map((name) => ({ name, tableName: this.guestForm.tableName || undefined }));
    if (companions.length) guestData.companions = companions;
    const request = this.editingGuest
      ? this.api.updateGuest(this.getGuestId(this.editingGuest), guestData)
      : this.api.createGuest({ event: eventId, ...guestData });

    request.subscribe({
      next: ({ guest }) => {
        this.guests = this.editingGuest
          ? this.guests.map((item) => this.getGuestId(item) === this.getGuestId(guest) ? guest : item).sort((a, b) => a.name.localeCompare(b.name))
          : [guest, ...this.guests].sort((a, b) => a.name.localeCompare(b.name));
        this.guestMessage = wasEditing ? `✅ Invitado "${guest.name}" actualizado.` : `🎉 ¡Invitado "${guest.name}" guardado!`;
        this.guestSaving = false;

        if (keepOpen && !wasEditing) {
          const lastGroup = this.guestForm.group;
          const lastCode = this.guestForm.phoneCountryCode;
          this.guestForm.name = '';
          this.guestForm.email = '';
          this.guestForm.phoneLocal = '';
          this.companionNames = '';
          this.guestForm.group = lastGroup;
          this.guestForm.phoneCountryCode = lastCode || '+52';
        } else {
          this.resetGuestForm();
        }
      },
      error: (error) => {
        this.guestError = this.buildGuestError(error, this.editingGuest ? 'No se pudo actualizar el invitado.' : 'No se pudo agregar el invitado.');
        this.guestSaving = false;
      }
    });
  }

  startEditGuest(guest: GuestModel): void {
    this.editingGuest = guest;
    this.guestError = '';
    this.guestMessage = '';
    const parsedPhone = this.parsePhoneParts(guest.phone);
    this.guestForm = {
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone || '',
      phoneCountryCode: parsedPhone.countryCode,
      phoneLocal: parsedPhone.localNumber,
      group: guest.group || '',
      rolesText: (guest.roles || []).join(', '),
      tagsText: (guest.tags || []).join(', '),
      relationshipLabel: guest.relationshipLabel || '',
      visibilityGroup: guest.visibilityGroup || '',
      tableName: guest.tableName || '',
      seatLabel: guest.seatLabel || '',
      allowedCompanions: guest.allowedCompanions || 0
    };
    this.companionNames = (guest.companions || []).map((companion) => companion.name || '').filter(Boolean).join('\n');
  }

  cancelEditGuest(): void {
    this.resetGuestForm();
    this.guestError = '';
  }

  deleteGuest(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId || !window.confirm(`Eliminar a ${guest.name} de la lista de invitados?`)) return;
    this.guestSaving = true;
    this.guestError = '';
    this.guestMessage = '';
    this.api.deleteGuest(guestId).subscribe({
      next: () => {
        this.guests = this.guests.filter((item) => this.getGuestId(item) !== guestId);
        if (this.editingGuest && this.getGuestId(this.editingGuest) === guestId) this.resetGuestForm();
        this.guestMessage = 'Invitado eliminado.';
        this.guestSaving = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo eliminar el invitado.';
        this.guestSaving = false;
      }
    });
  }

  selectImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImportFile = input.files?.[0] || undefined;
    this.importMessage = this.selectedImportFile ? this.selectedImportFile.name : '';
    this.importDuplicateDetails = [];
  }

  importGuests(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.selectedImportFile) return;
    this.importing = true;
    this.guestError = '';
    this.importMessage = '';
    this.importDuplicateDetails = [];
    this.api.importGuests(eventId, this.selectedImportFile).subscribe({
      next: (result) => {
        this.guests = [...result.guests, ...this.guests].sort((a, b) => a.name.localeCompare(b.name));
        const duplicateRows = result.duplicateRows || 0;
        const created = result.created ?? result.imported;
        const skipped = result.skipped ?? ((result.invalidRows || 0) + duplicateRows);
        this.importMessage = `Creados: ${created}. Actualizados: ${result.updated || 0}. Omitidos: ${skipped}. Filas invalidas: ${result.invalidRows}. Duplicados: ${duplicateRows}.`;
        this.importDuplicateDetails = (result.duplicates || []).slice(0, 5).map((duplicate) => {
          if (duplicate.field === 'plan') return `Fila ${duplicate.row}: omitida por limite de ${duplicate.value} invitados del plan.`;
          return `Fila ${duplicate.row}: ${duplicate.field === 'email' ? 'email' : 'telefono'} ${duplicate.value} ya pertenece a ${duplicate.guestName}.`;
        });
        this.selectedImportFile = undefined;
        this.importing = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo importar el archivo.';
        this.importing = false;
      }
    });
  }

  checkInGuest(): void {
    const code = this.checkInCode.trim();
    if (!code) return;
    this.guestError = '';
    this.api.checkInGuest(code).subscribe({
      next: ({ guest }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === this.getGuestId(guest) ? guest : item);
        this.guestMessage = `${guest.name} marcado como registrado.`;
        this.checkInCode = '';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo registrar el check-in.';
      }
    });
  }

  createTable(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.tableForm.name) return;
    if (!this.hasPlanFeature('seating')) {
      this.guestError = this.featureLockedMessage('seating');
      return;
    }
    this.tableMessage = '';
    this.api.createTable(eventId, {
      name: this.tableForm.name,
      capacity: Number(this.tableForm.capacity || 1),
      notes: this.tableForm.notes || undefined,
      order: Number(this.tableForm.order || 0)
    }).subscribe({
      next: () => {
        this.tableForm = { name: '', capacity: 10, notes: '', order: 0 };
        this.tableMessage = 'Mesa creada.';
        this.loadTables(eventId);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo crear la mesa.';
      }
    });
  }

  deleteTable(table: EventTableModel): void {
    const eventId = this.getEventId();
    const tableId = this.getTableId(table);
    if (!eventId || !tableId || !window.confirm(`Eliminar mesa ${table.name}?`)) return;
    this.api.deleteTable(eventId, tableId).subscribe({
      next: () => {
        this.tableMessage = 'Mesa eliminada.';
        this.loadTables(eventId);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo eliminar la mesa.';
      }
    });
  }

  createCheckInLink(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    if (!this.hasPlanFeature('checkIn')) {
      this.guestError = this.featureLockedMessage('checkIn');
      return;
    }
    this.api.createCheckInLink(eventId, { label: 'Entrada', days: 7 }).subscribe({
      next: ({ url }) => {
        this.checkInLink = url;
        this.guestMessage = 'Link de staff generado.';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo generar el link de staff.';
      }
    });
  }

  updateAlbumAsset(asset: AlbumAssetModel, status: AlbumAssetModel['status']): void {
    const eventId = this.getEventId();
    const assetId = asset._id || asset.id || '';
    if (!eventId || !assetId) return;
    this.api.updateAlbumAsset(eventId, assetId, status).subscribe({
      next: ({ asset: updated }) => {
        this.albumAssets = this.albumAssets.map((item) => (item._id || item.id) === assetId ? updated : item);
        this.albumMessage = 'Album actualizado.';
      },
      error: (error) => {
        this.albumError = error.error?.message || 'No se pudo actualizar la foto.';
      }
    });
  }

  get filteredGuests(): GuestModel[] {
    const search = this.normalizeSearch(this.guestFilters.search);
    return this.guests.filter((guest) => {
      const matchesSearch = !search || [guest.name, guest.email, guest.phone, guest.group].some((value) => this.normalizeSearch(value).includes(search));
      const matchesStatus = !this.guestFilters.status || guest.status === this.guestFilters.status;
      const matchesCommunication = !this.guestFilters.communicationStatus || this.getCommunicationStatus(guest) === this.guestFilters.communicationStatus;
      const matchesGroup = !this.guestFilters.group || (guest.group || 'General') === this.guestFilters.group;
      return matchesSearch && matchesStatus && matchesCommunication && matchesGroup;
    });
  }

  get guestGroups(): string[] {
    return Array.from(new Set(this.guests.map((guest) => guest.group || 'General'))).sort((a, b) => a.localeCompare(b));
  }

  get pendingGuests(): number {
    return this.guests.filter((guest) => guest.status === 'pending').length;
  }

  get confirmedGuests(): number {
    return this.guests.filter((guest) => guest.status === 'confirmed').length;
  }

  get declinedGuests(): number {
    return this.guests.filter((guest) => guest.status === 'declined').length;
  }

  get checkedInGuests(): number {
    return this.guests.filter((guest) => guest.checkedIn).length;
  }

  get pendingCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'pending').length;
  }

  get sentCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'sent').length;
  }

  get confirmedCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'confirmed').length;
  }

  get openedCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'opened').length;
  }

  get deliveredCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'delivered').length;
  }

  get readCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'read').length;
  }

  get failedCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'failed').length;
  }

  get pendingAlbumAssets(): number {
    return this.albumAssets.filter((asset) => asset.status === 'pending').length;
  }

  get primaryInvitation(): InvitationModel | undefined {
    return this.invitations.find((invitation) => invitation.status === 'published') || this.invitations[0];
  }

  get albumPublicUrl(): string {
    return this.primaryInvitation ? `${window.location.origin}/i/${this.primaryInvitation.slug}` : '';
  }

  get albumQrUrl(): string {
    return this.albumPublicUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(this.albumPublicUrl)}` : '';
  }

  checkoutPlan(pack: Exclude<PaymentPackage, 'free'>): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    this.checkoutLoading = pack;
    this.guestError = '';
    this.api.createCheckout({ package: pack, event: eventId }).subscribe({
      next: ({ checkoutUrl, manualPayment, message }) => {
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        this.guestMessage = manualPayment ? (message || 'Pago manual registrado como pendiente.') : 'Solicitud de pago registrada.';
        this.checkoutLoading = '';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo iniciar el checkout.';
        this.checkoutLoading = '';
      }
    });
  }

  saveExternalConfig(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.event) return;
    this.guestError = '';
    this.guestMessage = '';
    const formValue: any = this.externalForm.value;
    const externalContent: ExternalContent = {
      ...(this.event.externalContent || {}),
      coverImageUrl: formValue.coverImageUrl || undefined,
      heroImageUrl: formValue.heroImageUrl || undefined,
      carousel: this.cleanStringList(formValue.carousel),
      gallery: this.cleanStringList(formValue.gallery),
      spectacularImages: this.cleanStringList(formValue.spectacularImages),
      musicUrl: formValue.musicUrl || undefined,
      audioSections: this.cleanAudioSections(formValue.audioSections),
      locations: this.cleanLocations(formValue.locations),
      sections: this.cleanSections(formValue.sections),
      songRequestSettings: {
        enabled: Boolean(formValue.songRequestsEnabled),
        maxRequestsPerGuest: Number(formValue.songRequestsMax || 3),
        allowDedications: Boolean(formValue.songRequestsDedications)
      },
      giftRegistry: this.cleanGiftRegistry(formValue.giftRegistry),
      digitalEnvelope: {
        bank: formValue.envelopeBank || undefined,
        holder: formValue.envelopeHolder || undefined,
        account: formValue.envelopeAccount || undefined,
        clabe: formValue.envelopeClabe || undefined,
        note: formValue.envelopeNote || undefined,
        qrImageUrl: formValue.envelopeQrImageUrl || undefined
      },
      giftSettings: {
        enabled: Boolean(formValue.giftEnabled),
        introText: formValue.giftIntroText || undefined,
        showRegistry: Boolean(formValue.giftShowRegistry),
        showEnvelope: Boolean(formValue.giftShowEnvelope)
      },
      dedicationSettings: {
        enabled: Boolean(formValue.dedicationsEnabled),
        requireApproval: Boolean(formValue.dedicationsRequireApproval),
        introText: formValue.dedicationsIntroText || undefined
      }
    };
    this.api.updateEvent(eventId, {
      externalSiteUrl: formValue.externalSiteUrl || '',
      externalSiteLabel: formValue.externalSiteLabel || '',
      externalPortalEnabled: Boolean(formValue.externalPortalEnabled),
      externalPortalSettings: {
        ...(this.event.externalPortalSettings || {}),
        welcomeMessage: formValue.welcomeMessage || undefined,
        brandLabel: formValue.brandLabel || undefined
      },
      externalContent
    }).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.syncExternalConfig(event);
        this.loadEmbedManifest(event);
        this.guestMessage = 'Integracion externa actualizada.';
      },
      error: (error) => this.guestError = error.error?.message || 'No se pudo guardar la integracion externa.'
    });
  }

  get carouselItems(): FormArray {
    return this.externalForm.get('carousel') as FormArray;
  }

  get galleryItems(): FormArray {
    return this.externalForm.get('gallery') as FormArray;
  }

  get spectacularItems(): FormArray {
    return this.externalForm.get('spectacularImages') as FormArray;
  }

  get audioSectionItems(): FormArray {
    return this.externalForm.get('audioSections') as FormArray;
  }

  get locationItems(): FormArray {
    return this.externalForm.get('locations') as FormArray;
  }

  get sectionItems(): FormArray {
    return this.externalForm.get('sections') as FormArray;
  }

  get giftItems(): FormArray {
    return this.externalForm.get('giftRegistry') as FormArray;
  }

  addUrlItem(arrayName: 'carousel' | 'gallery' | 'spectacularImages', value = ''): void {
    (this.externalForm.get(arrayName) as FormArray).push(new FormControl(value));
  }

  removeArrayItem(arrayName: 'carousel' | 'gallery' | 'spectacularImages' | 'audioSections' | 'locations' | 'sections' | 'giftRegistry', index: number): void {
    (this.externalForm.get(arrayName) as FormArray).removeAt(index);
  }

  addAudioSection(value: { title?: string; url?: string; description?: string } = {}): void {
    this.audioSectionItems.push(new FormGroup({
      title: new FormControl(value.title || ''),
      url: new FormControl(value.url || ''),
      description: new FormControl(value.description || '')
    }));
  }

  addLocation(value: any = {}): void {
    this.locationItems.push(new FormGroup({
      type: new FormControl(value.type || ''),
      name: new FormControl(value.name || ''),
      address: new FormControl(value.address || ''),
      mapUrl: new FormControl(value.mapUrl || ''),
      wazeUrl: new FormControl(value.wazeUrl || ''),
      notes: new FormControl(value.notes || ''),
      time: new FormControl(value.time || '')
    }));
  }

  addSection(value: any = {}): void {
    this.sectionItems.push(new FormGroup({
      key: new FormControl(value.key || ''),
      type: new FormControl(value.type || 'text'),
      title: new FormControl(value.title || ''),
      body: new FormControl(value.body || ''),
      url: new FormControl(value.url || ''),
      imageUrl: new FormControl(value.imageUrl || ''),
      rolesText: new FormControl((value.roles || []).join(', ')),
      order: new FormControl(value.order ?? this.sectionItems.length)
    }));
  }

  addGift(value: any = {}): void {
    this.giftItems.push(new FormGroup({
      store: new FormControl(value.store || ''),
      title: new FormControl(value.title || value.label || ''),
      label: new FormControl(value.label || ''),
      url: new FormControl(value.url || ''),
      imageUrl: new FormControl(value.imageUrl || ''),
      note: new FormControl(value.note || ''),
      priority: new FormControl(value.priority || 0)
    }));
  }

  uploadExternalAsset(event: Event, target: 'cover' | 'hero' | 'music' | 'carousel' | 'gallery' | 'spectacular' | 'audioSection' | 'sectionImage', index?: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const eventId = this.getEventId();
    if (!file || !eventId) return;
    const folder = this.externalAssetFolder(target);
    const validationError = this.validateExternalAsset(file, folder);
    if (validationError) {
      this.guestError = validationError;
      input.value = '';
      return;
    }
    const uploadKey = `${target}-${index ?? 'main'}`;
    this.externalAssetUploading = uploadKey;
    this.guestError = '';
    this.guestMessage = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, event: eventId, size: file.size }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            this.applyExternalAssetUrl(target, upload.publicUrl, index);
            this.guestMessage = 'Archivo subido. Guarda la integracion para publicarlo.';
            this.externalAssetUploading = '';
            input.value = '';
          },
          error: () => {
            this.guestError = 'S3 rechazo la subida. Revisa CORS del bucket, permisos PutObject y que el archivo coincida con el tipo permitido.';
            this.externalAssetUploading = '';
            input.value = '';
          }
        });
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo preparar la subida. Revisa AWS_S3_BUCKET, MEDIA_PUBLIC_BASE_URL, region, credenciales y tipo de archivo.';
        this.externalAssetUploading = '';
        input.value = '';
      }
    });
  }

  createAccessLink(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    this.api.createEventAccessLink(eventId, this.accessLinkForm).subscribe({
      next: ({ link }) => {
        this.eventAccessLinks = [link, ...this.eventAccessLinks];
        this.guestMessage = 'Link externo creado.';
      },
      error: (error) => this.guestError = error.error?.message || 'No se pudo crear el link externo.'
    });
  }

  revokeAccessLink(link: EventAccessLinkModel): void {
    const eventId = this.getEventId();
    const linkId = link.id || link._id || '';
    if (!eventId || !linkId) return;

    this.confirmDialog.confirm({
      title: '¿Revocar este link?',
      message: `¿Estás seguro de que deseas revocar el enlace de acceso "${link.label || link.role}"?`,
      confirmText: 'Sí, Revocar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '🔐'
    }).then((confirmed) => {
      if (!confirmed) return;
      this.api.revokeEventAccessLink(eventId, linkId).subscribe({
        next: () => {
          this.guestMessage = 'Link revocado.';
          this.loadAccessLinks(eventId);
        },
        error: (error) => this.guestError = error.error?.message || 'No se pudo revocar el link.'
      });
    });
  }

  inspectWhatsappMediaUrl(): void {
    const url = this.whatsappMedia.url.trim();
    if (!url) {
      this.guestError = 'Agrega una URL para analizar.';
      return;
    }
    this.mediaInspecting = true;
    this.guestError = '';
    this.mediaInspection = undefined;
    this.api.inspectAssetUrl(url).subscribe({
      next: (inspection) => {
        this.mediaInspection = inspection;
        this.whatsappMedia.type = inspection.type;
        this.whatsappMedia.mimetype = inspection.mimetype;
        this.whatsappMedia.filename = inspection.filename;
        this.mediaInspecting = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo analizar la URL.';
        this.mediaInspecting = false;
      }
    });
  }

  get externalPortalUrl(): string {
    return this.event?.externalPortalSlug ? `${window.location.origin}/e/${this.event.externalPortalSlug}` : '';
  }

  get externalPortalQrUrl(): string {
    return this.externalPortalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(this.externalPortalUrl)}` : '';
  }

  get newExternalPortalUrl(): string {
    return this.event?.externalPortalSlug ? `${window.location.origin}/new/e/${this.event.externalPortalSlug}` : '';
  }

  get newExternalPortalQrUrl(): string {
    return this.newExternalPortalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(this.newExternalPortalUrl)}` : '';
  }

  get rsvpIframeSnippet(): string {
    return this.externalPortalUrl ? `<iframe src="${this.externalPortalUrl}" width="100%" height="720" style="border:0"></iframe>` : '';
  }

  get newRsvpIframeSnippet(): string {
    return this.newExternalPortalUrl ? `<iframe src="${this.newExternalPortalUrl}" width="100%" height="900" style="border:0"></iframe>` : '';
  }

  get externalApiConfigUrl(): string {
    return this.event?.externalPortalSlug ? `${this.apiBaseUrl}/external/${this.event.externalPortalSlug}/config` : '';
  }

  get externalApiAssetsUrl(): string {
    return this.event?.externalPortalSlug ? `${this.apiBaseUrl}/external/${this.event.externalPortalSlug}/assets?type=all` : '';
  }

  get externalIdentifyExample(): string {
    const slug = this.event?.externalPortalSlug || ':portalSlug';
    return `fetch('${this.apiBaseUrl}/external/${slug}/guest/identify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'invitado@email.com' })
}).then((res) => res.json());`;
  }

  get externalRsvpExample(): string {
    const slug = this.event?.externalPortalSlug || ':portalSlug';
    return `fetch('${this.apiBaseUrl}/external/${slug}/rsvp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guest: 'GUEST_ID_IDENTIFICADO',
    response: 'confirmed',
    companions: 1,
    companionNames: ['Acompanante']
  })
}).then((res) => res.json());`;
  }

  get externalSongRequestExample(): string {
    const slug = this.event?.externalPortalSlug || ':portalSlug';
    return `fetch('${this.apiBaseUrl}/external/${slug}/song-requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guest: 'GUEST_ID_IDENTIFICADO',
    title: 'September',
    artist: 'Earth, Wind & Fire'
  })
}).then((res) => res.json());`;
  }

  get embedWidgets(): Array<{ key: string; label: string; url: string; snippet: string }> {
    const widgets = this.embedManifest?.widgets || {};
    const snippets = this.embedManifest?.snippets || {};
    const appOrigin = window.location.origin;
    const list = [
      { key: 'rsvp', label: 'RSVP', url: widgets['rsvp'] || this.widgetUrl('rsvp'), snippet: snippets['rsvp'] || this.iframeSnippet('rsvp', 720) },
      { key: 'guestPass', label: 'Pase QR', url: widgets['guestPass'] || this.widgetUrl('guest-pass'), snippet: this.iframeSnippet('guest-pass', 520) },
      { key: 'album', label: 'Album', url: widgets['album'] || this.widgetUrl('album'), snippet: snippets['album'] || this.iframeSnippet('album', 720) },
      { key: 'gallery', label: 'Galeria', url: widgets['gallery'] || this.widgetUrl('gallery'), snippet: this.iframeSnippet('gallery', 520) },
      { key: 'map', label: 'Mapa', url: widgets['map'] || this.widgetUrl('map'), snippet: snippets['map'] || this.iframeSnippet('map', 480) },
      { key: 'songRequests', label: 'DJ', url: widgets['songRequests'] || this.widgetUrl('song-requests'), snippet: snippets['songRequests'] || this.iframeSnippet('song-requests', 520) },
      { key: 'fullPortal', label: 'Portal completo', url: widgets['fullPortal'] || this.widgetUrl('full-portal'), snippet: this.iframeSnippet('full-portal', 900) }
    ];
    if (this.newExternalPortalUrl) {
      list.push({ key: 'rsvpWidget', label: 'Widget RSVP (Div + Script)', url: this.widgetUrl('rsvp'), snippet: `<div data-kyndra-widget="rsvp" data-portal="${this.event?.externalPortalSlug || ''}"></div>\n<script src="${appOrigin}/assets/kyndra-embed.js"></script>` });
    }
    return list.filter((item) => item.url);
  }

  get bulkWhatsappPreview(): string {
    const guest = this.filteredGuests.find((item) => this.canWhatsappGuest(item));
    if (!guest) return 'Selecciona invitados con telefono para previsualizar el mensaje.';
    return this.buildMessage(guest, this.selectedMessageType);
  }

  get whatsappRecipientCount(): number {
    return this.filteredGuests.filter((guest) => this.canWhatsappGuest(guest)).length;
  }

  get whatsappMissingPhoneCount(): number {
    return this.filteredGuests.filter((guest) => !this.toWhatsappPhone(guest.phone)).length;
  }

  get eventPlanExpiresLabel(): string {
    return this.eventPlanExpiresAt ? new Date(this.eventPlanExpiresAt).toLocaleDateString() : '';
  }

  updateSongRequest(songRequest: SongRequestModel, status: SongRequestStatus): void {
    const eventId = this.getEventId();
    const songRequestId = songRequest._id || songRequest.id || '';
    if (!eventId || !songRequestId) return;
    if (status === 'played') {
      this.playSong(songRequest);
    }
    this.api.updateSongRequest(eventId, songRequestId, status).subscribe({
      next: ({ songRequest: updated }) => {
        this.songRequests = this.songRequests.map((item) => (item._id || item.id) === songRequestId ? updated : item);
        this.guestMessage = 'Solicitud de DJ actualizada.';
      },
      error: (error) => this.guestError = error.error?.message || 'No se pudo actualizar la solicitud.'
    });
  }

  exportGuests(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    if (!this.hasPlanFeature('exportData')) {
      this.guestError = this.featureLockedMessage('exportData');
      return;
    }
    this.exportingGuests = true;
    this.guestError = '';
    this.api.exportGuests(eventId, this.guestFilters).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `invitados-${eventId}.csv`);
        this.exportingGuests = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo exportar la lista de invitados.';
        this.exportingGuests = false;
      }
    });
  }

  exportRsvps(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    if (!this.hasPlanFeature('exportData')) {
      this.rsvpError = this.featureLockedMessage('exportData');
      return;
    }
    this.exportingRsvps = true;
    this.rsvpError = '';
    this.api.exportRsvps(eventId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `rsvps-${eventId}.csv`);
        this.exportingRsvps = false;
      },
      error: (error) => {
        this.rsvpError = error.error?.message || 'No se pudo exportar RSVP.';
        this.exportingRsvps = false;
      }
    });
  }

  showPendingReminders(): void {
    this.guestFilters.status = 'pending';
    this.guestFilters.communicationStatus = '';
    this.selectedMessageType = 'reminder';
  }

  getWhatsappLink(guest: GuestModel): string {
    const phone = this.toWhatsappPhone(guest.phone);
    const message = this.buildMessage(guest, this.selectedMessageType);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  getEmailLink(guest: GuestModel): string {
    const subject = this.getMessageSubject(this.selectedMessageType);
    const body = this.buildMessage(guest, this.selectedMessageType);
    return `mailto:${encodeURIComponent(guest.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  canWhatsappGuest(guest: GuestModel): boolean {
    return Boolean(this.toWhatsappPhone(guest.phone) && (this.primaryInvitation || this.event?.mode === 'external_dashboard'));
  }

  canSendRealWhatsapp(guest: GuestModel): boolean {
    return this.whatsappEnabled && this.canWhatsappGuest(guest);
  }

  canEmailGuest(guest: GuestModel): boolean {
    return Boolean(guest.email && this.primaryInvitation);
  }

  sendRealEmail(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.emailSending = guestId;
    this.guestError = '';
    this.guestMessage = '';
    this.api.sendGuestEmail(guestId, { messageType: this.selectedMessageType }).subscribe({
      next: ({ guest: updatedGuest }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === guestId ? updatedGuest : item);
        this.guestMessage = 'Email enviado.';
        this.emailSending = '';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo enviar email.';
        this.emailSending = '';
      }
    });
  }

  sendBulkEmail(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.filteredGuests.length) return;
    const guestIds = this.filteredGuests.filter((guest) => this.canEmailGuest(guest)).map((guest) => this.getGuestId(guest));
    if (!guestIds.length || !window.confirm(`Enviar email "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${guestIds.length} invitado(s) filtrados?`)) return;
    this.emailBulkSending = true;
    this.guestError = '';
    this.guestMessage = '';
    this.api.sendBulkEmail(eventId, { confirm: true, messageType: this.selectedMessageType, guestIds }).subscribe({
      next: (result) => {
        this.guestMessage = `Email masivo: enviados ${result.sent}, fallidos ${result.failed}.`;
        this.loadGuests(eventId);
        this.emailBulkSending = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo enviar email masivo.';
        this.emailBulkSending = false;
      }
    });
  }

  getQrImageUrl(guest: GuestModel): string {
    const value = guest.checkInCode || guest.qrCode || this.getGuestId(guest);
    return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(value)}`;
  }

  getPersonalizedPublicUrl(guest: GuestModel): string {
    const publicUrl = this.primaryInvitation
      ? `${window.location.origin}/i/${this.primaryInvitation.slug}`
      : this.externalPortalUrl;
    if (!publicUrl || !guest.invitationToken) return publicUrl;
    return `${publicUrl}?t=${encodeURIComponent(guest.invitationToken)}`;
  }

  markMessageSent(guest: GuestModel, channel: GuestMessageChannel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.api.markGuestCommunication(guestId, {
      communicationStatus: 'sent',
      messageType: this.selectedMessageType,
      channel
    }).subscribe({
      next: ({ guest: updatedGuest }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === guestId ? updatedGuest : item);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo marcar el mensaje como enviado.';
      }
    });
  }

  sendRealWhatsapp(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    if (!this.hasPlanFeature('whatsappMessaging')) {
      this.guestError = this.featureLockedMessage('whatsappMessaging');
      return;
    }
    if (this.whatsappProvider === 'openwa' && !this.openWaReady) {
      this.guestError = `WhatsApp conectado pero no listo (${this.openWaStatus || 'desconocido'}).`;
      return;
    }
    const media = this.buildWhatsappMediaPayload();
    if (this.whatsappMedia.enabled && !media) {
      this.guestError = 'Analiza una URL valida o selecciona media guardada antes de enviar WhatsApp.';
      return;
    }
    this.whatsappSending = guestId;
    this.guestError = '';
    this.guestMessage = '';
    this.api.sendGuestWhatsApp(guestId, { messageType: this.selectedMessageType, media }).subscribe({
      next: ({ guest: updatedGuest, provider, status }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === guestId ? updatedGuest : item);
        this.guestMessage = `WhatsApp ${status} via ${provider}.`;
        this.whatsappSending = '';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo enviar WhatsApp.';
        this.whatsappSending = '';
      }
    });
  }

  sendBulkWhatsapp(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.filteredGuests.length) return;
    if (!this.hasPlanFeature('whatsappBulk')) {
      this.guestError = this.featureLockedMessage('whatsappBulk');
      return;
    }
    if (this.whatsappProvider === 'openwa' && !this.openWaReady) {
      this.guestError = `WhatsApp conectado pero no listo (${this.openWaStatus || 'desconocido'}).`;
      return;
    }
    const total = this.filteredGuests.filter((guest) => this.canWhatsappGuest(guest)).length;
    if (!total || !window.confirm(`Enviar WhatsApp "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${total} invitado(s) filtrados?`)) return;
    const media = this.buildWhatsappMediaPayload();
    if (this.whatsappMedia.enabled && !media) {
      this.guestError = 'Analiza una URL valida o selecciona media guardada antes de enviar WhatsApp.';
      return;
    }
    this.whatsappBulkSending = true;
    this.guestError = '';
    this.guestMessage = '';
    this.api.sendBulkWhatsApp(eventId, {
      confirm: true,
      messageType: this.selectedMessageType,
      media,
      guestIds: this.filteredGuests.filter((guest) => this.canWhatsappGuest(guest)).map((guest) => this.getGuestId(guest))
    }).subscribe({
      next: (result) => {
        this.guestMessage = `WhatsApp masivo: enviados ${result.sent}, omitidos ${result.skipped}, fallidos ${result.failed}.`;
        this.loadGuests(eventId);
        this.whatsappBulkSending = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo enviar WhatsApp masivo.';
        this.whatsappBulkSending = false;
      }
    });
  }

  buildWhatsappMediaPayload(): WhatsAppMediaPayload | undefined {
    if (!this.whatsappMedia.enabled) return undefined;
    const asset = this.whatsappMediaAssets.find((item) => this.getWhatsAppMediaAssetId(item) === this.whatsappMedia.assetId);
    if (asset) {
      return {
        type: asset.type,
        url: asset.url,
        mimetype: asset.mimetype,
        filename: asset.fileName,
        caption: this.whatsappMedia.caption.trim() || asset.caption
      };
    }
    const url = this.whatsappMedia.url.trim();
    if (!url) return undefined;
    if (!this.mediaInspection || this.mediaInspection.url !== url) return undefined;
    return {
      type: this.mediaInspection.type,
      url,
      mimetype: this.whatsappMedia.mimetype.trim() || this.mediaInspection.mimetype,
      filename: this.whatsappMedia.filename.trim() || this.mediaInspection.filename,
      caption: this.whatsappMedia.caption.trim() || undefined
    };
  }

  onWhatsappMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedWhatsappMediaFile = input.files?.[0] || undefined;
  }

  uploadWhatsappMedia(): void {
    const eventId = this.getEventId();
    const file = this.selectedWhatsappMediaFile;
    if (!this.hasPlanFeature('whatsappMedia')) {
      this.guestError = this.featureLockedMessage('whatsappMedia');
      return;
    }
    if (!eventId || !file) {
      this.guestError = 'Selecciona un archivo para WhatsApp.';
      return;
    }
    const type = this.mediaTypeFromMime(file.type);
    if (!type) {
      this.guestError = 'Tipo de archivo WhatsApp no soportado.';
      return;
    }
    this.whatsappMediaUploading = true;
    this.guestError = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder: 'whatsapp-media', event: eventId, size: file.size }).subscribe({
      next: ({ key, uploadUrl, publicUrl }) => {
        this.api.uploadAsset(uploadUrl, file).subscribe({
          next: () => {
            this.api.createWhatsAppMedia(eventId, {
              key,
              url: publicUrl,
              type,
              fileName: file.name,
              mimetype: file.type,
              size: file.size,
              caption: this.whatsappMedia.caption.trim() || undefined
            }).subscribe({
              next: ({ asset }) => {
                this.whatsappMediaAssets = [asset, ...this.whatsappMediaAssets];
                this.whatsappMedia.enabled = true;
                this.whatsappMedia.assetId = this.getWhatsAppMediaAssetId(asset);
                this.whatsappMedia.type = asset.type;
                this.whatsappMedia.url = '';
                this.whatsappMedia.mimetype = '';
                this.whatsappMedia.filename = '';
                this.selectedWhatsappMediaFile = undefined;
                this.guestMessage = 'Media WhatsApp subida y seleccionada.';
                this.whatsappMediaUploading = false;
              },
              error: (error) => {
                this.guestError = error.error?.message || 'No se pudo registrar la media WhatsApp.';
                this.whatsappMediaUploading = false;
              }
            });
          },
          error: () => {
            this.guestError = 'No se pudo subir la media a S3.';
            this.whatsappMediaUploading = false;
          }
        });
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo preparar la subida de media WhatsApp.';
        this.whatsappMediaUploading = false;
      }
    });
  }

  deleteWhatsappMedia(asset: WhatsAppMediaAssetModel): void {
    const eventId = this.getEventId();
    const assetId = this.getWhatsAppMediaAssetId(asset);
    if (!eventId || !assetId || !window.confirm(`Quitar "${asset.fileName}" de la media WhatsApp?`)) return;
    this.api.deleteWhatsAppMedia(eventId, assetId).subscribe({
      next: () => {
        this.whatsappMediaAssets = this.whatsappMediaAssets.filter((item) => this.getWhatsAppMediaAssetId(item) !== assetId);
        if (this.whatsappMedia.assetId === assetId) this.whatsappMedia.assetId = '';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo quitar la media WhatsApp.';
      }
    });
  }

  setCommunicationStatus(guest: GuestModel, communicationStatus: GuestCommunicationStatus): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.api.markGuestCommunication(guestId, { communicationStatus }).subscribe({
      next: ({ guest: updatedGuest }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === guestId ? updatedGuest : item);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo actualizar el seguimiento.';
      }
    });
  }

  getCommunicationStatus(guest: GuestModel): GuestCommunicationStatus {
    return guest.communicationStatus || (guest.status === 'confirmed' ? 'confirmed' : 'pending');
  }

  hasPlanFeature(feature: keyof PlanDefinition['limits']): boolean {
    return Boolean(this.currentPlan?.limits?.[feature]);
  }

  featureLockedMessage(feature: keyof PlanDefinition['limits']): string {
    const labels: Record<string, string> = {
      exportData: 'La exportacion CSV',
      whatsappMessaging: 'El envio de WhatsApp',
      whatsappBulk: 'El envio masivo por WhatsApp',
      whatsappMedia: 'La media para WhatsApp',
      checkIn: 'El check-in con QR',
      seating: 'La gestion de mesas',
      guestAlbum: 'El album colaborativo'
    };
    return `${labels[String(feature)] || 'Esta funcion'} requiere ${feature === 'whatsappBulk' ? 'plan Pro' : 'Evento Individual o Pro'}.`;
  }

  getMessageTypeLabel(messageType?: GuestMessageType): string {
    return this.messageTemplates.find((template) => template.value === messageType)?.label || 'Sin mensaje';
  }

  getEventId(): string {
    return this.event?._id || this.event?.id || '';
  }

  getInvitationId(invitation: InvitationModel): string {
    return invitation._id || invitation.id || '';
  }

  getGuestId(guest: GuestModel): string {
    return guest._id || guest.id || '';
  }

  downloadGuestPass(guest: GuestModel): void {
    const primaryInvitation = this.invitations[0];
    const passHtml = generateGuestPassHtml({
      guestName: guest.name,
      tableName: guest.tableName,
      seatLabel: guest.seatLabel,
      allowedCompanions: guest.allowedCompanions || 1,
      qrCodeUrl: this.getQrImageUrl(guest),
      headline: primaryInvitation?.content?.headline || this.event?.title || 'Invitación Digital',
      subheadline: primaryInvitation?.content?.subheadline || 'Pase de Entrada VIP',
      eventDateFormatted: this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
      locationAddress: primaryInvitation?.content?.locations?.[0]?.address || this.event?.venue?.address || this.event?.venue?.name,
      dressCode: primaryInvitation?.content?.dressCode,
      brandLogoUrl: primaryInvitation?.content?.brandLogoUrl,
      coverImageUrl: primaryInvitation?.content?.coverImageUrl,
      primaryColor: primaryInvitation?.content?.palette?.primary,
      accentColor: primaryInvitation?.content?.palette?.accent
    });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(passHtml);
      printWin.document.close();
    }
  }

  getTableId(table: EventTableModel): string {
    return table._id || table.id || '';
  }

  getWhatsAppMediaAssetId(asset: WhatsAppMediaAssetModel): string {
    return asset._id || asset.id || '';
  }

  private resetGuestForm(): void {
    this.editingGuest = undefined;
    this.guestForm = { name: '', email: '', phone: '', phoneCountryCode: '+52', phoneLocal: '', group: '', rolesText: '', tagsText: '', relationshipLabel: '', visibilityGroup: '', tableName: '', seatLabel: '', allowedCompanions: 0 };
    this.companionNames = '';
  }

  private normalizeEmail(email?: string): string {
    return (email || '').toLowerCase().trim();
  }

  private normalizePhone(phone?: string): string {
    return (phone || '').trim().replace(/[\s().-]/g, '');
  }

  private normalizeSearch(value?: string): string {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private toWhatsappPhone(phone?: string): string {
    const normalized = this.normalizePhone(phone).replace(/^\+/, '');
    if (!normalized) return '';
    return normalized.length === 10 ? `52${normalized}` : normalized;
  }

  private getMessageSubject(messageType: GuestMessageType): string {
    const title = this.event?.title || 'Invitacion';
    if (messageType === 'reminder') return `Recordatorio RSVP - ${title}`;
    if (messageType === 'event_reminder') return `Recordatorio del evento - ${title}`;
    if (messageType === 'location_change') return `Actualizacion de ubicacion - ${title}`;
    if (messageType === 'thanks') return `Gracias por confirmar - ${title}`;
    return `Invitacion - ${title}`;
  }

  private buildMessage(guest: GuestModel, messageType: GuestMessageType): string {
    const eventTitle = this.event?.title || 'nuestro evento';
    const date = this.event?.date ? new Date(this.event.date).toLocaleDateString() : '';
    const venue = this.event?.venue?.name || '';
    const address = this.event?.venue?.address || '';
    const publicUrl = this.getPersonalizedPublicUrl(guest);
    const externalUrl = this.event?.mode === 'external_dashboard' ? this.event.externalSiteUrl : '';
    const locationLine = [venue, address].filter(Boolean).join(' - ');
    const links = this.event?.mode === 'external_dashboard'
      ? [externalUrl ? `Pagina del evento: ${externalUrl}` : '', publicUrl ? `RSVP, pase y album: ${publicUrl}` : ''].filter(Boolean)
      : [publicUrl];

    if (messageType === 'reminder') {
      return [
        `Hola ${guest.name}, te recordamos confirmar tu asistencia a ${eventTitle}.`,
        date ? `Fecha: ${date}` : '',
        ...links,
        'Tu confirmacion nos ayuda a organizar mejor el evento.'
      ].filter(Boolean).join('\n\n');
    }

    if (messageType === 'event_reminder' || messageType === 'location_change') {
      return [
        `Hola ${guest.name}, te compartimos un recordatorio para ${eventTitle}.`,
        date ? `Fecha: ${date}` : '',
        locationLine ? `Lugar: ${locationLine}` : '',
        ...links,
        'Te recomendamos revisar el enlace antes del evento.'
      ].filter(Boolean).join('\n\n');
    }

    if (messageType === 'thanks') {
      return [
        `Hola ${guest.name}, gracias por confirmar tu asistencia a ${eventTitle}.`,
        date ? `Nos vemos el ${date}.` : '',
        locationLine ? `Lugar: ${locationLine}` : '',
        'Nos encantara verte ahi.'
      ].filter(Boolean).join('\n\n');
    }

    return [
      `Hola ${guest.name}, te comparto tu invitacion digital para ${eventTitle}.`,
      date ? `Fecha: ${date}` : '',
      locationLine ? `Lugar: ${locationLine}` : '',
      ...links,
      'Por favor confirma tu asistencia desde el enlace.'
    ].filter(Boolean).join('\n\n');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private findDuplicateGuest(excludeGuestId?: string): { guest: GuestModel; field: 'email' | 'phone' } | undefined {
    const email = this.normalizeEmail(this.guestForm.email);
    const phone = this.normalizePhone(this.guestForm.phone);
    return this.guests.reduce((found: { guest: GuestModel; field: 'email' | 'phone' } | undefined, guest) => {
      if (found || this.getGuestId(guest) === excludeGuestId) return found;
      if (email && this.normalizeEmail(guest.email) === email) return { guest, field: 'email' };
      if (phone && this.normalizePhone(guest.phone) === phone) return { guest, field: 'phone' };
      return undefined;
    }, undefined);
  }

  private buildGuestError(error: any, fallback: string): string {
    if (error.status === 409 && error.error?.details?.guestName) {
      const field = error.error.details.field === 'phone' ? 'telefono' : 'correo';
      return `Ese ${field} ya pertenece a ${error.error.details.guestName}. Puedes editar ese invitado en la lista.`;
    }
    return error.error?.message || fallback;
  }

  private loadInvitations(eventId: string): void {
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitations = invitations.filter((invitation) => {
          const eventRef = typeof invitation.event === 'string' ? invitation.event : invitation.event._id || invitation.event.id;
          return eventRef === eventId;
        });
        this.loading = false;
      },
      error: () => {
        this.invitations = [];
        this.loading = false;
      }
    });
  }

  private loadGuests(eventId: string): void {
    this.guestsLoading = true;
    this.api.listGuests(eventId).subscribe({
      next: ({ guests }) => {
        this.guests = guests;
        this.guestsLoading = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudieron cargar los invitados.';
        this.guestsLoading = false;
      }
    });
  }

  private loadRsvps(eventId: string): void {
    this.rsvpsLoading = true;
    this.rsvpError = '';
    this.api.listRsvps(eventId).subscribe({
      next: ({ rsvps }) => {
        this.rsvps = rsvps;
        this.rsvpsLoading = false;
      },
      error: (error) => {
        this.rsvpError = error.error?.message || 'No se pudieron cargar las respuestas RSVP.';
        this.rsvpsLoading = false;
      }
    });
  }

  private loadTables(eventId: string): void {
    this.api.listTables(eventId).subscribe({
      next: ({ tables }) => this.tables = tables,
      error: () => this.tables = []
    });
  }

  private loadAlbum(eventId: string): void {
    this.albumError = '';
    this.api.listAlbum(eventId).subscribe({
      next: ({ assets }) => this.albumAssets = assets,
      error: () => this.albumAssets = []
    });
  }

  private loadEventMetrics(eventId: string): void {
    this.api.getEventDashboard(eventId).subscribe({
      next: ({ metrics }) => this.eventMetrics = metrics,
      error: () => this.eventMetrics = {}
    });
  }

  private loadWhatsAppMedia(eventId: string): void {
    this.api.listWhatsAppMedia(eventId).subscribe({
      next: ({ assets }) => this.whatsappMediaAssets = assets,
      error: () => this.whatsappMediaAssets = []
    });
  }

  private mediaTypeFromMime(mimetype: string): WhatsAppMediaType | '' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf') return 'document';
    return '';
  }

  private loadAccessLinks(eventId: string): void {
    this.api.listEventAccessLinks(eventId).subscribe({
      next: ({ links }) => this.eventAccessLinks = links,
      error: () => this.eventAccessLinks = []
    });
  }

  private loadSongRequests(eventId: string): void {
    this.api.listSongRequests(eventId).subscribe({
      next: ({ songRequests }) => this.songRequests = songRequests,
      error: () => this.songRequests = []
    });
  }

  private loadDedications(eventId: string): void {
    this.api.listDedications(eventId).subscribe({
      next: ({ dedications }) => this.dedications = dedications,
      error: () => this.dedications = []
    });
  }

  updateDedication(dedication: DedicationModel, status: DedicationStatus): void {
    const eventId = this.getEventId();
    const dedicationId = dedication._id || dedication.id || '';
    if (!eventId || !dedicationId) return;
    this.api.updateDedication(eventId, dedicationId, status).subscribe({
      next: ({ dedication: updated }) => {
        this.dedications = this.dedications.map((item) => (item._id || item.id) === dedicationId ? updated : item);
        this.guestMessage = 'Dedicatoria actualizada.';
      },
      error: (error) => this.guestError = error.error?.message || 'No se pudo actualizar la dedicatoria.'
    });
  }

  private loadEmbedManifest(event: EventModel): void {
    if (event.mode !== 'external_dashboard' || !event.externalPortalSlug) {
      this.embedManifest = undefined;
      return;
    }
    this.api.getExternalEmbedManifest(event.externalPortalSlug).subscribe({
      next: (manifest) => this.embedManifest = manifest,
      error: () => this.embedManifest = undefined
    });
  }

  private syncExternalConfig(event: EventModel): void {
    const content = event.externalContent || {};
    this.externalForm.patchValue({
      externalSiteUrl: event.externalSiteUrl || '',
      externalSiteLabel: event.externalSiteLabel || '',
      externalPortalEnabled: event.externalPortalEnabled !== false,
      welcomeMessage: event.externalPortalSettings?.welcomeMessage || '',
      brandLabel: event.externalPortalSettings?.brandLabel || '',
      coverImageUrl: content.coverImageUrl || '',
      heroImageUrl: content.heroImageUrl || '',
      musicUrl: content.musicUrl || '',
      songRequestsEnabled: content.songRequestSettings?.enabled !== false,
      songRequestsMax: content.songRequestSettings?.maxRequestsPerGuest || 3,
      songRequestsDedications: content.songRequestSettings?.allowDedications !== false,
      giftEnabled: content.giftSettings?.enabled !== false,
      giftIntroText: content.giftSettings?.introText || '',
      giftShowRegistry: content.giftSettings?.showRegistry !== false,
      giftShowEnvelope: content.giftSettings?.showEnvelope !== false,
      envelopeBank: content.digitalEnvelope?.bank || '',
      envelopeHolder: content.digitalEnvelope?.holder || '',
      envelopeAccount: content.digitalEnvelope?.account || '',
      envelopeClabe: content.digitalEnvelope?.clabe || '',
      envelopeNote: content.digitalEnvelope?.note || '',
      envelopeQrImageUrl: content.digitalEnvelope?.qrImageUrl || '',
      dedicationsEnabled: content.dedicationSettings?.enabled !== false,
      dedicationsRequireApproval: content.dedicationSettings?.requireApproval !== false,
      dedicationsIntroText: content.dedicationSettings?.introText || ''
    });
    this.resetUrlArray(this.carouselItems, content.carousel || []);
    this.resetUrlArray(this.galleryItems, content.gallery || []);
    this.resetUrlArray(this.spectacularItems, content.spectacularImages || []);
    this.resetFormArray(this.audioSectionItems);
    (content.audioSections || []).forEach((item) => this.addAudioSection(item));
    this.resetFormArray(this.locationItems);
    (content.locations || []).forEach((item) => this.addLocation(item));
    this.resetFormArray(this.sectionItems);
    (content.sections || []).forEach((item) => this.addSection(item));
    this.resetFormArray(this.giftItems);
    (content.giftRegistry || []).forEach((item) => this.addGift(item));
  }

  private loadWhatsAppStatus(): void {
    this.api.getWhatsAppStatus().subscribe({
      next: ({ provider, fallbackProvider, enabled, fallbackEnabled, openWaSession }) => {
        this.whatsappProvider = provider;
        this.whatsappFallbackProvider = fallbackProvider || '';
        this.whatsappEnabled = enabled;
        this.whatsappFallbackEnabled = Boolean(fallbackEnabled);
        this.openWaReady = provider !== 'openwa' || Boolean(openWaSession?.ready);
        this.openWaStatus = openWaSession?.status || '';
      },
      error: () => {
        this.whatsappProvider = 'disabled';
        this.whatsappFallbackProvider = '';
        this.whatsappEnabled = false;
        this.whatsappFallbackEnabled = false;
        this.openWaReady = false;
        this.openWaStatus = '';
      }
    });
  }

  private loadPaymentStatus(): void {
    this.api.getPaymentStatus(this.getEventId()).subscribe({
      next: ({ eventPlanDefinition, planDefinition, eventPlanActive, eventPlanExpiresAt, subscriptionActive }) => {
        this.currentPlan = eventPlanDefinition || planDefinition;
        this.eventPlanActive = Boolean(eventPlanActive);
        this.eventPlanExpiresAt = eventPlanExpiresAt || '';
        this.subscriptionActive = Boolean(subscriptionActive);
      },
      error: () => {
        this.currentPlan = undefined;
        this.eventPlanActive = false;
        this.eventPlanExpiresAt = '';
        this.subscriptionActive = false;
      }
    });
  }

  private slugify(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private get apiBaseUrl(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  private widgetUrl(widget: string): string {
    if (!this.event?.externalPortalSlug) return '';
    const prefix = this.newExternalPortalUrl ? 'new/embed' : 'embed';
    return `${window.location.origin}/${prefix}/${this.event.externalPortalSlug}/${widget}`;
  }

  private iframeSnippet(widget: string, height: number): string {
    const url = this.widgetUrl(widget);
    return url ? `<iframe src="${url}" width="100%" height="${height}" style="border:0"></iframe>` : '';
  }

  private splitCsv(value: string): string[] {
    return (value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  private resetFormArray(array: FormArray): void {
    while (array.length) array.removeAt(0);
  }

  private resetUrlArray(array: FormArray, values: string[]): void {
    this.resetFormArray(array);
    values.forEach((value) => array.push(new FormControl(value)));
  }

  private cleanStringList(values: string[] = []): string[] {
    return (values || []).map((item) => String(item || '').trim()).filter(Boolean);
  }

  private cleanAudioSections(values: any[] = []): ExternalContent['audioSections'] {
    return (values || []).map((item) => ({
      title: String(item.title || '').trim() || undefined,
      url: String(item.url || '').trim(),
      description: String(item.description || '').trim() || undefined
    })).filter((item) => item.url);
  }

  private cleanLocations(values: any[] = []): ExternalContent['locations'] {
    return (values || []).map((item) => ({
      type: String(item.type || '').trim() || undefined,
      name: String(item.name || '').trim() || undefined,
      address: String(item.address || '').trim() || undefined,
      mapUrl: String(item.mapUrl || '').trim() || undefined,
      wazeUrl: String(item.wazeUrl || '').trim() || undefined,
      notes: String(item.notes || '').trim() || undefined,
      time: String(item.time || '').trim() || undefined
    }) as any).filter((item) => item.name || item.address || item.mapUrl);
  }

  private cleanSections(values: any[] = []): ExternalContent['sections'] {
    return (values || []).map((item, index) => {
      const type = String(item.type || 'text').trim();
      return {
        key: String(item.key || '').trim() || undefined,
        type: ['text', 'image', 'video', 'cta', 'iframe', 'timeline', 'story', 'dress_code', 'gift_registry', 'dedications', 'lodging', 'faq', 'people'].includes(type) ? type as any : 'text',
        title: String(item.title || '').trim() || undefined,
        body: String(item.body || '').trim() || undefined,
        url: String(item.url || '').trim() || undefined,
        imageUrl: String(item.imageUrl || '').trim() || undefined,
        roles: this.splitCsv(item.rolesText || ''),
        order: item.order !== '' && item.order !== undefined && item.order !== null ? Number(item.order) : index
      };
    }).filter((item) => item.title || item.body || item.url || item.imageUrl);
  }

  private cleanGiftRegistry(values: any[] = []): ExternalContent['giftRegistry'] {
    return (values || []).map((item, index) => ({
      store: String(item.store || '').trim() || undefined,
      title: String(item.title || '').trim() || undefined,
      label: String(item.label || '').trim() || undefined,
      url: String(item.url || '').trim() || undefined,
      imageUrl: String(item.imageUrl || '').trim() || undefined,
      note: String(item.note || '').trim() || undefined,
      priority: item.priority !== '' && item.priority !== undefined && item.priority !== null ? Number(item.priority) : index
    })).filter((item) => item.store || item.title || item.label || item.url || item.imageUrl || item.note);
  }

  private externalAssetFolder(target: 'cover' | 'hero' | 'music' | 'carousel' | 'gallery' | 'spectacular' | 'audioSection' | 'sectionImage'): AssetFolder {
    if (target === 'music' || target === 'audioSection') return 'music';
    if (target === 'cover' || target === 'hero') return 'covers';
    if (target === 'sectionImage') return 'assets';
    return 'gallery';
  }

  private validateExternalAsset(file: File, folder: AssetFolder): string {
    const isMusic = folder === 'music';
    const allowedTypes = isMusic ? this.audioTypes : this.imageTypes;
    const maxSize = isMusic ? this.maxAudioSize : this.maxImageSize;
    if (!allowedTypes.has(file.type)) return isMusic ? 'Formato de audio no soportado. Usa MP3 o WAV.' : 'Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.';
    if (file.size > maxSize) return isMusic ? 'El audio no debe exceder 10MB.' : 'La imagen no debe exceder 5MB.';
    return '';
  }

  private applyExternalAssetUrl(target: 'cover' | 'hero' | 'music' | 'carousel' | 'gallery' | 'spectacular' | 'audioSection' | 'sectionImage', url: string, index?: number): void {
    if (target === 'cover') this.externalForm.patchValue({ coverImageUrl: url });
    if (target === 'hero') this.externalForm.patchValue({ heroImageUrl: url });
    if (target === 'music') this.externalForm.patchValue({ musicUrl: url });
    if (target === 'carousel' && index !== undefined) this.carouselItems.at(index)?.setValue(url);
    if (target === 'gallery' && index !== undefined) this.galleryItems.at(index)?.setValue(url);
    if (target === 'spectacular' && index !== undefined) this.spectacularItems.at(index)?.setValue(url);
    if (target === 'audioSection' && index !== undefined) (this.audioSectionItems.at(index) as FormGroup | undefined)?.patchValue({ url });
    if (target === 'sectionImage' && index !== undefined) (this.sectionItems.at(index) as FormGroup | undefined)?.patchValue({ imageUrl: url });
  }
}
