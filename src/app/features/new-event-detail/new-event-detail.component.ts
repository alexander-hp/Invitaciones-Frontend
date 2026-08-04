import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  AlbumAssetModel, AssetFolder, AutoAssignStrategy, AutoAssignTablesResponse, DashboardMetrics, DedicationModel, DedicationStatus,
  EmbedManifestResponse, EventAccessLinkModel, EventAccessRole, EventModel, EventTableModel,
  EventMemberModel, EventMemberRole, EventPermission,
  ExternalContent, GuestCommunicationStatus, GuestMessageChannel, GuestMessageType, GuestModel,
  GuestPayload, InvitationModel, PaymentPackage, PlanDefinition, RsvpModel, SongRequestModel,
  SongRequestStatus, WhatsAppMediaAssetModel, WhatsAppMediaInspection, WhatsAppMediaPayload,
  WhatsAppMediaType, WhatsAppProvider, EventStatus
} from '../../core/models';
import { environment } from '../../../environments/environment';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { generateGuestPassHtml } from '../new-public-invitation/guest-pass-template';

interface MessageTemplateOption { value: GuestMessageType; label: string; }
interface WhatsAppPremiumSegmentOption { key: string; label: string; count: number; }

type Tab = 'info' | 'guests' | 'tables' | 'rsvps' | 'album' | 'communication' | 'dedications' | 'dj' | 'integration';

@Component({ selector: 'app-new-event-detail', templateUrl: './new-event-detail.component.html' })
export class NewEventDetailComponent implements OnInit {
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
  eventMembers: EventMemberModel[] = [];
  eventPermissions: EventPermission[] = [];
  rolePermissions: Record<string, EventPermission[]> = {};
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

  // Auto-assign modal state
  showAutoAssignModal = false;
  autoAssigning = false;
  autoAssignError = '';
  autoAssignResult?: AutoAssignTablesResponse;
  autoAssignForm = {
    strategy: 'by_group' as AutoAssignStrategy,
    includeConfirmed: true,
    includePending: false,
    includeDeclined: false,
    overwrite: false
  };
  importDuplicateDetails: string[] = [];
  checkInCode = '';
  checkInLink = '';
  showScanner = false;

  openScanner(): void {
    this.showScanner = true;
  }

  closeScanner(): void {
    this.showScanner = false;
  }

  onQrScanned(scannedCode: string): void {
    this.checkInCode = scannedCode;
    this.checkInGuest();
  }
  excludedGuestIds = new Set<string>();
  includePassInMessage = true;
  simulationMode = false;
  showPreviewModal = false;
  previewModalKind: 'email' | 'whatsapp' = 'email';
  previewGuest?: GuestModel;

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
  readonly whatsappPremiumMediaLimit = 30;
  whatsappBulkDeliveryMode: 'safe' | 'premium' = 'safe';
  whatsappPremiumSegmentKeys: string[] = ['role:vip', 'role:familia', 'role:padrino', 'role:dama_honor', 'role:anfitrion'];
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
  plans: PlanDefinition[] = [];
  payments: any[] = [];

  // Guest form
  showGuestForm = false;
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
  guestForm = {
    name: '', email: '', phone: '', phoneCountryCode: '+52', phoneLocal: '', group: '', groupSelect: '', rolesText: '', roleSelect: '', tagsText: '',
    relationshipLabel: '', relationshipSelect: '', visibilityGroup: '', visibilitySelect: '', tableName: '', seatLabel: '',
    allowedCompanions: 0
  };
  companionNames = '';

  // Guest form options
  defaultGroupOptions: string[] = [
    'Familia',
    'Familia de la Novia',
    'Familia del Novio',
    'Amigos',
    'Amigos de la Novia',
    'Amigos del Novio',
    'Trabajo / Colegas',
    'VIP',
    'Staff'
  ];

  get availableGroupOptions(): string[] {
    const set = new Set([...this.defaultGroupOptions, ...this.guestGroups]);
    return Array.from(set).filter(g => g && g !== 'General').sort();
  }

  relationshipOptions: string[] = [
    'Invitado',
    'Novio',
    'Novia',
    'Festejado(a)',
    'Anfitrión / Anfitriona',
    'Padrino',
    'Madrina',
    'Dama de Honor',
    'Best Man',
    'Papá de la Novia',
    'Mamá de la Novia',
    'Papá del Novio',
    'Mamá del Novio',
    'Padres',
    'Hermano / Hermana',
    'Testigo',
    'Graduado(a)',
    'VIP',
    'Staff'
  ];

  visibilityOptions: Array<{ value: string; label: string }> = [
    { value: 'general', label: 'General' },
    { value: 'familia', label: 'Familia' },
    { value: 'vip', label: 'VIP' },
    { value: 'staff', label: 'Staff' },
    { value: 'anfitriones', label: 'Anfitriones' },
    { value: 'mesa_principal', label: 'Mesa Principal' }
  ];

  roleOptions: Array<{ value: string; label: string }> = [
    { value: 'invitado', label: 'Invitado' },
    { value: 'anfitrion', label: 'Anfitrión' },
    { value: 'padrino', label: 'Padrino' },
    { value: 'dama_honor', label: 'Dama de honor' },
    { value: 'familia', label: 'Familia' },
    { value: 'graduado', label: 'Graduado' },
    { value: 'staff', label: 'Staff' },
    { value: 'vip', label: 'VIP' }
  ];

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
  memberForm = { email: '', name: '', role: 'client' as EventMemberRole, permissions: [] as EventPermission[] };
  memberRoles: Array<{ value: EventMemberRole; label: string }> = [
    { value: 'organizer', label: 'Organizador' },
    { value: 'client', label: 'Cliente' },
    { value: 'venue_owner', label: 'Dueño de salón' },
    { value: 'vendor', label: 'Proveedor' },
    { value: 'staff', label: 'Staff' },
    { value: 'dj', label: 'DJ' },
    { value: 'photographer', label: 'Fotógrafo' }
  ];

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

  // Custom HTML/CSS Upload Demo
  customHtmlCode = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación Especial</title>
</head>
<body>
  <div class="card">
    <h1>✨ Nuestra Boda Especial</h1>
    <p>¡Acompáñanos a celebrar este gran día!</p>
    <button class="btn">Confirmar Asistencia</button>
  </div>
</body>
</html>`;

  customCssCode = `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #1f2a44 0%, #0f172a 100%);
  color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
}
.card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  max-width: 420px;
}
h1 {
  color: #c9a85d;
  margin-top: 0;
}
.btn {
  background: #c9a85d;
  color: #0f172a;
  border: none;
  padding: 12px 24px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
}`;

  customValidationResult?: {
    valid: boolean;
    score: number;
    warnings: string[];
    details: {
      htmlSize: string;
      cssRulesCount: number;
      metaTagsFound: string[];
      hasDoctype: boolean;
      hasBody: boolean;
    };
    message: string;
  };
  validatingCustomCode = false;
  showCustomPagePreviewModal = false;
  customPreviewViewport: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  customPublishSubmitted = false;

  private readonly imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  private readonly audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav']);
  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly maxAudioSize = 10 * 1024 * 1024;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private confirmDialog: ConfirmDialogService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.getEvent(id).subscribe({
      next: ({ event, access }: any) => {
        if (access) event.access = access;
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
    this.loadPlans();
    this.loadAccessLinks(eventId);
    this.loadMembers(eventId);
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
    return this.primaryInvitation ? `${window.location.origin}/new/i/${this.primaryInvitation.slug}` : '';
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

  get activeRecipients(): GuestModel[] {
    return this.filteredGuests.filter(g => !this.isExcluded(g));
  }

  get exceptionCount(): number {
    return this.filteredGuests.filter(g => this.isExcluded(g)).length;
  }

  get bulkWhatsappPreview(): string {
    const guest = this.activeRecipients.find(g => this.canWhatsappGuest(g));
    if (!guest) return 'Selecciona invitados activos con teléfono para previsualizar.';
    return this.buildMessage(guest, this.selectedMessageType);
  }

  get whatsappRecipientCount(): number { return this.activeRecipients.filter(g => this.canWhatsappGuest(g)).length; }
  get whatsappMissingPhoneCount(): number { return this.activeRecipients.filter(g => !this.toWhatsappPhone(g.phone)).length; }

  get whatsappTargetGuests(): GuestModel[] {
    return this.activeRecipients.filter(g => this.canWhatsappGuest(g));
  }

  get whatsappPremiumSegmentOptions(): WhatsAppPremiumSegmentOption[] {
    const targetGuests = this.whatsappTargetGuests;
    const roleOptions = this.roleOptions
      .filter(option => option.value !== 'invitado')
      .map(option => ({
        key: `role:${option.value}`,
        label: `Rol: ${option.label}`,
        count: targetGuests.filter(guest => (guest.roles || []).includes(option.value)).length
      }));
    const groupOptions = this.guestGroups
      .filter(group => group && group !== 'General')
      .map(group => ({
        key: `group:${group}`,
        label: `Grupo: ${group}`,
        count: targetGuests.filter(guest => (guest.group || 'General') === group).length
      }));
    return [...roleOptions, ...groupOptions].filter(option => option.count > 0);
  }

  get whatsappPremiumMediaGuests(): GuestModel[] {
    if (this.whatsappBulkDeliveryMode !== 'premium') return [];
    return this.whatsappTargetGuests.filter(guest => this.guestMatchesPremiumSegments(guest));
  }

  get whatsappSafeMessageGuests(): GuestModel[] {
    if (this.whatsappBulkDeliveryMode !== 'premium') return this.whatsappTargetGuests;
    const premiumIds = new Set(this.whatsappPremiumMediaGuests.map(guest => this.getGuestId(guest)));
    return this.whatsappTargetGuests.filter(guest => !premiumIds.has(this.getGuestId(guest)));
  }

  get whatsappPremiumMediaOverLimit(): number {
    return Math.max(0, this.whatsappPremiumMediaGuests.length - this.whatsappPremiumMediaLimit);
  }

  get whatsappPremiumMediaReady(): boolean {
    return Boolean(this.buildWhatsappMediaPayload());
  }

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

  get demoInvitationUrl(): string {
    if (!this.event?.externalPortalSlug) return '';
    const slug = this.event.externalPortalSlug;
    const type = (this.event.type || 'boda').toLowerCase().trim();
    switch (type) {
      case 'boda':
        return `/assets/demo-integraciones-2.html?portal=${slug}`;
      case 'xv':
      case 'xv_anos':
      case '15_anos':
        return `/assets/demos/demo_XV.html?portal=${slug}`;
      case 'cumpleanos':
      case 'cumpleaños':
      case 'cumple':
        return `/assets/demos/demo_cumpleaños.html?portal=${slug}`;
      case 'graduacion':
      case 'graduación':
        return `/assets/demos/demo_graducion.html?portal=${slug}`;
      case 'bautizo':
        return `/assets/demos/demo_bautizo.html?portal=${slug}`;
      case 'otro':
      case 'otros':
      default:
        return `/assets/demos/demo_otros.html?portal=${slug}`;
    }
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
    this.confirmDialog.confirm({
      title: '¿Eliminar invitación?',
      message: `¿Estás seguro de que deseas eliminar la invitación "${inv.content?.headline || inv.slug}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '🗑️'
    }).then((confirmed) => {
      if (!confirmed) return;
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
    });
  }

  // ── Guest CRUD ──

  openGuestForm(guest?: GuestModel): void {
    this.editingGuest = guest;
    this.guestError = '';
    this.guestMessage = '';
    if (guest) {
      const parsedPhone = this.parsePhoneParts(guest.phone);
      const groupVal = guest.group || '';
      const groupSel = !groupVal ? '' : (this.availableGroupOptions.includes(groupVal) ? groupVal : 'otro');

      const relVal = guest.relationshipLabel || '';
      const relSel = !relVal ? '' : (this.relationshipOptions.includes(relVal) ? relVal : 'otro');

      const visVal = guest.visibilityGroup || '';
      const visSel = !visVal ? '' : (this.visibilityOptions.some(o => o.value === visVal) ? visVal : 'otro');

      const rolesVal = (guest.roles || []).join(', ');
      const roleSel = !rolesVal ? '' : (this.roleOptions.some(o => o.value === rolesVal) ? rolesVal : 'otro');

      this.guestForm = {
        name: guest.name,
        email: guest.email || '',
        phone: guest.phone || '',
        phoneCountryCode: parsedPhone.countryCode,
        phoneLocal: parsedPhone.localNumber,
        group: groupVal,
        groupSelect: groupSel,
        rolesText: rolesVal,
        roleSelect: roleSel,
        tagsText: (guest.tags || []).join(', '),
        relationshipLabel: relVal,
        relationshipSelect: relSel,
        visibilityGroup: visVal,
        visibilitySelect: visSel,
        tableName: guest.tableName || '',
        seatLabel: guest.seatLabel || '',
        allowedCompanions: guest.allowedCompanions || 0
      };
      this.companionNames = (guest.companions || []).map(c => c.name || '').filter(Boolean).join('\n');
    } else {
      this.guestForm = {
        name: '', email: '', phone: '', phoneCountryCode: '+52', phoneLocal: '', group: '', groupSelect: '', rolesText: '', roleSelect: '', tagsText: '',
        relationshipLabel: '', relationshipSelect: '', visibilityGroup: '', visibilitySelect: '', tableName: '', seatLabel: '', allowedCompanions: 0
      };
      this.companionNames = '';
    }
    this.showGuestForm = true;

    setTimeout(() => {
      const input = document.getElementById('guestNameInput') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
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

  onGroupSelectChange(): void {
    if (this.guestForm.groupSelect !== 'otro') {
      this.guestForm.group = this.guestForm.groupSelect;
    } else {
      if (this.availableGroupOptions.includes(this.guestForm.group)) {
        this.guestForm.group = '';
      }
    }
  }

  onRelationshipSelectChange(): void {
    if (this.guestForm.relationshipSelect !== 'otro') {
      this.guestForm.relationshipLabel = this.guestForm.relationshipSelect;
    } else {
      if (this.relationshipOptions.includes(this.guestForm.relationshipLabel)) {
        this.guestForm.relationshipLabel = '';
      }
    }
  }

  onVisibilitySelectChange(): void {
    if (this.guestForm.visibilitySelect !== 'otro') {
      this.guestForm.visibilityGroup = this.guestForm.visibilitySelect;
    } else {
      if (this.visibilityOptions.some(o => o.value === this.guestForm.visibilityGroup)) {
        this.guestForm.visibilityGroup = '';
      }
    }
  }

  onRoleSelectChange(): void {
    if (this.guestForm.roleSelect !== 'otro') {
      this.guestForm.rolesText = this.guestForm.roleSelect;
    } else {
      if (this.roleOptions.some(o => o.value === this.guestForm.rolesText)) {
        this.guestForm.rolesText = '';
      }
    }
  }

  saveGuest(keepOpen = false): void {
    if (!this.guestForm.name.trim()) { this.guestError = 'El nombre del invitado es obligatorio'; return; }

    const cleanLocal = (this.guestForm.phoneLocal || '').trim().replace(/\D/g, '');
    const fullPhone = cleanLocal ? `${this.guestForm.phoneCountryCode || '+52'}${cleanLocal}` : '';
    this.guestForm.phone = fullPhone;

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
        this.guestMessage = wasEditing ? `✅ Invitado "${guest.name}" actualizado.` : `🎉 ¡Invitado "${guest.name}" guardado exitosamente!`;
        this.guestSaving = false;

        if (keepOpen && !wasEditing) {
          const lastGroup = this.guestForm.group;
          const lastGroupSel = this.guestForm.groupSelect;
          const lastCode = this.guestForm.phoneCountryCode;
          const lastTable = this.guestForm.tableName;

          this.guestForm.name = '';
          this.guestForm.email = '';
          this.guestForm.phoneLocal = '';
          this.companionNames = '';
          this.guestForm.phoneCountryCode = lastCode || '+52';
          this.guestForm.group = lastGroup;
          this.guestForm.groupSelect = lastGroupSel;
          this.guestForm.tableName = lastTable;

          setTimeout(() => {
            const input = document.getElementById('guestNameInput') as HTMLInputElement;
            if (input) input.focus();
          }, 50);
        } else {
          this.showGuestForm = false;
          this.editingGuest = undefined;
        }
      },
      error: (err) => {
        this.guestError = this.buildGuestError(err, this.editingGuest ? 'No se pudo actualizar.' : 'No se pudo agregar.');
        this.guestSaving = false;
      }
    });
  }

  deleteGuest(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.confirmDialog.confirm({
      title: '¿Eliminar invitado?',
      message: `¿Estás seguro de que deseas eliminar a "${guest.name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '👤'
    }).then((confirmed) => {
      if (!confirmed) return;
      this.guestSaving = true;
      this.api.deleteGuest(guestId).subscribe({
        next: () => {
          this.guests = this.guests.filter(g => this.getGuestId(g) !== guestId);
          this.guestMessage = 'Invitado eliminado';
          this.guestSaving = false;
        },
        error: (err) => { this.guestError = err.error?.message || 'Error eliminando'; this.guestSaving = false; }
      });
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

  checkInGuest(): void {
    const rawCode = this.checkInCode.trim();
    if (!rawCode) return;
    this.guestError = '';

    const normalized = rawCode.toLowerCase();
    const candidate = this.guests.find(g =>
      [g.checkInCode, g.qrCode, g.invitationToken, g._id, g.id].some(val => (val || '').toLowerCase() === normalized)
    );
    const code = candidate ? (candidate.checkInCode || candidate.qrCode || candidate.invitationToken || this.getGuestId(candidate)) : rawCode;

    this.api.checkInGuest(code).subscribe({
      next: ({ guest }) => {
        this.guests = this.guests.map(item => this.getGuestId(item) === this.getGuestId(guest) ? guest : item);
        this.guestMessage = `${guest.name} marcado como registrado ✅`;
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
    if (!this.eventId || !tableId) return;
    this.confirmDialog.confirm({
      title: '¿Eliminar mesa?',
      message: `¿Estás seguro de que deseas eliminar la mesa "${table.name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '🪑'
    }).then((confirmed) => {
      if (!confirmed) return;
      this.api.deleteTable(this.eventId, tableId).subscribe({
        next: () => { this.tableMessage = 'Mesa eliminada.'; this.loadTables(this.eventId); },
        error: (err) => this.guestError = err.error?.message || 'No se pudo eliminar la mesa.'
      });
    });
  }

  openAutoAssignModal(): void {
    if (!this.hasPlanFeature('seating')) { this.guestError = this.featureLockedMessage('seating'); return; }
    this.showAutoAssignModal = true;
    this.autoAssignError = '';
    this.autoAssignResult = undefined;
  }

  runAutoAssign(): void {
    if (!this.eventId) return;

    const includeStatuses: string[] = [];
    if (this.autoAssignForm.includeConfirmed) includeStatuses.push('confirmed');
    if (this.autoAssignForm.includePending) includeStatuses.push('pending');
    if (this.autoAssignForm.includeDeclined) includeStatuses.push('declined');

    if (includeStatuses.length === 0) {
      this.autoAssignError = 'Debes seleccionar al menos un estado de invitado a incluir.';
      return;
    }

    this.autoAssigning = true;
    this.autoAssignError = '';
    this.autoAssignResult = undefined;

    this.api.autoAssignTables(this.eventId, {
      strategy: this.autoAssignForm.strategy,
      includeStatuses,
      overwrite: this.autoAssignForm.overwrite
    }).subscribe({
      next: (res) => {
        this.autoAssigning = false;
        this.autoAssignResult = res;
        this.tableMessage = `Asignación automática completada: ${res.assigned.length} invitados ubicados.`;
        this.loadTables(this.eventId);
        this.loadGuests(this.eventId);
        setTimeout(() => this.tableMessage = '', 4000);
      },
      error: (err) => {
        this.autoAssigning = false;
        this.autoAssignError = err.error?.message || 'Error al ejecutar la asignación automática de mesas.';
      }
    });
  }

  clearingTables = false;

  get hasAssignedGuests(): boolean {
    return this.guests.some(g => !!g.tableName);
  }

  clearAssignments(): void {
    const assigned = this.guests.filter(g => !!g.tableName && !!(g._id || g.id));
    if (assigned.length === 0) {
      this.tableMessage = 'No hay invitados con mesa asignada.';
      setTimeout(() => this.tableMessage = '', 3000);
      return;
    }

    this.confirmDialog.confirm({
      title: '¿Limpiar asignación de mesas?',
      message: `¿Estás seguro de que deseas quitar la mesa asignada a los ${assigned.length} invitados?`,
      confirmText: 'Limpiar mesas',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '🧹'
    }).then((confirmed) => {
      if (!confirmed || !this.eventId) return;
      this.clearingTables = true;
      const requests = assigned.map(g => this.api.updateGuest((g._id || g.id)!, { tableName: '', seatLabel: '' } as any));

      forkJoin(requests).subscribe({
        next: () => {
          this.clearingTables = false;
          this.tableMessage = `Se desasignaron ${assigned.length} invitados de sus mesas.`;
          this.loadTables(this.eventId!);
          this.loadGuests(this.eventId!);
          setTimeout(() => this.tableMessage = '', 4000);
        },
        error: (err) => {
          this.clearingTables = false;
          this.guestError = err.error?.message || 'Error al limpiar asignaciones de mesas.';
        }
      });
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

  // ── Simulation & Previews ──

  getQrCodeUrl(guest?: GuestModel): string {
    if (!guest) return '';
    const value = guest.checkInCode || guest.qrCode || guest.invitationToken || this.getGuestId(guest);
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}` : '';
  }

  openPreviewModal(guest?: GuestModel, kind: 'email' | 'whatsapp' = 'email'): void {
    this.previewGuest = guest || this.activeRecipients[0] || this.guests[0];
    this.previewModalKind = kind;
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
  }

  simulateSendGuest(guest: GuestModel, channel: 'email' | 'whatsapp'): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.api.markGuestCommunication(guestId, { communicationStatus: 'sent', messageType: this.selectedMessageType, channel }).subscribe({
      next: ({ guest: updated }) => {
        this.guests = this.guests.map(item => this.getGuestId(item) === guestId ? updated : item);
        this.guestMessage = `🧪 [Simulación] ${channel === 'email' ? 'Email' : 'WhatsApp'} marcado como enviado a ${guest.name}.`;
      },
      error: () => {
        guest.communicationStatus = 'sent';
        guest.lastMessageType = this.selectedMessageType;
        guest.lastMessageChannel = channel;
        this.guestMessage = `🧪 [Simulación] ${channel === 'email' ? 'Email' : 'WhatsApp'} marcado como enviado a ${guest.name}.`;
      }
    });
  }

  simulateBulkSend(channel: 'email' | 'whatsapp'): void {
    const recipients = channel === 'email'
      ? this.activeRecipients.filter(g => this.canEmailGuest(g))
      : this.activeRecipients.filter(g => this.canWhatsappGuest(g));

    if (!recipients.length) return;

    let count = 0;
    recipients.forEach(g => {
      const guestId = this.getGuestId(g);
      if (guestId) {
        this.api.markGuestCommunication(guestId, { communicationStatus: 'sent', messageType: this.selectedMessageType, channel }).subscribe({
          next: ({ guest: updated }) => {
            this.guests = this.guests.map(item => this.getGuestId(item) === guestId ? updated : item);
          }
        });
        count++;
      }
    });

    this.guestMessage = `🧪 [Simulación] ${count} ${channel === 'email' ? 'correo(s)' : 'mensaje(s) de WhatsApp'} marcados como enviados con éxito.`;
    this.openPreviewModal(recipients[0], channel);
  }

  sendRealEmail(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;

    if (this.simulationMode) {
      this.simulateSendGuest(guest, 'email');
      this.openPreviewModal(guest, 'email');
      return;
    }

    this.emailSending = guestId;
    this.guestError = '';
    this.api.sendGuestEmail(guestId, { messageType: this.selectedMessageType }).subscribe({
      next: ({ guest: updated }) => {
        this.guests = this.guests.map(item => this.getGuestId(item) === guestId ? updated : item);
        this.guestMessage = 'Email enviado con éxito.';
        this.emailSending = '';
      },
      error: (err) => {
        this.emailSending = '';
        const msg = err.error?.message || 'Servidor SMTP no configurado.';
        this.confirmDialog.confirm({
          title: 'Servidor SMTP no configurado',
          message: `${msg}\n\n¿Deseas simular el envío para probar la plantilla y el flujo del sistema?`,
          confirmText: '🧪 Simular envío',
          cancelText: 'Cerrar',
          type: 'warning',
          icon: '📧'
        }).then((confirmed) => {
          if (confirmed) {
            this.simulateSendGuest(guest, 'email');
            this.openPreviewModal(guest, 'email');
          } else {
            this.guestError = msg;
          }
        });
      }
    });
  }

  sendBulkEmail(): void {
    if (!this.eventId || !this.activeRecipients.length) return;
    const guestIds = this.activeRecipients.filter(g => this.canEmailGuest(g)).map(g => this.getGuestId(g));
    if (!guestIds.length) return;

    if (this.simulationMode) {
      this.confirmDialog.confirm({
        title: '🧪 Simulación de Email Masivo',
        message: `Se simulará el envío del correo "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${guestIds.length} invitado(s).`,
        confirmText: '🧪 Simular Envíos',
        cancelText: 'Cancelar',
        type: 'info',
        icon: '📧'
      }).then((confirmed) => {
        if (confirmed) this.simulateBulkSend('email');
      });
      return;
    }

    this.confirmDialog.confirm({
      title: '¿Enviar email masivo?',
      message: `¿Estás seguro de enviar el correo "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${guestIds.length} invitado(s) (excluyendo excepciones)?`,
      confirmText: 'Enviar masivo',
      cancelText: 'Cancelar',
      type: 'info',
      icon: '📧'
    }).then((confirmed) => {
      if (!confirmed) return;
      this.emailBulkSending = true;
      this.guestError = '';
      this.api.sendBulkEmail(this.eventId!, { confirm: true, messageType: this.selectedMessageType, guestIds }).subscribe({
        next: (result) => {
          this.guestMessage = `Email masivo: enviados ${result.sent}, fallidos ${result.failed}.`;
          this.loadGuests(this.eventId!);
          this.emailBulkSending = false;
        },
        error: (err) => {
          this.emailBulkSending = false;
          const msg = err.error?.message || 'Servidor SMTP no configurado.';
          this.confirmDialog.confirm({
            title: 'Servidor SMTP no configurado',
            message: `${msg}\n\n¿Deseas simular el envío masivo para probar el diseño y flujo?`,
            confirmText: '🧪 Simular envío masivo',
            cancelText: 'Cerrar',
            type: 'warning',
            icon: '📧'
          }).then((confirmed) => {
            if (confirmed) this.simulateBulkSend('email');
            else this.guestError = msg;
          });
        }
      });
    });
  }

  sendRealWhatsapp(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;

    if (this.simulationMode) {
      this.simulateSendGuest(guest, 'whatsapp');
      this.openPreviewModal(guest, 'whatsapp');
      return;
    }

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
      error: (err) => {
        this.whatsappSending = '';
        const msg = err.error?.message || 'WhatsApp no configurado.';
        this.confirmDialog.confirm({
          title: 'Proveedor WhatsApp no listo',
          message: `${msg}\n\n¿Deseas simular el envío para probar la previsualización del mensaje?`,
          confirmText: '🧪 Simular envío',
          cancelText: 'Cerrar',
          type: 'warning',
          icon: '📱'
        }).then((confirmed) => {
          if (confirmed) {
            this.simulateSendGuest(guest, 'whatsapp');
            this.openPreviewModal(guest, 'whatsapp');
          } else {
            this.guestError = msg;
          }
        });
      }
    });
  }

  sendBulkWhatsapp(): void {
    if (!this.eventId || !this.activeRecipients.length) return;
    const targetGuests = this.activeRecipients.filter(g => this.canWhatsappGuest(g));
    const total = targetGuests.length;
    if (!total) return;

    if (this.simulationMode) {
      this.confirmDialog.confirm({
        title: '🧪 Simular WhatsApp Masivo',
        message: `Se simulará el envío de WhatsApp "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${total} invitado(s).`,
        confirmText: '🧪 Simular Envíos',
        cancelText: 'Cancelar',
        type: 'info',
        icon: '📱'
      }).then((confirmed) => {
        if (confirmed) this.simulateBulkSend('whatsapp');
      });
      return;
    }

    if (!this.hasPlanFeature('whatsappBulk')) { this.guestError = this.featureLockedMessage('whatsappBulk'); return; }
    if (this.whatsappProvider === 'openwa' && !this.openWaReady) {
      this.guestError = `WhatsApp no listo (${this.openWaStatus}).`;
      return;
    }
    const media = this.buildWhatsappMediaPayload();
    const usePremiumMedia = this.whatsappBulkDeliveryMode === 'premium';
    const premiumGuests = usePremiumMedia ? this.whatsappPremiumMediaGuests : [];
    const safeGuests = usePremiumMedia ? this.whatsappSafeMessageGuests : targetGuests;
    if (usePremiumMedia) {
      if (!this.whatsappMedia.enabled || !media) { this.guestError = 'Para enviar imagen premium selecciona o sube una media valida.'; return; }
      if (!premiumGuests.length) { this.guestError = 'Selecciona al menos un rol o grupo para recibir imagen.'; return; }
      if (premiumGuests.length > this.whatsappPremiumMediaLimit) {
        this.guestError = `La imagen aplica maximo para ${this.whatsappPremiumMediaLimit} invitados. Quita segmentos o deja invitados fuera.`;
        return;
      }
      this.confirmDialog.confirm({
        title: 'Enviar WhatsApp premium',
        message: `Se enviara imagen a ${premiumGuests.length} invitado(s) especiales y mensaje seguro con link a ${safeGuests.length}. La pagina digital sigue siendo la experiencia principal.`,
        confirmText: 'Enviar masivo',
        cancelText: 'Cancelar',
        type: 'info',
        icon: 'ðŸ“±'
      }).then((confirmed) => {
        if (!confirmed) return;
        this.whatsappBulkSending = true;
        this.guestError = '';
        this.sendPremiumWhatsAppBulk(premiumGuests, safeGuests, media);
      });
      return;
    }
    if (this.whatsappMedia.enabled) this.whatsappMedia.enabled = false;

    this.confirmDialog.confirm({
      title: '¿Enviar WhatsApp masivo?',
      message: `¿Estás seguro de enviar WhatsApp "${this.getMessageTypeLabel(this.selectedMessageType)}" a ${total} invitado(s) (excluyendo excepciones)?`,
      confirmText: 'Enviar masivo',
      cancelText: 'Cancelar',
      type: 'info',
      icon: '📱'
    }).then((confirmed) => {
      if (!confirmed) return;
      const media = this.buildWhatsappMediaPayload();
      if (this.whatsappMedia.enabled && !media) { this.guestError = 'Selecciona media válida.'; return; }
      this.whatsappBulkSending = true;
      this.guestError = '';
      this.api.sendBulkWhatsApp(this.eventId!, {
        confirm: true, messageType: this.selectedMessageType, media,
        guestIds: targetGuests.map(g => this.getGuestId(g))
      }).subscribe({
        next: (result) => {
          this.guestMessage = `WhatsApp masivo: enviados ${result.sent}, omitidos ${result.skipped}, fallidos ${result.failed}.`;
          this.loadGuests(this.eventId!);
          this.whatsappBulkSending = false;
        },
        error: (err) => {
          this.whatsappBulkSending = false;
          const msg = err.error?.message || 'Proveedor WhatsApp no configurado.';
          this.confirmDialog.confirm({
            title: 'Proveedor WhatsApp no listo',
            message: `${msg}\n\n¿Deseas simular el envío masivo para validar las listas de seguimiento?`,
            confirmText: '🧪 Simular envío masivo',
            cancelText: 'Cerrar',
            type: 'warning',
            icon: '📱'
          }).then((confirmed) => {
            if (confirmed) this.simulateBulkSend('whatsapp');
            else this.guestError = msg;
          });
        }
      });
    });
  }

  sendPremiumWhatsAppBulk(premiumGuests: GuestModel[], safeGuests: GuestModel[], media: WhatsAppMediaPayload): void {
    this.api.sendBulkWhatsApp(this.eventId!, {
      confirm: true,
      messageType: this.selectedMessageType,
      media,
      guestIds: premiumGuests.map(g => this.getGuestId(g))
    }).subscribe({
      next: (premiumResult) => {
        if (!safeGuests.length) {
          this.guestMessage = `WhatsApp premium: enviados con imagen ${premiumResult.sent}, fallidos ${premiumResult.failed}.`;
          this.loadGuests(this.eventId!);
          this.whatsappBulkSending = false;
          return;
        }
        this.api.sendBulkWhatsApp(this.eventId!, {
          confirm: true,
          messageType: this.selectedMessageType,
          guestIds: safeGuests.map(g => this.getGuestId(g))
        }).subscribe({
          next: (safeResult) => {
            this.guestMessage = `WhatsApp enviado: imagen ${premiumResult.sent}/${premiumGuests.length}; link seguro ${safeResult.sent}/${safeGuests.length}; fallidos ${premiumResult.failed + safeResult.failed}.`;
            this.loadGuests(this.eventId!);
            this.whatsappBulkSending = false;
          },
          error: (err) => this.handleWhatsappBulkError(err)
        });
      },
      error: (err) => this.handleWhatsappBulkError(err)
    });
  }

  handleWhatsappBulkError(err: any): void {
    this.whatsappBulkSending = false;
    const msg = err.error?.message || 'Proveedor WhatsApp no configurado.';
    this.confirmDialog.confirm({
      title: 'Proveedor WhatsApp no listo',
      message: `${msg}\n\nDeseas simular el envio masivo para validar las listas de seguimiento?`,
      confirmText: 'Simular envio masivo',
      cancelText: 'Cerrar',
      type: 'warning',
      icon: 'ðŸ“±'
    }).then((confirmed) => {
      if (confirmed) this.simulateBulkSend('whatsapp');
      else this.guestError = msg;
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
            this.api.createWhatsAppMedia(this.eventId!, { key, url: publicUrl, type, fileName: file.name, mimetype: file.type, size: file.size, caption: this.whatsappMedia.caption.trim() || undefined }).subscribe({
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
    if (!this.eventId || !assetId) return;

    this.confirmDialog.confirm({
      title: '¿Quitar media de WhatsApp?',
      message: `¿Estás seguro de que deseas quitar el archivo "${asset.fileName}"?`,
      confirmText: 'Quitar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '🗑️'
    }).then((confirmed) => {
      if (!confirmed) return;
      this.api.deleteWhatsAppMedia(this.eventId!, assetId).subscribe({
        next: () => {
          this.whatsappMediaAssets = this.whatsappMediaAssets.filter(item => this.getWhatsAppMediaAssetId(item) !== assetId);
          if (this.whatsappMedia.assetId === assetId) this.whatsappMedia.assetId = '';
        },
        error: (err) => this.guestError = err.error?.message || 'Error quitando media.'
      });
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

  updateSongRequest(songRequest: SongRequestModel, status: SongRequestStatus): void {
    const songRequestId = songRequest._id || songRequest.id || '';
    if (!this.eventId || !songRequestId) return;
    if (status === 'played') {
      this.playSong(songRequest);
    }
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
    if (!this.eventId || !linkId) return;

    this.confirmDialog.confirm({
      title: '¿Revocar este link?',
      message: `¿Estás seguro de que deseas revocar el acceso "${link.label || link.role}"? Esta acción desactivará el enlace de forma permanente.`,
      confirmText: 'Sí, Revocar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '🔐'
    }).then((confirmed) => {
      if (!confirmed) return;
      this.api.revokeEventAccessLink(this.eventId, linkId).subscribe({
        next: () => { this.guestMessage = 'Link revocado.'; this.loadAccessLinks(this.eventId); },
        error: (err) => this.guestError = err.error?.message || 'Error revocando.'
      });
    });
  }

  onMemberRoleChange(): void {
    this.memberForm.permissions = [...(this.rolePermissions[this.memberForm.role] || ['view_event'] as EventPermission[])];
  }

  toggleMemberPermission(permission: EventPermission, checked: boolean): void {
    const current = new Set(this.memberForm.permissions);
    if (checked) current.add(permission);
    else current.delete(permission);
    this.memberForm.permissions = Array.from(current);
  }

  createMember(): void {
    if (!this.eventId || !this.memberForm.email.trim()) return;
    this.api.createEventMember(this.eventId, {
      email: this.memberForm.email.trim(),
      name: this.memberForm.name.trim(),
      role: this.memberForm.role,
      permissions: this.memberForm.permissions.length ? this.memberForm.permissions : undefined
    }).subscribe({
      next: ({ member }) => {
        this.eventMembers = [member, ...this.eventMembers.filter(item => (item.id || item._id) !== (member.id || member._id))];
        this.memberForm = { email: '', name: '', role: 'client', permissions: [...(this.rolePermissions['client'] || ['view_event'] as EventPermission[])] };
        this.guestMessage = member.status === 'active' ? 'Miembro agregado al evento.' : 'Invitación de miembro registrada.';
      },
      error: (err) => this.guestError = err.error?.message || 'No se pudo agregar el miembro.'
    });
  }

  updateMemberRole(member: EventMemberModel, role: EventMemberRole): void {
    const memberId = member.id || member._id || '';
    if (!this.eventId || !memberId) return;
    const permissions = this.rolePermissions[role] || member.permissions;
    this.api.updateEventMember(this.eventId, memberId, { role, permissions }).subscribe({
      next: ({ member: updated }) => {
        this.eventMembers = this.eventMembers.map(item => (item.id || item._id) === memberId ? updated : item);
        this.guestMessage = 'Permisos de miembro actualizados.';
      },
      error: (err) => this.guestError = err.error?.message || 'No se pudo actualizar el miembro.'
    });
  }

  disableMember(member: EventMemberModel): void {
    const memberId = member.id || member._id || '';
    if (!this.eventId || !memberId) return;

    this.confirmDialog.confirm({
      title: '¿Desactivar miembro?',
      message: `¿Estás seguro de que deseas desactivar a "${member.name || member.email}" de este evento? Esta acción revocará todos sus permisos permanentemente.`,
      confirmText: 'Sí, Desactivar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: '👥'
    }).then((confirmed) => {
      if (!confirmed) return;
      this.api.removeEventMember(this.eventId, memberId).subscribe({
        next: () => {
          this.eventMembers = this.eventMembers.map(item => (item.id || item._id) === memberId ? { ...item, status: 'disabled' } : item);
          this.guestMessage = 'Miembro desactivado.';
        },
        error: (err) => this.guestError = err.error?.message || 'No se pudo desactivar el miembro.'
      });
    });
  }

  memberRoleLabel(role: string): string {
    return this.memberRoles.find(item => item.value === role)?.label || role;
  }

  permissionLabel(permission: EventPermission): string {
    const labels: Record<EventPermission, string> = {
      view_event: 'Ver evento',
      edit_event: 'Editar evento',
      view_metrics: 'Ver métricas',
      manage_guests: 'Invitados',
      manage_tables: 'Mesas',
      check_in: 'Check-in',
      review_album: 'Álbum',
      review_dedications: 'Dedicatorias',
      manage_songs: 'DJ',
      view_payments: 'Pagos'
    };
    return labels[permission] || permission;
  }

  permissionsLabel(permissions: EventPermission[] = []): string {
    return permissions.map(permission => this.permissionLabel(permission)).join(' · ');
  }

  getNewAccessUrl(link: EventAccessLinkModel): string {
    if (link && link.url) {
      if (link.role === 'dj') {
        return link.url.replace('/external-access/', '/new/dj/');
      }
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
    this.guestMessage = '';
    this.api.createCheckout({ package: pack as any, event: this.eventId }).subscribe({
      next: ({ checkoutUrl, manualPayment, message }) => {
        if (checkoutUrl) { window.location.href = checkoutUrl; return; }
        this.guestMessage = manualPayment ? (message || 'Pago manual pendiente.') : (message || 'Plan activado con éxito.');
        this.checkoutLoading = '';
        this.loadPaymentStatus(this.eventId);
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

  isWhatsappPremiumSegmentSelected(key: string): boolean {
    return this.whatsappPremiumSegmentKeys.includes(key);
  }

  toggleWhatsappPremiumSegment(key: string, checked: boolean): void {
    this.whatsappPremiumSegmentKeys = checked
      ? Array.from(new Set([...this.whatsappPremiumSegmentKeys, key]))
      : this.whatsappPremiumSegmentKeys.filter(item => item !== key);
  }

  guestMatchesPremiumSegments(guest: GuestModel): boolean {
    return this.whatsappPremiumSegmentKeys.some(key => {
      const [type, value] = key.split(':');
      if (type === 'role') return (guest.roles || []).includes(value);
      if (type === 'group') return (guest.group || 'General') === value;
      return false;
    });
  }

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
    const value = guest.checkInCode || guest.qrCode || guest.invitationToken || this.getGuestId(guest);
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}` : '';
  }

  getPersonalizedPublicUrl(guest: GuestModel): string {
    const publicUrl = this.primaryInvitation ? `${window.location.origin}/new/i/${this.primaryInvitation.slug}` : this.externalPortalUrl;
    if (!publicUrl || !guest.invitationToken) return publicUrl;
    return `${publicUrl}?t=${encodeURIComponent(guest.invitationToken)}`;
  }

  getPersonalizedPassUrl(guest: GuestModel): string {
    const base = this.primaryInvitation ? `${window.location.origin}/new/i/${this.primaryInvitation.slug}` : this.newExternalPortalUrl;
    if (!base) return '';
    return guest.invitationToken ? `${base}?t=${encodeURIComponent(guest.invitationToken)}` : base;
  }

  toggleException(guest: GuestModel): void {
    const id = this.getGuestId(guest);
    if (!id) return;
    if (this.excludedGuestIds.has(id)) {
      this.excludedGuestIds.delete(id);
    } else {
      this.excludedGuestIds.add(id);
    }
  }

  isExcluded(guest: GuestModel): boolean {
    const id = this.getGuestId(guest);
    return Boolean(id && this.excludedGuestIds.has(id));
  }

  clearExceptions(): void {
    this.excludedGuestIds.clear();
  }

  selectAllRecipients(): void {
    this.excludedGuestIds.clear();
  }

  getGuestPassCleanHtml(guest?: GuestModel): string {
    if (!guest) return '';
    const rawHtml = generateGuestPassHtml({
      guestName: guest.name,
      tableName: guest.tableName,
      seatLabel: guest.seatLabel,
      allowedCompanions: guest.allowedCompanions || 1,
      qrCodeUrl: this.getQrCodeUrl(guest),
      headline: this.primaryInvitation?.content?.headline || this.event?.title || 'Invitación Digital',
      subheadline: this.primaryInvitation?.content?.subheadline || 'Pase de Entrada VIP',
      eventDateFormatted: this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
      locationAddress: this.primaryInvitation?.content?.locations?.[0]?.address || this.event?.venue?.address || this.event?.venue?.name,
      dressCode: this.primaryInvitation?.content?.dressCode,
      brandLogoUrl: this.primaryInvitation?.content?.brandLogoUrl,
      coverImageUrl: this.primaryInvitation?.content?.coverImageUrl,
      primaryColor: this.primaryInvitation?.content?.palette?.primary,
      accentColor: this.primaryInvitation?.content?.palette?.accent
    });
    return rawHtml.replace(/<script>[\s\S]*?<\/script>/gi, '');
  }

  getGuestPassSafeSrcdoc(guest?: GuestModel): SafeHtml {
    const html = this.getGuestPassCleanHtml(guest);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  downloadGuestPass(guest: GuestModel): void {
    const passHtml = generateGuestPassHtml({
      guestName: guest.name,
      tableName: guest.tableName,
      seatLabel: guest.seatLabel,
      allowedCompanions: guest.allowedCompanions || 1,
      qrCodeUrl: this.getQrCodeUrl(guest),
      headline: this.primaryInvitation?.content?.headline || this.event?.title || 'Invitación Digital',
      subheadline: this.primaryInvitation?.content?.subheadline || 'Pase de Entrada VIP',
      eventDateFormatted: this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
      locationAddress: this.primaryInvitation?.content?.locations?.[0]?.address || this.event?.venue?.address || this.event?.venue?.name,
      dressCode: this.primaryInvitation?.content?.dressCode,
      brandLogoUrl: this.primaryInvitation?.content?.brandLogoUrl,
      coverImageUrl: this.primaryInvitation?.content?.coverImageUrl,
      primaryColor: this.primaryInvitation?.content?.palette?.primary,
      accentColor: this.primaryInvitation?.content?.palette?.accent
    });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(passHtml);
      printWin.document.close();
    }
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
      next: ({ eventPlanDefinition, planDefinition, eventPlanActive, eventPlanExpiresAt, subscriptionActive, payments }) => {
        this.currentPlan = eventPlanDefinition || planDefinition;
        this.eventPlanActive = Boolean(eventPlanActive);
        this.eventPlanExpiresAt = eventPlanExpiresAt || '';
        this.subscriptionActive = Boolean(subscriptionActive);
        this.payments = payments || [];
      },
      error: () => {
        this.currentPlan = undefined;
        this.eventPlanActive = false;
        this.subscriptionActive = false;
        this.payments = [];
      }
    });
  }

  loadPlans(): void {
    this.api.listPlans().subscribe({
      next: ({ plans }) => this.plans = plans,
      error: () => this.plans = []
    });
  }

  hasPendingPayment(pack: string): boolean {
    return this.payments.some(p => p.package === pack && p.status === 'pending');
  }

  getPlanPrice(key: string): string {
    const plan = this.plans.find(p => p.key === key);
    return plan && plan.amount ? `$${Math.round(plan.amount / 100).toLocaleString('es-MX')} MXN` : '';
  }

  private loadAccessLinks(eventId: string): void {
    this.api.listEventAccessLinks(eventId).subscribe({ next: ({ links }) => this.eventAccessLinks = links, error: () => this.eventAccessLinks = [] });
  }

  private loadMembers(eventId: string): void {
    this.api.listEventMembers(eventId).subscribe({
      next: ({ members, permissions, rolePermissions }) => {
        this.eventMembers = members;
        this.eventPermissions = permissions;
        this.rolePermissions = rolePermissions;
        if (!this.memberForm.permissions.length) this.memberForm.permissions = [...(rolePermissions['client'] || ['view_event'] as EventPermission[])];
      },
      error: () => {
        this.eventMembers = [];
        this.eventPermissions = [];
        this.rolePermissions = {};
      }
    });
  }

  private loadSongRequests(eventId: string): void {
    this.api.listSongRequests(eventId).subscribe({
      next: ({ songRequests }) => this.songRequests = (songRequests || []).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
      error: () => this.songRequests = []
    });
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

  getMessageSubject(messageType: GuestMessageType): string {
    const title = this.event?.title || 'Invitación';
    if (messageType === 'reminder') return `Recordatorio RSVP - ${title}`;
    if (messageType === 'event_reminder') return `Recordatorio - ${title}`;
    if (messageType === 'location_change') return `Actualización - ${title}`;
    if (messageType === 'thanks') return `Gracias - ${title}`;
    return `Invitación - ${title}`;
  }

  buildMessage(guest: GuestModel, messageType: GuestMessageType): string {
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

    if (this.includePassInMessage) {
      links.push('🎫 Pase VIP adjunto en este mensaje');
    }

    if (messageType === 'reminder') return [`Hola ${guest.name}, confirma tu asistencia a ${eventTitle}.`, date ? `Fecha: ${date}` : '', ...links, 'Tu confirmación nos ayuda a organizar.'].filter(Boolean).join('\n\n');
    if (messageType === 'event_reminder' || messageType === 'location_change') return [`Hola ${guest.name}, recordatorio para ${eventTitle}.`, date ? `Fecha: ${date}` : '', locationLine ? `Lugar: ${locationLine}` : '', ...links].filter(Boolean).join('\n\n');
    if (messageType === 'thanks') return [`Hola ${guest.name}, gracias por confirmar a ${eventTitle}.`, date ? `Nos vemos el ${date}.` : '', locationLine ? `Lugar: ${locationLine}` : '', ...links].filter(Boolean).join('\n\n');
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

  onCustomHtmlFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.customHtmlCode = String(e.target?.result || '');
      this.validateCustomHtmlCss();
    };
    reader.readAsText(file);
  }

  onCustomCssFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.customCssCode = String(e.target?.result || '');
      this.validateCustomHtmlCss();
    };
    reader.readAsText(file);
  }

  validateCustomHtmlCss(): void {
    this.validatingCustomCode = true;
    this.customValidationResult = undefined;

    setTimeout(() => {
      const html = this.customHtmlCode || '';
      const css = this.customCssCode || '';

      const hasDoctype = /<!DOCTYPE\s+html/i.test(html);
      const hasBody = /<body[^>]*>/i.test(html) && /<\/body>/i.test(html);
      const hasHead = /<head[^>]*>/i.test(html) && /<\/head>/i.test(html);
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      const metaTags: string[] = [];
      if (titleMatch) metaTags.push(`Título: "${titleMatch[1]}"`);
      if (/viewport/i.test(html)) metaTags.push('Viewport Móvil');
      if (/charset/i.test(html)) metaTags.push('Charset UTF-8');

      const cssRulesMatches = css.match(/([^{]+)\{([^}]+)\}/g) || [];
      const cssRulesCount = cssRulesMatches.length;

      const warnings: string[] = [];
      if (!hasDoctype) warnings.push('Se recomienda incluir <!DOCTYPE html> al inicio del archivo.');
      if (!hasBody) warnings.push('No se detectaron las etiquetas <body>...</body> completas.');
      if (!hasHead) warnings.push('No se detectó el encabezado <head>...</head>.');
      if (!titleMatch) warnings.push('Falta la etiqueta <title> en la cabecera HTML.');
      if (css.trim().length === 0) warnings.push('No se ha proporcionado código de hojas de estilo CSS.');

      const score = Math.max(20, 100 - (warnings.length * 15));
      const valid = warnings.length <= 2 && html.trim().length > 20;

      const htmlSizeKb = (new Blob([html]).size / 1024).toFixed(1) + ' KB';

      this.customValidationResult = {
        valid,
        score,
        warnings,
        details: {
          htmlSize: htmlSizeKb,
          cssRulesCount,
          metaTagsFound: metaTags,
          hasDoctype,
          hasBody
        },
        message: valid
          ? '✅ HTML y CSS validados correctamente. ¡Código limpio y listo para ser publicado por KyndraSoft!'
          : '⚠️ Se encontraron observaciones en la estructura HTML/CSS.'
      };
      this.validatingCustomCode = false;
    }, 400);
  }

  getCustomPageFullHtml(): string {
    const html = this.customHtmlCode || '';
    const css = this.customCssCode || '';
    if (html.includes('</head>')) {
      return html.replace('</head>', `<style>\n${css}\n</style></head>`);
    }
    return `<!DOCTYPE html><html><head><style>\n${css}\n</style></head><body>${html}</body></html>`;
  }

  getCustomPageSafeSrcdoc(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getCustomPageFullHtml());
  }

  requestCustomPagePublish(): void {
    if (!this.customValidationResult?.valid) {
      this.validateCustomHtmlCss();
    }
    this.customPublishSubmitted = true;
  }

  getCustomAnswersList(r: RsvpModel): Array<{ label: string; value: string }> {
    const list: Array<{ label: string; value: string }> = [];

    if (r.customAnswers && r.customAnswers.length) {
      r.customAnswers.forEach(ans => {
        if (ans.value !== undefined && ans.value !== null && ans.value !== '') {
          const valStr = typeof ans.value === 'boolean' ? (ans.value ? 'Sí' : 'No') : String(ans.value);
          list.push({ label: ans.label || ans.key, value: valStr });
        }
      });
    }

    if (r.menuSelection && !list.some(i => i.label.toLowerCase().includes('menu') || i.label.toLowerCase().includes('menú'))) {
      list.push({ label: 'Menú', value: r.menuSelection });
    }
    if (r.mealPreference && !list.some(i => i.label.toLowerCase().includes('comida') || i.label.toLowerCase().includes('preferencia'))) {
      list.push({ label: 'Comida', value: r.mealPreference });
    }
    if (r.dietaryRestrictions && !list.some(i => i.label.toLowerCase().includes('alergia') || i.label.toLowerCase().includes('dieta'))) {
      list.push({ label: 'Alergias / Dieta', value: r.dietaryRestrictions });
    }

    return list;
  }



  moveSongRequest(songRequest: SongRequestModel, direction: -1 | 1): void {
    const songRequestId = songRequest._id || songRequest.id || '';
    if (!this.eventId || !songRequestId || !this.songRequests?.length) return;

    const list = [...this.songRequests];
    const idx = list.findIndex(item => (item._id || item.id) === songRequestId);
    if (idx === -1) return;

    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    // Swap items in local array instantly
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    // Assign sequential sortOrder values
    list.forEach((item, i) => item.sortOrder = i + 1);
    this.songRequests = list;

    const newOrder = list[targetIdx].sortOrder;
    this.api.updateSongRequest(this.eventId, songRequestId, { sortOrder: newOrder }).subscribe({
      next: () => {
        this.guestMessage = 'Orden de canción actualizado.';
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
