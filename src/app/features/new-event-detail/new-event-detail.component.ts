import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  AlbumAssetModel, AssetFolder, DashboardMetrics, DedicationModel, DedicationStatus,
  EmbedManifestResponse, EventAccessLinkModel, EventAccessRole, EventModel, EventTableModel,
  ExternalContent, GuestCommunicationStatus, GuestMessageChannel, GuestMessageType, GuestModel,
  GuestPayload, InvitationModel, PaymentPackage, PlanDefinition, RsvpModel, SongRequestModel,
  SongRequestStatus, WhatsAppMediaAssetModel, WhatsAppMediaInspection, WhatsAppMediaPayload,
  WhatsAppMediaType, WhatsAppProvider, EventStatus
} from '../../core/models';
import { environment } from '../../../environments/environment';

interface MessageTemplateOption { value: GuestMessageType; label: string; }

type Tab = 'info' | 'guests' | 'tables' | 'rsvps' | 'album' | 'communication' | 'dedications' | 'dj' | 'integration';

@Component({ selector: 'app-new-event-detail', templateUrl: './new-event-detail.component.html' })
export class NewEventDetailComponent implements OnInit {
  Math = Math;
  activeTab: Tab = 'info';
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

  loading = true;
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
  error = '';
  guestError = '';
  rsvpError = '';
  albumError = '';
  albumMessage = '';
  guestMessage = '';
  tableMessage = '';
  importMessage = '';
  importDuplicateDetails: string[] = [];
  checkInCode = '';
  checkInLink = '';

  // WhatsApp
  whatsappProvider: WhatsAppProvider = 'disabled';
  whatsappFallbackProvider: WhatsAppProvider | '' = '';
  whatsappEnabled = false;
  whatsappFallbackEnabled = false;
  openWaReady = false;
  openWaStatus = '';
  mediaInspection?: WhatsAppMediaInspection;
  mediaInspecting = false;
  selectedWhatsappMediaFile?: File;
  whatsappMedia = {
    enabled: false, assetId: '', type: 'image' as WhatsAppMediaType,
    url: '', mimetype: '', filename: '', caption: ''
  };
  selectedMessageType: GuestMessageType = 'invitation';
  messageTemplates: MessageTemplateOption[] = [
    { value: 'invitation', label: 'Invitación' },
    { value: 'reminder', label: 'Recordatorio RSVP' },
    { value: 'event_reminder', label: 'Recordatorio evento' },
    { value: 'location_change', label: 'Cambio de ubicación' },
    { value: 'thanks', label: 'Agradecimiento' }
  ];

  // Metrics
  eventMetrics: Partial<DashboardMetrics> = {};

  // Plan
  currentPlan?: PlanDefinition;
  eventPlanActive = false;
  eventPlanExpiresAt = '';
  subscriptionActive = false;

  // Guest form
  showGuestForm = false;
  editingGuest?: GuestModel;
  guestForm = {
    name: '', email: '', phone: '', group: '', rolesText: '', tagsText: '',
    relationshipLabel: '', visibilityGroup: '', tableName: '', seatLabel: '',
    allowedCompanions: 0
  };
  companionNames = '';

  // Guest filters
  guestSearch = '';
  guestStatusFilter = '';
  guestCommunicationFilter = '';
  guestGroupFilter = '';

  // Import
  importFile?: File;

  // Table form
  tableForm = { name: '', capacity: 10, notes: '', order: 0 };
  showTableForm = false;

  // Access links
  accessLinkForm = { role: 'check_in' as EventAccessRole, label: '', days: 7 };

  // External config
  externalSaving = false;
  externalError = '';
  externalSuccess = '';
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
    songRequestsDedications: new FormControl(true),
    songRequestsRequireApproval: new FormControl(true),
    moderationNotifyOnReview: new FormControl(true),
    moderationAutoApproveAlbum: new FormControl(false),
    moderationAutoApproveSongs: new FormControl(false),
    moderationAutoApproveDedications: new FormControl(false),
    moderationAutoApproveRolesText: new FormControl(''),
    moderationAutoApproveGroupsText: new FormControl(''),
    moderationAutoApproveEmailsText: new FormControl(''),
    moderationAutoApprovePhonesText: new FormControl('')
  });

  private readonly imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  private readonly audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav']);
  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly maxAudioSize = 10 * 1024 * 1024;

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.getEvent(id).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loading = false;
        this.loadRelated(id);
        if (event.mode === 'external_dashboard') this.syncExternalConfig(event);
      },
      error: (err) => { this.error = err.error?.message || 'Evento no encontrado'; this.loading = false; }
    });
  }

  private loadRelated(eventId: string): void {
    this.loadInvitations(eventId);
    this.loadGuests(eventId);
    this.loadRsvps(eventId);
    this.loadTables(eventId);
    this.loadAlbum(eventId);
    this.loadEventMetrics(eventId);
    this.loadWhatsAppMedia(eventId);
    this.loadWhatsAppStatus();
    this.loadPaymentStatus(eventId);
    this.loadAccessLinks(eventId);
    this.loadSongRequests(eventId);
    this.loadDedications(eventId);
    if (this.event?.mode === 'external_dashboard') this.loadEmbedManifest(this.event);
  }

  // ── Getters ──

  get eventId(): string { return this.event?._id || this.event?.id || ''; }

  get filteredGuests(): GuestModel[] {
    const search = this.normalizeSearch(this.guestSearch);
    return this.guests.filter(g => {
      if (search && ![g.name, g.email, g.phone, g.group].some(v => this.normalizeSearch(v).includes(search))) return false;
      if (this.guestStatusFilter && g.status !== this.guestStatusFilter) return false;
      if (this.guestCommunicationFilter && this.getCommunicationStatus(g) !== this.guestCommunicationFilter) return false;
      if (this.guestGroupFilter && (g.group || 'General') !== this.guestGroupFilter) return false;
      return true;
    });
  }

  get guestGroups(): string[] {
    return Array.from(new Set(this.guests.map(g => g.group || 'General'))).sort();
  }

  get confirmedCount(): number { return this.guests.filter(g => g.status === 'confirmed').length; }
  get pendingCount(): number { return this.guests.filter(g => g.status === 'pending').length; }
  get declinedCount(): number { return this.guests.filter(g => g.status === 'declined').length; }
  get checkedInCount(): number { return this.guests.filter(g => g.checkedIn).length; }
  get totalSeats(): number { return this.guests.reduce((sum, g) => sum + 1 + (g.allowedCompanions || 0), 0); }
  get unassignedGuests(): GuestModel[] { return this.guests.filter(g => !g.tableName); }

  get pendingCommunicationGuests(): number { return this.guests.filter(g => this.getCommunicationStatus(g) === 'pending').length; }
  get sentCommunicationGuests(): number { return this.guests.filter(g => this.getCommunicationStatus(g) === 'sent').length; }
  get deliveredCommunicationGuests(): number { return this.guests.filter(g => this.getCommunicationStatus(g) === 'delivered').length; }
  get readCommunicationGuests(): number { return this.guests.filter(g => this.getCommunicationStatus(g) === 'read').length; }
  get openedCommunicationGuests(): number { return this.guests.filter(g => this.getCommunicationStatus(g) === 'opened').length; }
  get failedCommunicationGuests(): number { return this.guests.filter(g => this.getCommunicationStatus(g) === 'failed').length; }
  get confirmedCommunicationGuests(): number { return this.guests.filter(g => this.getCommunicationStatus(g) === 'confirmed').length; }

  get pendingAlbumAssets(): number { return this.albumAssets.filter(a => a.status === 'pending').length; }

  get primaryInvitation(): InvitationModel | undefined {
    return this.invitations.find(i => i.status === 'published') || this.invitations[0];
  }

  get albumPublicUrl(): string {
    return this.primaryInvitation ? `${window.location.origin}/i/${this.primaryInvitation.slug}` : '';
  }

  get albumQrUrl(): string {
    return this.albumPublicUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(this.albumPublicUrl)}` : '';
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

  get eventPlanExpiresLabel(): string {
    return this.eventPlanExpiresAt ? new Date(this.eventPlanExpiresAt).toLocaleDateString() : '';
  }

  get bulkWhatsappPreview(): string {
    const guest = this.filteredGuests.find(g => this.canWhatsappGuest(g));
    if (!guest) return 'Selecciona invitados con teléfono para previsualizar.';
    return this.buildMessage(guest, this.selectedMessageType);
  }

  get whatsappRecipientCount(): number { return this.filteredGuests.filter(g => this.canWhatsappGuest(g)).length; }
  get whatsappMissingPhoneCount(): number { return this.filteredGuests.filter(g => !this.toWhatsappPhone(g.phone)).length; }

  // External form getters
  get carouselItems(): FormArray { return this.externalForm.get('carousel') as FormArray; }
  get galleryItems(): FormArray { return this.externalForm.get('gallery') as FormArray; }
  get spectacularItems(): FormArray { return this.externalForm.get('spectacularImages') as FormArray; }
  get audioSectionItems(): FormArray { return this.externalForm.get('audioSections') as FormArray; }
  get locationItems(): FormArray { return this.externalForm.get('locations') as FormArray; }
  get sectionItems(): FormArray { return this.externalForm.get('sections') as FormArray; }
  get giftItems(): FormArray { return this.externalForm.get('giftRegistry') as FormArray; }

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

  get classicEmbedWidgets(): Array<{ key: string; label: string; url: string; snippet: string }> {
    const widgets = this.embedManifest?.widgets || {};
    const snippets = this.embedManifest?.snippets || {};
    const appOrigin = window.location.origin;
    return [
      { key: 'rsvp', label: 'RSVP', url: widgets['rsvp'] || this.classicWidgetUrl('rsvp'), snippet: snippets['rsvp'] || this.classicIframeSnippet('rsvp', 720) },
      { key: 'guestPass', label: 'Pase QR', url: widgets['guestPass'] || this.classicWidgetUrl('guest-pass'), snippet: this.classicIframeSnippet('guest-pass', 520) },
      { key: 'album', label: 'Álbum', url: widgets['album'] || this.classicWidgetUrl('album'), snippet: snippets['album'] || this.classicIframeSnippet('album', 720) },
      { key: 'gallery', label: 'Galería', url: widgets['gallery'] || this.classicWidgetUrl('gallery'), snippet: this.classicIframeSnippet('gallery', 520) },
      { key: 'map', label: 'Mapa', url: widgets['map'] || this.classicWidgetUrl('map'), snippet: snippets['map'] || this.classicIframeSnippet('map', 480) },
      { key: 'songRequests', label: 'DJ', url: widgets['songRequests'] || this.classicWidgetUrl('song-requests'), snippet: snippets['songRequests'] || this.classicIframeSnippet('song-requests', 520) },
      { key: 'fullPortal', label: 'Portal completo', url: widgets['fullPortal'] || this.classicWidgetUrl('full-portal'), snippet: this.classicIframeSnippet('full-portal', 900) },
      { key: 'rsvpWidget', label: 'Widget RSVP (Div + Script)', url: this.classicWidgetUrl('rsvp'), snippet: `<div data-kyndra-widget="rsvp" data-portal="${this.event?.externalPortalSlug || ''}"></div>\n<script src="${appOrigin}/assets/kyndra-embed.js"></script>` }
    ].filter(item => item.url);
  }

  get newEmbedWidgets(): Array<{ key: string; label: string; url: string; snippet: string }> {
    const widgets = this.embedManifest?.widgets || {};
    const snippets = this.embedManifest?.snippets || {};
    const appOrigin = window.location.origin;

    const getNewUrl = (key: string, fallback: string) => {
      const original = widgets[key];
      return original ? original.replace('/embed/', '/new/embed/') : fallback;
    };

    const getNewSnippet = (key: string, fallback: string) => {
      const original = snippets[key];
      return original ? original.replace(/\/embed\//g, '/new/embed/') : fallback;
    };

    return [
      { key: 'rsvp', label: 'RSVP', url: getNewUrl('rsvp', this.newWidgetUrl('rsvp')), snippet: getNewSnippet('rsvp', this.newIframeSnippet('rsvp', 720)) },
      { key: 'guestPass', label: 'Pase QR', url: getNewUrl('guestPass', this.newWidgetUrl('guest-pass')), snippet: this.newIframeSnippet('guest-pass', 520) },
      { key: 'album', label: 'Álbum', url: getNewUrl('album', this.newWidgetUrl('album')), snippet: getNewSnippet('album', this.newIframeSnippet('album', 720)) },
      { key: 'gallery', label: 'Galería', url: getNewUrl('gallery', this.newWidgetUrl('gallery')), snippet: this.newIframeSnippet('gallery', 520) },
      { key: 'map', label: 'Mapa', url: getNewUrl('map', this.newWidgetUrl('map')), snippet: getNewSnippet('map', this.newIframeSnippet('map', 480)) },
      { key: 'songRequests', label: 'DJ', url: getNewUrl('songRequests', this.newWidgetUrl('song-requests')), snippet: getNewSnippet('songRequests', this.newIframeSnippet('song-requests', 520)) },
      { key: 'fullPortal', label: 'Portal completo', url: getNewUrl('fullPortal', this.newWidgetUrl('full-portal')), snippet: this.newIframeSnippet('full-portal', 900) },
      { key: 'rsvpWidget', label: 'Widget RSVP (Div + Script)', url: this.newWidgetUrl('rsvp'), snippet: `<div data-kyndra-widget="rsvp" data-portal="${this.event?.externalPortalSlug || ''}"></div>\n<script src="${appOrigin}/assets/kyndra-embed.js"></script>` }
    ].filter(item => item.url);
  }

  get embedWidgets(): Array<{ key: string; label: string; url: string; snippet: string }> {
    return this.newEmbedWidgets;
  }

  // ── Invitation ──

  createInvitation(): void {
    if (!this.event) return;
    if (this.event.mode === 'external_dashboard') {
      this.error = 'Este evento está en modo dashboard externo.';
      return;
    }
    this.saving = true;
    this.error = '';
    this.api.createInvitation({
      event: this.eventId,
      slug: this.slugify(this.event.title),
      accessMode: 'guest_list',
      content: {
        headline: this.event.title,
        subheadline: 'Nos encantaría que nos acompañes',
        message: 'Confirma tu asistencia y comparte este día especial con nosotros.',
        palette: { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' },
        gallery: []
      }
    }).subscribe({
      next: ({ invitation }) => this.router.navigate(['/new/invitations', this.getInvitationId(invitation), 'editor']),
      error: (err) => { this.error = err.error?.message || 'No se pudo crear la invitación.'; this.saving = false; }
    });
  }

  deleteInvitation(inv: InvitationModel): void {
    const id = this.getInvitationId(inv);
    if (!id) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar la invitación "${inv.content?.headline || inv.slug}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.saving = true;
    this.error = '';
    this.api.deleteInvitation(id).subscribe({
      next: () => {
        this.saving = false;
        this.loadInvitations(this.eventId);
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo eliminar la invitación.';
        this.saving = false;
      }
    });
  }

  // ── Guest CRUD ──

  openGuestForm(guest?: GuestModel): void {
    this.editingGuest = guest;
    this.guestError = '';
    this.guestMessage = '';
    if (guest) {
      this.guestForm = {
        name: guest.name, email: guest.email || '', phone: guest.phone || '',
        group: guest.group || '', rolesText: (guest.roles || []).join(', '),
        tagsText: (guest.tags || []).join(', '), relationshipLabel: guest.relationshipLabel || '',
        visibilityGroup: guest.visibilityGroup || '', tableName: guest.tableName || '',
        seatLabel: guest.seatLabel || '', allowedCompanions: guest.allowedCompanions || 0
      };
      this.companionNames = (guest.companions || []).map(c => c.name || '').filter(Boolean).join('\n');
    } else {
      this.guestForm = { name: '', email: '', phone: '', group: '', rolesText: '', tagsText: '', relationshipLabel: '', visibilityGroup: '', tableName: '', seatLabel: '', allowedCompanions: 0 };
      this.companionNames = '';
    }
    this.showGuestForm = true;
  }

  saveGuest(): void {
    if (!this.guestForm.name.trim()) { this.guestError = 'El nombre es requerido'; return; }
    const duplicate = this.findDuplicateGuest(this.editingGuest ? this.getGuestId(this.editingGuest) : undefined);
    if (duplicate) {
      this.guestError = `Ese ${duplicate.field === 'email' ? 'correo' : 'teléfono'} ya pertenece a ${duplicate.guest.name}.`;
      return;
    }
    this.guestSaving = true;
    this.guestError = '';
    const wasEditing = Boolean(this.editingGuest);
    const guestData: Omit<GuestPayload, 'event'> = {
      name: this.guestForm.name,
      email: this.guestForm.email || undefined,
      phone: this.guestForm.phone || undefined,
      group: this.guestForm.group || undefined,
      roles: this.splitCsv(this.guestForm.rolesText),
      tags: this.splitCsv(this.guestForm.tagsText),
      relationshipLabel: this.guestForm.relationshipLabel || undefined,
      visibilityGroup: this.guestForm.visibilityGroup || undefined,
      tableName: this.guestForm.tableName || undefined,
      seatLabel: this.guestForm.seatLabel || undefined,
      allowedCompanions: Number(this.guestForm.allowedCompanions || 0)
    };
    const companions = this.companionNames.split('\n').map(n => n.trim()).filter(Boolean).map(name => ({ name, tableName: this.guestForm.tableName || undefined }));
    if (companions.length) guestData.companions = companions;

    const request = this.editingGuest
      ? this.api.updateGuest(this.getGuestId(this.editingGuest), guestData)
      : this.api.createGuest({ event: this.eventId, ...guestData });

    request.subscribe({
      next: ({ guest }) => {
        this.guests = this.editingGuest
          ? this.guests.map(item => this.getGuestId(item) === this.getGuestId(guest) ? guest : item).sort((a, b) => a.name.localeCompare(b.name))
          : [guest, ...this.guests].sort((a, b) => a.name.localeCompare(b.name));
        this.guestMessage = wasEditing ? 'Invitado actualizado.' : 'Invitado agregado.';
        this.showGuestForm = false;
        this.guestSaving = false;
        this.editingGuest = undefined;
      },
      error: (err) => {
        this.guestError = this.buildGuestError(err, this.editingGuest ? 'No se pudo actualizar.' : 'No se pudo agregar.');
        this.guestSaving = false;
      }
    });
  }

  deleteGuest(guest: GuestModel): void {
    if (!confirm(`¿Eliminar a ${guest.name}?`)) return;
    this.guestSaving = true;
    const guestId = this.getGuestId(guest);
    this.api.deleteGuest(guestId).subscribe({
      next: () => {
        this.guests = this.guests.filter(g => this.getGuestId(g) !== guestId);
        this.guestMessage = 'Invitado eliminado';
        this.guestSaving = false;
      },
      error: (err) => { this.guestError = err.error?.message || 'Error eliminando'; this.guestSaving = false; }
    });
  }

  // ── Import ──

  selectImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile = input.files?.[0];
    this.importDuplicateDetails = [];
  }

  importGuests(): void {
    if (!this.importFile) return;
    this.importing = true;
    this.importMessage = '';
    this.importDuplicateDetails = [];
    this.api.importGuests(this.eventId, this.importFile).subscribe({
      next: (result) => {
        const created = result.created ?? result.imported;
        const duplicateRows = result.duplicateRows || 0;
        const skipped = result.skipped ?? ((result.invalidRows || 0) + duplicateRows);
        this.importMessage = `Creados: ${created}. Actualizados: ${result.updated || 0}. Omitidos: ${skipped}. Inválidos: ${result.invalidRows}. Duplicados: ${duplicateRows}.`;
        this.importDuplicateDetails = (result.duplicates || []).slice(0, 5).map((d: any) => {
          if (d.field === 'plan') return `Fila ${d.row}: omitida por límite del plan.`;
          return `Fila ${d.row}: ${d.field === 'email' ? 'email' : 'teléfono'} ${d.value} ya pertenece a ${d.guestName}.`;
        });
        this.importing = false;
        this.importFile = undefined;
        this.loadGuests(this.eventId);
      },
      error: (err) => { this.importMessage = err.error?.message || 'Error de importación'; this.importing = false; }
    });
  }

  // ── Check-in ──

  checkInGuest(): void {
    const code = this.checkInCode.trim();
    if (!code) return;
    this.guestError = '';
    this.api.checkInGuest(code).subscribe({
      next: ({ guest }) => {
        this.guests = this.guests.map(item => this.getGuestId(item) === this.getGuestId(guest) ? guest : item);
        this.guestMessage = `${guest.name} marcado como registrado.`;
        this.checkInCode = '';
      },
      error: (err) => this.guestError = err.error?.message || 'No se pudo registrar el check-in.'
    });
  }

  createCheckInLink(): void {
    if (!this.eventId) return;
    if (!this.hasPlanFeature('checkIn')) { this.guestError = this.featureLockedMessage('checkIn'); return; }
    this.api.createCheckInLink(this.eventId, { label: 'Entrada', days: 7 }).subscribe({
      next: ({ url }) => { this.checkInLink = url; this.guestMessage = 'Link de staff generado.'; },
      error: (err) => this.guestError = err.error?.message || 'No se pudo generar el link.'
    });
  }

  // ── Tables ──

  createTable(): void {
    if (!this.eventId || !this.tableForm.name) return;
    if (!this.hasPlanFeature('seating')) { this.guestError = this.featureLockedMessage('seating'); return; }
    this.tableMessage = '';
    this.api.createTable(this.eventId, {
      name: this.tableForm.name, capacity: Number(this.tableForm.capacity || 1),
      notes: this.tableForm.notes || undefined, order: Number(this.tableForm.order || 0)
    }).subscribe({
      next: () => {
        this.tableForm = { name: '', capacity: 10, notes: '', order: 0 };
        this.tableMessage = 'Mesa creada.';
        this.showTableForm = false;
        this.loadTables(this.eventId);
      },
      error: (err) => this.guestError = err.error?.message || 'No se pudo crear la mesa.'
    });
  }

  deleteTable(table: EventTableModel): void {
    const tableId = this.getTableId(table);
    if (!this.eventId || !tableId || !confirm(`¿Eliminar mesa ${table.name}?`)) return;
    this.api.deleteTable(this.eventId, tableId).subscribe({
      next: () => { this.tableMessage = 'Mesa eliminada.'; this.loadTables(this.eventId); },
      error: (err) => this.guestError = err.error?.message || 'No se pudo eliminar la mesa.'
    });
  }

  // ── Album ──

  updateAlbumAsset(asset: AlbumAssetModel, status: AlbumAssetModel['status']): void {
    const assetId = asset._id || asset.id || '';
    if (!this.eventId || !assetId) return;
    this.api.updateAlbumAsset(this.eventId, assetId, status).subscribe({
      next: ({ asset: updated }) => {
        this.albumAssets = this.albumAssets.map(item => (item._id || item.id) === assetId ? updated : item);
        this.albumMessage = 'Álbum actualizado.';
      },
      error: (err) => this.albumError = err.error?.message || 'No se pudo actualizar la foto.'
    });
  }

  // ── Communication ──

  sendRealEmail(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.emailSending = guestId;
    this.guestError = '';
    this.api.sendGuestEmail(guestId, { messageType: this.selectedMessageType }).subscribe({
      next: ({ guest: updated }) => {
        this.guests = this.guests.map(item => this.getGuestId(item) === guestId ? updated : item);
        this.guestMessage = 'Email enviado.';
        this.emailSending = '';
      },
      error: (err) => { this.guestError = err.error?.message || 'No se pudo enviar email.'; this.emailSending = ''; }
    });
  }

  sendBulkEmail(): void {
    if (!this.eventId || !this.filteredGuests.length) return;
    const guestIds = this.filteredGuests.filter(g => this.canEmailGuest(g)).map(g => this.getGuestId(g));
    if (!guestIds.length || !confirm(`Enviar email "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${guestIds.length} invitado(s)?`)) return;
    this.emailBulkSending = true;
    this.guestError = '';
    this.api.sendBulkEmail(this.eventId, { confirm: true, messageType: this.selectedMessageType, guestIds }).subscribe({
      next: (result) => {
        this.guestMessage = `Email masivo: enviados ${result.sent}, fallidos ${result.failed}.`;
        this.loadGuests(this.eventId);
        this.emailBulkSending = false;
      },
      error: (err) => { this.guestError = err.error?.message || 'Error en email masivo.'; this.emailBulkSending = false; }
    });
  }

  sendRealWhatsapp(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    if (!this.hasPlanFeature('whatsappMessaging')) { this.guestError = this.featureLockedMessage('whatsappMessaging'); return; }
    if (this.whatsappProvider === 'openwa' && !this.openWaReady) {
      this.guestError = `WhatsApp no listo (${this.openWaStatus || 'desconocido'}).`;
      return;
    }
    const media = this.buildWhatsappMediaPayload();
    if (this.whatsappMedia.enabled && !media) { this.guestError = 'Selecciona media válida.'; return; }
    this.whatsappSending = guestId;
    this.guestError = '';
    this.api.sendGuestWhatsApp(guestId, { messageType: this.selectedMessageType, media }).subscribe({
      next: ({ guest: updated, provider, status }) => {
        this.guests = this.guests.map(item => this.getGuestId(item) === guestId ? updated : item);
        this.guestMessage = `WhatsApp ${status} via ${provider}.`;
        this.whatsappSending = '';
      },
      error: (err) => { this.guestError = err.error?.message || 'No se pudo enviar WhatsApp.'; this.whatsappSending = ''; }
    });
  }

  sendBulkWhatsapp(): void {
    if (!this.eventId || !this.filteredGuests.length) return;
    if (!this.hasPlanFeature('whatsappBulk')) { this.guestError = this.featureLockedMessage('whatsappBulk'); return; }
    if (this.whatsappProvider === 'openwa' && !this.openWaReady) {
      this.guestError = `WhatsApp no listo (${this.openWaStatus}).`;
      return;
    }
    const total = this.filteredGuests.filter(g => this.canWhatsappGuest(g)).length;
    if (!total || !confirm(`Enviar WhatsApp "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${total} invitado(s)?`)) return;
    const media = this.buildWhatsappMediaPayload();
    if (this.whatsappMedia.enabled && !media) { this.guestError = 'Selecciona media válida.'; return; }
    this.whatsappBulkSending = true;
    this.guestError = '';
    this.api.sendBulkWhatsApp(this.eventId, {
      confirm: true, messageType: this.selectedMessageType, media,
      guestIds: this.filteredGuests.filter(g => this.canWhatsappGuest(g)).map(g => this.getGuestId(g))
    }).subscribe({
      next: (result) => {
        this.guestMessage = `WhatsApp masivo: enviados ${result.sent}, omitidos ${result.skipped}, fallidos ${result.failed}.`;
        this.loadGuests(this.eventId);
        this.whatsappBulkSending = false;
      },
      error: (err) => { this.guestError = err.error?.message || 'Error en WhatsApp masivo.'; this.whatsappBulkSending = false; }
    });
  }

  showPendingReminders(): void {
    this.guestStatusFilter = 'pending';
    this.guestCommunicationFilter = '';
    this.selectedMessageType = 'reminder';
    this.activeTab = 'communication';
  }

  // ── WhatsApp Media ──

  buildWhatsappMediaPayload(): WhatsAppMediaPayload | undefined {
    if (!this.whatsappMedia.enabled) return undefined;
    const asset = this.whatsappMediaAssets.find(item => this.getWhatsAppMediaAssetId(item) === this.whatsappMedia.assetId);
    if (asset) {
      return { type: asset.type, url: asset.url, mimetype: asset.mimetype, filename: asset.fileName, caption: this.whatsappMedia.caption.trim() || asset.caption };
    }
    const url = this.whatsappMedia.url.trim();
    if (!url || !this.mediaInspection || this.mediaInspection.url !== url) return undefined;
    return {
      type: this.mediaInspection.type, url,
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
    const file = this.selectedWhatsappMediaFile;
    if (!this.hasPlanFeature('whatsappMedia')) { this.guestError = this.featureLockedMessage('whatsappMedia'); return; }
    if (!this.eventId || !file) { this.guestError = 'Selecciona un archivo.'; return; }
    const type = this.mediaTypeFromMime(file.type);
    if (!type) { this.guestError = 'Tipo no soportado.'; return; }
    this.whatsappMediaUploading = true;
    this.guestError = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder: 'whatsapp-media', event: this.eventId, size: file.size }).subscribe({
      next: ({ key, uploadUrl, publicUrl }) => {
        this.api.uploadAsset(uploadUrl, file).subscribe({
          next: () => {
            this.api.createWhatsAppMedia(this.eventId, { key, url: publicUrl, type, fileName: file.name, mimetype: file.type, size: file.size, caption: this.whatsappMedia.caption.trim() || undefined }).subscribe({
              next: ({ asset }) => {
                this.whatsappMediaAssets = [asset, ...this.whatsappMediaAssets];
                this.whatsappMedia.enabled = true;
                this.whatsappMedia.assetId = this.getWhatsAppMediaAssetId(asset);
                this.selectedWhatsappMediaFile = undefined;
                this.guestMessage = 'Media WhatsApp subida.';
                this.whatsappMediaUploading = false;
              },
              error: (err) => { this.guestError = err.error?.message || 'Error registrando media.'; this.whatsappMediaUploading = false; }
            });
          },
          error: () => { this.guestError = 'Error subiendo a S3.'; this.whatsappMediaUploading = false; }
        });
      },
      error: (err) => { this.guestError = err.error?.message || 'Error preparando subida.'; this.whatsappMediaUploading = false; }
    });
  }

  deleteWhatsappMedia(asset: WhatsAppMediaAssetModel): void {
    const assetId = this.getWhatsAppMediaAssetId(asset);
    if (!this.eventId || !assetId || !confirm(`¿Quitar "${asset.fileName}"?`)) return;
    this.api.deleteWhatsAppMedia(this.eventId, assetId).subscribe({
      next: () => {
        this.whatsappMediaAssets = this.whatsappMediaAssets.filter(item => this.getWhatsAppMediaAssetId(item) !== assetId);
        if (this.whatsappMedia.assetId === assetId) this.whatsappMedia.assetId = '';
      },
      error: (err) => this.guestError = err.error?.message || 'Error quitando media.'
    });
  }

  inspectWhatsappMediaUrl(): void {
    const url = this.whatsappMedia.url.trim();
    if (!url) { this.guestError = 'Agrega una URL.'; return; }
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
      error: (err) => { this.guestError = err.error?.message || 'No se pudo analizar.'; this.mediaInspecting = false; }
    });
  }

  // ── Exports ──

  exportGuests(): void {
    if (!this.eventId) return;
    if (!this.hasPlanFeature('exportData')) { this.guestError = this.featureLockedMessage('exportData'); return; }
    this.exportingGuests = true;
    this.api.exportGuests(this.eventId, { search: this.guestSearch, status: this.guestStatusFilter, communicationStatus: this.guestCommunicationFilter, group: this.guestGroupFilter }).subscribe({
      next: (blob) => { this.downloadBlob(blob, `invitados-${this.eventId}.csv`); this.exportingGuests = false; },
      error: (err) => { this.guestError = err.error?.message || 'Error exportando.'; this.exportingGuests = false; }
    });
  }

  exportRsvps(): void {
    if (!this.eventId) return;
    if (!this.hasPlanFeature('exportData')) { this.rsvpError = this.featureLockedMessage('exportData'); return; }
    this.exportingRsvps = true;
    this.api.exportRsvps(this.eventId).subscribe({
      next: (blob) => { this.downloadBlob(blob, `rsvps-${this.eventId}.csv`); this.exportingRsvps = false; },
      error: (err) => { this.rsvpError = err.error?.message || 'Error exportando.'; this.exportingRsvps = false; }
    });
  }

  // ── Songs & Dedications ──

  updateSongRequest(songRequest: SongRequestModel, status: SongRequestStatus): void {
    const songRequestId = songRequest._id || songRequest.id || '';
    if (!this.eventId || !songRequestId) return;
    this.api.updateSongRequest(this.eventId, songRequestId, status).subscribe({
      next: ({ songRequest: updated }) => {
        this.songRequests = this.songRequests.map(item => (item._id || item.id) === songRequestId ? updated : item);
        this.guestMessage = 'Solicitud actualizada.';
      },
      error: (err) => this.guestError = err.error?.message || 'Error actualizando.'
    });
  }

  updateDedication(dedication: DedicationModel, status: DedicationStatus): void {
    const dedicationId = dedication._id || dedication.id || '';
    if (!this.eventId || !dedicationId) return;
    this.api.updateDedication(this.eventId, dedicationId, status).subscribe({
      next: ({ dedication: updated }) => {
        this.dedications = this.dedications.map(item => (item._id || item.id) === dedicationId ? updated : item);
        this.guestMessage = 'Dedicatoria actualizada.';
      },
      error: (err) => this.guestError = err.error?.message || 'Error actualizando dedicatoria.'
    });
  }

  // ── Access Links ──

  createAccessLink(): void {
    if (!this.eventId) return;
    this.api.createEventAccessLink(this.eventId, this.accessLinkForm).subscribe({
      next: ({ link }) => { this.eventAccessLinks = [link, ...this.eventAccessLinks]; this.guestMessage = 'Link creado.'; },
      error: (err) => this.guestError = err.error?.message || 'Error creando link.'
    });
  }

  revokeAccessLink(link: EventAccessLinkModel): void {
    const linkId = link.id || link._id || '';
    if (!this.eventId || !linkId || !confirm('¿Revocar este link?')) return;
    this.api.revokeEventAccessLink(this.eventId, linkId).subscribe({
      next: () => { this.guestMessage = 'Link revocado.'; this.loadAccessLinks(this.eventId); },
      error: (err) => this.guestError = err.error?.message || 'Error revocando.'
    });
  }

  getNewAccessUrl(link: EventAccessLinkModel): string {
    if (link && link.url) {
      return link.url.replace('/external-access/', '/new/external-access/');
    }
    return '';
  }

  getNewCheckInUrl(url: string): string {
    if (url) {
      return url.replace('/check-in/', '/new/check-in/');
    }
    return '';
  }

  // ── Plan / Checkout ──

  checkoutPlan(pack: string): void {
    if (!this.eventId) return;
    this.checkoutLoading = pack;
    this.guestError = '';
    this.api.createCheckout({ package: pack as any, event: this.eventId }).subscribe({
      next: ({ checkoutUrl, manualPayment, message }) => {
        if (checkoutUrl) { window.location.href = checkoutUrl; return; }
        this.guestMessage = manualPayment ? (message || 'Pago manual pendiente.') : 'Solicitud registrada.';
        this.checkoutLoading = '';
      },
      error: (err) => { this.guestError = err.error?.message || 'Error en checkout.'; this.checkoutLoading = ''; }
    });
  }

  changeStatus(newStatus: EventStatus): void {
    if (!this.eventId || !this.event) return;
    this.saving = true;
    this.api.updateEvent(this.eventId, { status: newStatus }).subscribe({
      next: ({ event }) => { this.event = event; this.saving = false; },
      error: (err) => { this.error = err.error?.message || 'Error cambiando estado.'; this.saving = false; }
    });
  }

  setCommunicationStatus(guest: GuestModel, communicationStatus: GuestCommunicationStatus): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.api.markGuestCommunication(guestId, { communicationStatus }).subscribe({
      next: ({ guest: updated }) => { this.guests = this.guests.map(item => this.getGuestId(item) === guestId ? updated : item); },
      error: (err) => this.guestError = err.error?.message || 'Error actualizando seguimiento.'
    });
  }

  markMessageSent(guest: GuestModel, channel: GuestMessageChannel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.api.markGuestCommunication(guestId, { communicationStatus: 'sent', messageType: this.selectedMessageType, channel }).subscribe({
      next: ({ guest: updated }) => { this.guests = this.guests.map(item => this.getGuestId(item) === guestId ? updated : item); },
      error: (err) => this.guestError = err.error?.message || 'Error marcando envío.'
    });
  }

  // ── External Integration ──

  saveExternalConfig(): void {
    if (!this.eventId || !this.event) return;
    this.externalSaving = true;
    this.externalError = '';
    this.externalSuccess = '';
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
        allowDedications: Boolean(formValue.songRequestsDedications),
        requireApproval: Boolean(formValue.songRequestsRequireApproval)
      },
      moderationSettings: {
        notifyOnReview: Boolean(formValue.moderationNotifyOnReview),
        autoApproveAlbum: Boolean(formValue.moderationAutoApproveAlbum),
        autoApproveSongs: Boolean(formValue.moderationAutoApproveSongs),
        autoApproveDedications: Boolean(formValue.moderationAutoApproveDedications),
        autoApproveRoles: this.splitCsv(formValue.moderationAutoApproveRolesText || ''),
        autoApproveGroups: this.splitLines(formValue.moderationAutoApproveGroupsText || ''),
        autoApproveEmails: this.splitLines(formValue.moderationAutoApproveEmailsText || ''),
        autoApprovePhones: this.splitLines(formValue.moderationAutoApprovePhonesText || '')
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
    this.api.updateEvent(this.eventId, {
      externalSiteUrl: formValue.externalSiteUrl || '',
      externalSiteLabel: formValue.externalSiteLabel || '',
      externalPortalEnabled: Boolean(formValue.externalPortalEnabled),
      externalPortalSettings: { ...(this.event.externalPortalSettings || {}), welcomeMessage: formValue.welcomeMessage || undefined, brandLabel: formValue.brandLabel || undefined },
      externalContent
    }).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.syncExternalConfig(event);
        this.loadEmbedManifest(event);
        this.externalSuccess = 'Integración externa guardada.';
        this.externalSaving = false;
      },
      error: (err) => { this.externalError = err.error?.message || 'Error guardando integración.'; this.externalSaving = false; }
    });
  }

  addUrlItem(arrayName: 'carousel' | 'gallery' | 'spectacularImages', value = ''): void {
    (this.externalForm.get(arrayName) as FormArray).push(new FormControl(value));
  }

  removeArrayItem(arrayName: 'carousel' | 'gallery' | 'spectacularImages' | 'audioSections' | 'locations' | 'sections' | 'giftRegistry', index: number): void {
    (this.externalForm.get(arrayName) as FormArray).removeAt(index);
  }

  addAudioSection(value: any = {}): void {
    this.audioSectionItems.push(new FormGroup({ title: new FormControl(value.title || ''), url: new FormControl(value.url || ''), description: new FormControl(value.description || '') }));
  }

  addLocation(value: any = {}): void {
    this.locationItems.push(new FormGroup({ type: new FormControl(value.type || ''), name: new FormControl(value.name || ''), address: new FormControl(value.address || ''), mapUrl: new FormControl(value.mapUrl || ''), wazeUrl: new FormControl(value.wazeUrl || ''), notes: new FormControl(value.notes || ''), time: new FormControl(value.time || '') }));
  }

  addSection(value: any = {}): void {
    this.sectionItems.push(new FormGroup({ key: new FormControl(value.key || ''), type: new FormControl(value.type || 'text'), title: new FormControl(value.title || ''), body: new FormControl(value.body || ''), url: new FormControl(value.url || ''), imageUrl: new FormControl(value.imageUrl || ''), rolesText: new FormControl((value.roles || []).join(', ')), order: new FormControl(value.order ?? this.sectionItems.length) }));
  }

  addGift(value: any = {}): void {
    this.giftItems.push(new FormGroup({ store: new FormControl(value.store || ''), title: new FormControl(value.title || value.label || ''), label: new FormControl(value.label || ''), url: new FormControl(value.url || ''), imageUrl: new FormControl(value.imageUrl || ''), note: new FormControl(value.note || ''), priority: new FormControl(value.priority || 0) }));
  }

  uploadExternalAsset(event: Event, target: 'cover' | 'hero' | 'music' | 'carousel' | 'gallery' | 'spectacular' | 'audioSection' | 'sectionImage', index?: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.eventId) return;
    const folder = this.externalAssetFolder(target);
    const validationError = this.validateExternalAsset(file, folder);
    if (validationError) { this.externalError = validationError; input.value = ''; return; }
    this.externalAssetUploading = `${target}-${index ?? 'main'}`;
    this.externalError = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, event: this.eventId, size: file.size }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => { this.applyExternalAssetUrl(target, upload.publicUrl, index); this.externalSuccess = 'Archivo subido.'; this.externalAssetUploading = ''; input.value = ''; },
          error: () => { this.externalError = 'Error subiendo a S3.'; this.externalAssetUploading = ''; input.value = ''; }
        });
      },
      error: (err) => { this.externalError = err.error?.message || 'Error preparando subida.'; this.externalAssetUploading = ''; input.value = ''; }
    });
  }

  // ── Navigation ──

  goToSeating(): void { this.router.navigate(['/new/events', this.eventId, 'seating']); }

  // ── Helpers ──

  getGuestId(g: GuestModel): string { return (g as any)._id || (g as any).id || ''; }
  getInvitationId(inv: InvitationModel): string { return inv._id || inv.id || ''; }
  getTableId(table: EventTableModel): string { return table._id || table.id || ''; }
  getWhatsAppMediaAssetId(asset: WhatsAppMediaAssetModel): string { return asset._id || asset.id || ''; }
  getRefId(ref: any): string { if (!ref) return ''; if (typeof ref === 'string') return ref; return ref._id || ref.id || ''; }

  eventTypeIcon(type: string): string {
    return ({ boda: '💍', xv: '👑', graduacion: '🎓', cumpleanos: '🎂', bautizo: '⛪', otro: '🎉' } as any)[type] || '🎉';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatShortDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  statusPillClass(status: string): string {
    return ({ confirmed: 'success', declined: 'danger', pending: 'warning', maybe: 'info' } as any)[status] || '';
  }

  statusLabel(status: string): string {
    return ({ confirmed: 'Confirmado', declined: 'Rechazado', pending: 'Pendiente', maybe: 'Tal vez' } as any)[status] || status;
  }

  getCommunicationStatus(guest: GuestModel): GuestCommunicationStatus {
    return guest.communicationStatus || (guest.status === 'confirmed' ? 'confirmed' : 'pending');
  }

  communicationLabel(status: string): string {
    return ({ pending: 'Por enviar', sent: 'Enviado', delivered: 'Entregado', read: 'Leído', opened: 'Abierto', failed: 'Fallido', confirmed: 'Confirmado' } as any)[status] || status;
  }

  hasPlanFeature(feature: keyof PlanDefinition['limits']): boolean {
    return Boolean(this.currentPlan?.limits?.[feature]);
  }

  featureLockedMessage(feature: keyof PlanDefinition['limits']): string {
    const labels: Record<string, string> = {
      exportData: 'La exportación CSV', whatsappMessaging: 'WhatsApp', whatsappBulk: 'WhatsApp masivo',
      whatsappMedia: 'Media WhatsApp', checkIn: 'Check-in QR', seating: 'Gestión de mesas', guestAlbum: 'Álbum colaborativo'
    };
    return `${labels[String(feature)] || 'Esta función'} requiere plan premium.`;
  }

  getMessageTypeLabel(messageType?: GuestMessageType): string {
    return this.messageTemplates.find(t => t.value === messageType)?.label || 'Sin mensaje';
  }

  canWhatsappGuest(guest: GuestModel): boolean {
    return Boolean(this.toWhatsappPhone(guest.phone) && (this.primaryInvitation || this.event?.mode === 'external_dashboard'));
  }

  canSendRealWhatsapp(guest: GuestModel): boolean { return this.whatsappEnabled && this.canWhatsappGuest(guest); }
  canEmailGuest(guest: GuestModel): boolean { return Boolean(guest.email && this.primaryInvitation); }

  getWhatsappLink(guest: GuestModel): string {
    const phone = this.toWhatsappPhone(guest.phone);
    return `https://wa.me/${phone}?text=${encodeURIComponent(this.buildMessage(guest, this.selectedMessageType))}`;
  }

  getEmailLink(guest: GuestModel): string {
    const subject = this.getMessageSubject(this.selectedMessageType);
    const body = this.buildMessage(guest, this.selectedMessageType);
    return `mailto:${encodeURIComponent(guest.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  getQrImageUrl(guest: GuestModel): string {
    const value = guest.checkInCode || guest.qrCode || this.getGuestId(guest);
    return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(value)}`;
  }

  getPersonalizedPublicUrl(guest: GuestModel): string {
    const publicUrl = this.primaryInvitation ? `${window.location.origin}/i/${this.primaryInvitation.slug}` : this.externalPortalUrl;
    if (!publicUrl || !guest.invitationToken) return publicUrl;
    return `${publicUrl}?t=${encodeURIComponent(guest.invitationToken)}`;
  }

  // ── Private Load Methods ──

  private loadInvitations(eventId: string): void {
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => this.invitations = invitations.filter(i => this.getRefId(i.event) === eventId),
      error: () => this.invitations = []
    });
  }

  private loadGuests(eventId: string): void {
    this.guestsLoading = true;
    this.api.listGuests(eventId).subscribe({
      next: ({ guests }) => { this.guests = guests; this.guestsLoading = false; },
      error: () => this.guestsLoading = false
    });
  }

  private loadRsvps(eventId: string): void {
    this.rsvpsLoading = true;
    this.api.listRsvps(eventId).subscribe({
      next: ({ rsvps }) => { this.rsvps = rsvps; this.rsvpsLoading = false; },
      error: () => this.rsvpsLoading = false
    });
  }

  private loadTables(eventId: string): void {
    this.api.listTables(eventId).subscribe({ next: ({ tables }) => this.tables = tables, error: () => this.tables = [] });
  }

  private loadAlbum(eventId: string): void {
    this.api.listAlbum(eventId).subscribe({ next: ({ assets }) => this.albumAssets = assets, error: () => this.albumAssets = [] });
  }

  private loadEventMetrics(eventId: string): void {
    this.api.getEventDashboard(eventId).subscribe({ next: ({ metrics }) => this.eventMetrics = metrics, error: () => this.eventMetrics = {} });
  }

  private loadWhatsAppMedia(eventId: string): void {
    this.api.listWhatsAppMedia(eventId).subscribe({ next: ({ assets }) => this.whatsappMediaAssets = assets, error: () => this.whatsappMediaAssets = [] });
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
      error: () => { this.whatsappProvider = 'disabled'; this.whatsappEnabled = false; this.openWaReady = false; }
    });
  }

  private loadPaymentStatus(eventId: string): void {
    this.api.getPaymentStatus(eventId).subscribe({
      next: ({ eventPlanDefinition, planDefinition, eventPlanActive, eventPlanExpiresAt, subscriptionActive }) => {
        this.currentPlan = eventPlanDefinition || planDefinition;
        this.eventPlanActive = Boolean(eventPlanActive);
        this.eventPlanExpiresAt = eventPlanExpiresAt || '';
        this.subscriptionActive = Boolean(subscriptionActive);
      },
      error: () => { this.currentPlan = undefined; this.eventPlanActive = false; this.subscriptionActive = false; }
    });
  }

  private loadAccessLinks(eventId: string): void {
    this.api.listEventAccessLinks(eventId).subscribe({ next: ({ links }) => this.eventAccessLinks = links, error: () => this.eventAccessLinks = [] });
  }

  private loadSongRequests(eventId: string): void {
    this.api.listSongRequests(eventId).subscribe({ next: ({ songRequests }) => this.songRequests = songRequests, error: () => this.songRequests = [] });
  }

  private loadDedications(eventId: string): void {
    this.api.listDedications(eventId).subscribe({ next: ({ dedications }) => this.dedications = dedications, error: () => this.dedications = [] });
  }

  private loadEmbedManifest(event: EventModel): void {
    if (event.mode !== 'external_dashboard' || !event.externalPortalSlug) { this.embedManifest = undefined; return; }
    this.api.getExternalEmbedManifest(event.externalPortalSlug).subscribe({ next: (m) => this.embedManifest = m, error: () => this.embedManifest = undefined });
  }

  private syncExternalConfig(event: EventModel): void {
    const content = event.externalContent || {};
    this.externalForm.patchValue({
      externalSiteUrl: event.externalSiteUrl || '', externalSiteLabel: event.externalSiteLabel || '',
      externalPortalEnabled: event.externalPortalEnabled !== false,
      welcomeMessage: event.externalPortalSettings?.welcomeMessage || '',
      brandLabel: event.externalPortalSettings?.brandLabel || '',
      coverImageUrl: content.coverImageUrl || '', heroImageUrl: content.heroImageUrl || '', musicUrl: content.musicUrl || '',
      songRequestsEnabled: content.songRequestSettings?.enabled !== false,
      songRequestsMax: content.songRequestSettings?.maxRequestsPerGuest || 3,
      songRequestsDedications: content.songRequestSettings?.allowDedications !== false,
      songRequestsRequireApproval: content.songRequestSettings?.requireApproval !== false,
      moderationNotifyOnReview: content.moderationSettings?.notifyOnReview !== false,
      moderationAutoApproveAlbum: Boolean(content.moderationSettings?.autoApproveAlbum),
      moderationAutoApproveSongs: Boolean(content.moderationSettings?.autoApproveSongs),
      moderationAutoApproveDedications: Boolean(content.moderationSettings?.autoApproveDedications),
      moderationAutoApproveRolesText: (content.moderationSettings?.autoApproveRoles || []).join(', '),
      moderationAutoApproveGroupsText: (content.moderationSettings?.autoApproveGroups || []).join('\n'),
      moderationAutoApproveEmailsText: (content.moderationSettings?.autoApproveEmails || []).join('\n'),
      moderationAutoApprovePhonesText: (content.moderationSettings?.autoApprovePhones || []).join('\n'),
      giftEnabled: content.giftSettings?.enabled !== false,
      giftIntroText: content.giftSettings?.introText || '',
      giftShowRegistry: content.giftSettings?.showRegistry !== false,
      giftShowEnvelope: content.giftSettings?.showEnvelope !== false,
      envelopeBank: content.digitalEnvelope?.bank || '', envelopeHolder: content.digitalEnvelope?.holder || '',
      envelopeAccount: content.digitalEnvelope?.account || '', envelopeClabe: content.digitalEnvelope?.clabe || '',
      envelopeNote: content.digitalEnvelope?.note || '', envelopeQrImageUrl: content.digitalEnvelope?.qrImageUrl || '',
      dedicationsEnabled: content.dedicationSettings?.enabled !== false,
      dedicationsRequireApproval: content.dedicationSettings?.requireApproval !== false,
      dedicationsIntroText: content.dedicationSettings?.introText || ''
    });
    this.resetUrlArray(this.carouselItems, content.carousel || []);
    this.resetUrlArray(this.galleryItems, content.gallery || []);
    this.resetUrlArray(this.spectacularItems, content.spectacularImages || []);
    this.resetFormArray(this.audioSectionItems);
    (content.audioSections || []).forEach(item => this.addAudioSection(item));
    this.resetFormArray(this.locationItems);
    (content.locations || []).forEach(item => this.addLocation(item));
    this.resetFormArray(this.sectionItems);
    (content.sections || []).forEach(item => this.addSection(item));
    this.resetFormArray(this.giftItems);
    (content.giftRegistry || []).forEach(item => this.addGift(item));
  }

  // ── Private Helpers ──

  private normalizeSearch(value?: string): string {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private toWhatsappPhone(phone?: string): string {
    const normalized = (phone || '').trim().replace(/[\s().-]/g, '').replace(/^\+/, '');
    return normalized.length === 10 ? `52${normalized}` : normalized;
  }

  private getMessageSubject(messageType: GuestMessageType): string {
    const title = this.event?.title || 'Invitación';
    if (messageType === 'reminder') return `Recordatorio RSVP - ${title}`;
    if (messageType === 'event_reminder') return `Recordatorio - ${title}`;
    if (messageType === 'location_change') return `Actualización - ${title}`;
    if (messageType === 'thanks') return `Gracias - ${title}`;
    return `Invitación - ${title}`;
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
      ? [externalUrl ? `Página: ${externalUrl}` : '', publicUrl ? `RSVP: ${publicUrl}` : ''].filter(Boolean)
      : [publicUrl];

    if (messageType === 'reminder') return [`Hola ${guest.name}, confirma tu asistencia a ${eventTitle}.`, date ? `Fecha: ${date}` : '', ...links, 'Tu confirmación nos ayuda a organizar.'].filter(Boolean).join('\n\n');
    if (messageType === 'event_reminder' || messageType === 'location_change') return [`Hola ${guest.name}, recordatorio para ${eventTitle}.`, date ? `Fecha: ${date}` : '', locationLine ? `Lugar: ${locationLine}` : '', ...links].filter(Boolean).join('\n\n');
    if (messageType === 'thanks') return [`Hola ${guest.name}, gracias por confirmar a ${eventTitle}.`, date ? `Nos vemos el ${date}.` : '', locationLine ? `Lugar: ${locationLine}` : ''].filter(Boolean).join('\n\n');
    return [`Hola ${guest.name}, tu invitación digital para ${eventTitle}.`, date ? `Fecha: ${date}` : '', locationLine ? `Lugar: ${locationLine}` : '', ...links, 'Confirma tu asistencia.'].filter(Boolean).join('\n\n');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private findDuplicateGuest(excludeId?: string): { guest: GuestModel; field: 'email' | 'phone' } | undefined {
    const email = (this.guestForm.email || '').toLowerCase().trim();
    const phone = (this.guestForm.phone || '').trim().replace(/[\s().-]/g, '');
    return this.guests.reduce((found: any, g) => {
      if (found || this.getGuestId(g) === excludeId) return found;
      if (email && (g.email || '').toLowerCase().trim() === email) return { guest: g, field: 'email' };
      if (phone && (g.phone || '').trim().replace(/[\s().-]/g, '') === phone) return { guest: g, field: 'phone' };
      return undefined;
    }, undefined);
  }

  private buildGuestError(error: any, fallback: string): string {
    if (error.status === 409 && error.error?.details?.guestName) {
      const field = error.error.details.field === 'phone' ? 'teléfono' : 'correo';
      return `Ese ${field} ya pertenece a ${error.error.details.guestName}.`;
    }
    return error.error?.message || fallback;
  }

  private splitCsv(value: string): string[] {
    return (value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  }

  moveSongRequest(songRequest: SongRequestModel, direction: -1 | 1): void {
    const songRequestId = songRequest._id || songRequest.id || '';
    if (!this.eventId || !songRequestId) return;
    const currentOrder = Number(songRequest.sortOrder || 0);
    this.api.updateSongRequest(this.eventId, songRequestId, { sortOrder: currentOrder + direction }).subscribe({
      next: ({ songRequest: updated }) => {
        this.songRequests = this.songRequests
          .map(item => (item._id || item.id) === songRequestId ? updated : item)
          .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
      },
      error: (err) => this.guestError = err.error?.message || 'Error cambiando orden.'
    });
  }

  private splitLines(value: string): string[] {
    return (value || '').split('\n').map(item => item.trim()).filter(Boolean);
  }

  cleanStringList(values: string[] = []): string[] {
    return (values || []).map(item => String(item || '').trim()).filter(Boolean);
  }

  private cleanAudioSections(values: any[] = []): ExternalContent['audioSections'] {
    return (values || []).map(item => ({ title: String(item.title || '').trim() || undefined, url: String(item.url || '').trim(), description: String(item.description || '').trim() || undefined })).filter(item => item.url);
  }

  private cleanLocations(values: any[] = []): ExternalContent['locations'] {
    return (values || []).map(item => ({ type: String(item.type || '').trim() || undefined, name: String(item.name || '').trim() || undefined, address: String(item.address || '').trim() || undefined, mapUrl: String(item.mapUrl || '').trim() || undefined, wazeUrl: String(item.wazeUrl || '').trim() || undefined, notes: String(item.notes || '').trim() || undefined, time: String(item.time || '').trim() || undefined }) as any).filter((item: any) => item.name || item.address || item.mapUrl);
  }

  private cleanSections(values: any[] = []): ExternalContent['sections'] {
    return (values || []).map((item, index) => {
      const type = String(item.type || 'text').trim();
      return { key: String(item.key || '').trim() || undefined, type: ['text', 'image', 'video', 'cta', 'iframe', 'timeline', 'story', 'dress_code', 'gift_registry', 'dedications', 'lodging', 'faq', 'people'].includes(type) ? type as any : 'text', title: String(item.title || '').trim() || undefined, body: String(item.body || '').trim() || undefined, url: String(item.url || '').trim() || undefined, imageUrl: String(item.imageUrl || '').trim() || undefined, roles: this.splitCsv(item.rolesText || ''), order: item.order !== '' && item.order !== undefined && item.order !== null ? Number(item.order) : index };
    }).filter(item => item.title || item.body || item.url || item.imageUrl);
  }

  private cleanGiftRegistry(values: any[] = []): ExternalContent['giftRegistry'] {
    return (values || []).map((item, index) => ({ store: String(item.store || '').trim() || undefined, title: String(item.title || '').trim() || undefined, label: String(item.label || '').trim() || undefined, url: String(item.url || '').trim() || undefined, imageUrl: String(item.imageUrl || '').trim() || undefined, note: String(item.note || '').trim() || undefined, priority: item.priority !== '' && item.priority !== undefined && item.priority !== null ? Number(item.priority) : index })).filter(item => item.store || item.title || item.label || item.url || item.imageUrl || item.note);
  }

  private slugify(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private get apiBaseUrl(): string { return environment.apiUrl.replace(/\/$/, ''); }
  private classicWidgetUrl(widget: string): string { return this.event?.externalPortalSlug ? `${window.location.origin}/embed/${this.event.externalPortalSlug}/${widget}` : ''; }
  private classicIframeSnippet(widget: string, height: number): string { const url = this.classicWidgetUrl(widget); return url ? `<iframe src="${url}" width="100%" height="${height}" style="border:0"></iframe>` : ''; }
  private newWidgetUrl(widget: string): string { return this.event?.externalPortalSlug ? `${window.location.origin}/new/embed/${this.event.externalPortalSlug}/${widget}` : ''; }
  private newIframeSnippet(widget: string, height: number): string { const url = this.newWidgetUrl(widget); return url ? `<iframe src="${url}" width="100%" height="${height}" style="border:0"></iframe>` : ''; }
  private mediaTypeFromMime(mimetype: string): WhatsAppMediaType | '' { if (mimetype.startsWith('image/')) return 'image'; if (mimetype.startsWith('video/')) return 'video'; if (mimetype.startsWith('audio/')) return 'audio'; if (mimetype === 'application/pdf') return 'document'; return ''; }
  private resetFormArray(array: FormArray): void { while (array.length) array.removeAt(0); }
  private resetUrlArray(array: FormArray, values: string[]): void { this.resetFormArray(array); values.forEach(v => array.push(new FormControl(v))); }
  private externalAssetFolder(target: string): AssetFolder { if (target === 'music' || target === 'audioSection') return 'music'; if (target === 'cover' || target === 'hero') return 'covers'; if (target === 'sectionImage') return 'assets'; return 'gallery'; }
  private validateExternalAsset(file: File, folder: AssetFolder): string { const isMusic = folder === 'music'; const allowed = isMusic ? this.audioTypes : this.imageTypes; const max = isMusic ? this.maxAudioSize : this.maxImageSize; if (!allowed.has(file.type)) return isMusic ? 'Formato de audio no soportado.' : 'Formato de imagen no soportado.'; if (file.size > max) return isMusic ? 'Audio máximo 10MB.' : 'Imagen máxima 5MB.'; return ''; }
  private applyExternalAssetUrl(target: string, url: string, index?: number): void {
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
