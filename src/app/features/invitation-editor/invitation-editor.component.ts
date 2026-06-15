import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AssetFolder, EventAgendaItem, EventModel, InvitationLocation, InvitationModel, PaymentPackage, PlanDefinition, TemplateModel } from '../../core/models';

@Component({ selector: 'app-invitation-editor', templateUrl: './invitation-editor.component.html' })
export class InvitationEditorComponent implements OnInit {
  private readonly imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  private readonly audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav']);
  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly maxAudioSize = 10 * 1024 * 1024;
  invitation?: InvitationModel;
  event?: EventModel;
  templates: TemplateModel[] = [];
  plans: PlanDefinition[] = [];
  currentPlan?: PlanDefinition;
  loading = false;
  saving = false;
  publishing = false;
  assetUploading = false;
  checkoutLoading = '';
  message = '';
  error = '';
  assetMessage = '';
  publicUrl = '';
  itineraryText = '';
  giftRegistryText = '';
  lodgingText = '';
  customQuestionsText = '';
  palettePresets = [
    { name: 'Clasico editorial', primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' },
    { name: 'Jardin elegante', primary: '#244034', secondary: '#f4f7f0', accent: '#9f6f46' },
    { name: 'Noche formal', primary: '#121826', secondary: '#f7f7fb', accent: '#c9a85d' },
    { name: 'Celebracion viva', primary: '#7f1d1d', secondary: '#fff7ed', accent: '#2563eb' }
  ];

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find((item) => this.getInvitationId(item) === id);
        if (!this.invitation) {
          this.error = 'Invitacion no encontrada.';
          this.loading = false;
          return;
        }
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.event = typeof this.invitation.event === 'string' ? undefined : this.invitation.event;
        this.ensureContentCollections();
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = `${window.location.origin}/i/${this.invitation.slug}`;
        this.loadTemplates();
        this.loadPlans();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar la invitacion.';
        this.loading = false;
      }
    });
  }

  loadTemplates(): void {
    this.api.listTemplates(this.event?.type).subscribe({
      next: ({ templates }) => this.templates = templates,
      error: () => this.templates = []
    });
  }

  loadPlans(): void {
    this.api.listPlans().subscribe({
      next: ({ plans }) => this.plans = plans,
      error: () => this.plans = []
    });
    this.api.getPaymentStatus(this.getEventId()).subscribe({
      next: ({ eventPlanDefinition, planDefinition }) => this.currentPlan = eventPlanDefinition || planDefinition,
      error: () => this.currentPlan = undefined
    });
  }

  applyTemplate(template: TemplateModel): void {
    if (!this.invitation) return;
    if (template.tier === 'premium' && !this.currentPlan?.limits.premiumTemplates) {
      this.error = 'Esta plantilla requiere Evento Individual o Pro.';
      return;
    }
    this.invitation.template = template._id || template.id;
    if (template.config?.palette) {
      this.invitation.content.palette = {
        ...this.invitation.content.palette,
        ...template.config.palette
      };
    }
    this.invitation.content.subheadline = template.name;
    this.message = `Plantilla seleccionada: ${template.name}`;
  }

  applyPalette(palette: { primary: string; secondary: string; accent: string; name?: string }): void {
    if (!this.invitation) return;
    this.invitation.content.palette = {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent
    };
    this.message = palette.name ? `Estilo aplicado: ${palette.name}` : 'Estilo aplicado.';
  }

  applyTextVariant(style: 'formal' | 'warm' | 'brief'): void {
    if (!this.invitation || !this.event) return;
    const title = this.event.title;
    const hostText = this.event.hosts?.length ? this.event.hosts.join(' y ') : 'Nosotros';
    const variants = {
      formal: {
        subheadline: `${hostText} tienen el honor de invitarte`,
        message: `Sera un gusto contar con tu presencia en ${title}. Te invitamos a confirmar tu asistencia y acompanarnos en esta celebracion especial.`
      },
      warm: {
        subheadline: 'Queremos compartir este dia contigo',
        message: `Estamos preparando ${title} con mucha ilusion. Tu presencia haria este momento aun mas especial; confirma tu asistencia desde esta invitacion.`
      },
      brief: {
        subheadline: 'Estas invitado',
        message: `Acompananos en ${title}. Confirma tu asistencia y guarda esta invitacion para los detalles del evento.`
      }
    };
    this.invitation.content.subheadline = variants[style].subheadline;
    this.invitation.content.message = variants[style].message;
    this.message = 'Variante de texto aplicada.';
  }

  save(): void {
    if (!this.invitation) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.api.updateInvitation(this.getInvitationId(this.invitation), {
      slug: this.invitation.slug,
      accessMode: this.invitation.accessMode,
      rsvpSettings: this.getRsvpSettingsPayload(),
      template: this.invitation.template,
      content: this.getContentPayload()
    }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureContentCollections();
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = `${window.location.origin}/i/${invitation.slug}`;
        this.message = 'Invitacion guardada.';
        this.saving = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo guardar.';
        this.saving = false;
      }
    });
  }

  publish(): void {
    if (!this.invitation) return;
    this.publishing = true;
    this.message = '';
    this.error = '';
    this.api.publishInvitation(this.getInvitationId(this.invitation)).subscribe({
      next: ({ invitation, publicUrl }) => {
        this.invitation = invitation;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureContentCollections();
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = publicUrl || `${window.location.origin}/i/${invitation.slug}`;
        this.message = 'Invitacion publicada.';
        this.publishing = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo publicar.';
        this.publishing = false;
      }
    });
  }

  selectAsset(event: Event, folder: AssetFolder): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.invitation) return;

    const validationError = this.validateAsset(file, folder);
    if (validationError) {
      this.error = validationError;
      input.value = '';
      return;
    }

    this.assetUploading = true;
    this.assetMessage = '';
    this.error = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, event: this.getEventId(), size: file.size }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            if (!this.invitation) return;
            if (folder === 'covers') this.invitation.content.coverImageUrl = upload.publicUrl;
            if (folder === 'music') this.invitation.content.musicUrl = upload.publicUrl;
            if (folder === 'gallery') this.invitation.content.gallery = [...(this.invitation.content.gallery || []), upload.publicUrl];
            if (folder === 'assets') {
              this.invitation.content.privateAlbumEnabled = true;
              this.invitation.content.privateAlbum = [...(this.invitation.content.privateAlbum || []), upload.publicUrl];
            }
            this.persistUploadedAsset();
            input.value = '';
          },
          error: () => {
            this.error = 'S3 rechazo la subida. Revisa CORS del bucket, permisos PutObject y que el archivo coincida con el tipo permitido.';
            this.assetUploading = false;
          }
        });
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo preparar la URL de subida. Revisa AWS_S3_BUCKET, MEDIA_PUBLIC_BASE_URL, region, credenciales y tipo de archivo.';
        this.assetUploading = false;
      }
    });
  }

  private validateAsset(file: File, folder: AssetFolder): string {
    const isMusic = folder === 'music';
    const allowedTypes = isMusic ? this.audioTypes : this.imageTypes;
    const maxSize = isMusic ? this.maxAudioSize : this.maxImageSize;
    if (!allowedTypes.has(file.type)) return isMusic ? 'Formato de audio no soportado.' : 'Formato de imagen no soportado.';
    if (file.size > maxSize) return isMusic ? 'El audio no debe exceder 10MB.' : 'La imagen no debe exceder 5MB.';
    return '';
  }
  checkout(pack: PaymentPackage): void {
    if (!this.invitation || pack === 'free') return;
    this.checkoutLoading = pack;
    this.error = '';
    this.api.createCheckout({ package: pack, event: this.getEventId(), invitation: this.getInvitationId(this.invitation) }).subscribe({
      next: ({ checkoutUrl, manualPayment, message }) => {
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        this.message = manualPayment ? (message || 'Pago manual registrado como pendiente.') : 'Solicitud de pago registrada.';
        this.checkoutLoading = '';
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo iniciar el checkout.';
        this.checkoutLoading = '';
      }
    });
  }

  formatPrice(plan: PlanDefinition): string {
    return plan.amount ? `$${Math.round(plan.amount / 100).toLocaleString('es-MX')} MXN` : 'Gratis';
  }

  planLimitText(plan: PlanDefinition): string {
    const limits = plan.limits;
    const items = [
      `${limits.guests} invitados`,
      `${limits.galleryImages} imagenes`,
      limits.music ? 'musica' : 'sin musica',
      limits.premiumTemplates ? 'plantillas premium' : 'plantillas free',
      limits.exportData ? 'exportacion' : 'sin exportacion',
      limits.whatsappMessaging ? 'WhatsApp individual' : '',
      limits.whatsappBulk ? 'WhatsApp masivo' : '',
      limits.checkIn ? 'check-in QR' : '',
      limits.seating ? 'mesas' : '',
      limits.guestAlbum ? 'album invitados' : '',
      limits.customDomain ? 'dominio custom' : '',
      limits.whiteLabel ? 'marca blanca' : ''
    ].filter(Boolean);
    return items.join(' - ');
  }

  canCheckoutPlan(plan: PlanDefinition): boolean {
    if (plan.key === 'free') return false;
    if (this.currentPlan?.key === 'pro') return false;
    if (plan.key === 'event' && this.currentPlan?.key === 'event') return false;
    return true;
  }

  checkoutScopeText(plan: PlanDefinition): string {
    if (plan.key === 'event') return 'Aplica a este evento completo y a todas sus invitaciones: general, damas, padrinos, familia o cualquier segmento.';
    if (plan.key === 'pro') return 'Aplica a toda la cuenta y desbloquea funciones Pro para todos tus eventos.';
    return 'Plan gratuito para pruebas iniciales.';
  }

  getInvitationId(invitation: InvitationModel): string {
    return invitation._id || invitation.id || '';
  }

  getEventId(): string {
    return this.event?._id || this.event?.id || '';
  }

  addItineraryItem(): void {
    if (!this.invitation) return;
    this.ensureContentCollections();
    this.invitation.content.itinerary!.push({ time: '', title: '', description: '' });
  }

  removeItineraryItem(index: number): void {
    if (!this.invitation?.content.itinerary) return;
    this.invitation.content.itinerary.splice(index, 1);
  }

  moveItineraryItem(index: number, direction: -1 | 1): void {
    const items = this.invitation?.content.itinerary;
    if (!items) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
  }

  addLocation(): void {
    if (!this.invitation) return;
    this.ensureContentCollections();
    this.invitation.content.locations!.push({ type: 'recepcion', name: '', address: '', mapUrl: '', wazeUrl: '', notes: '' });
  }

  removeLocation(index: number): void {
    if (!this.invitation?.content.locations) return;
    this.invitation.content.locations.splice(index, 1);
  }

  addGiftRegistryItem(): void {
    if (!this.invitation) return;
    this.ensureContentCollections();
    this.invitation.content.giftRegistry!.push({ store: '', title: '', label: '', url: '', imageUrl: '', note: '', priority: this.invitation.content.giftRegistry!.length });
  }

  removeGiftRegistryItem(index: number): void {
    if (!this.invitation?.content.giftRegistry) return;
    this.invitation.content.giftRegistry.splice(index, 1);
  }

  removeMusic(): void {
    if (!this.invitation) return;
    this.invitation.content.musicUrl = '';
    this.assetMessage = 'Musica quitada. Guarda la invitacion para confirmar el cambio.';
  }

  canUsePremiumTemplates(): boolean {
    return Boolean(this.currentPlan?.limits.premiumTemplates);
  }

  canUseWhiteLabel(): boolean {
    return Boolean(this.currentPlan?.limits.whiteLabel);
  }

  onMusicPlaybackError(): void {
    this.error = 'La musica esta guardada, pero no se puede reproducir. Revisa permisos de lectura S3/CloudFront, MEDIA_PUBLIC_BASE_URL y CORS.';
  }

  private persistUploadedAsset(): void {
    if (!this.invitation) return;
    this.api.updateInvitation(this.getInvitationId(this.invitation), {
      slug: this.invitation.slug,
      accessMode: this.invitation.accessMode,
      rsvpSettings: this.getRsvpSettingsPayload(),
      template: this.invitation.template,
      content: this.getContentPayload()
    }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureContentCollections();
        this.ensureContentCollections();
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = `${window.location.origin}/i/${invitation.slug}`;
        this.assetMessage = 'Asset subido y guardado en la invitacion.';
        this.assetUploading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'El asset subio a S3, pero no se pudo guardar en la invitacion.';
        this.assetUploading = false;
      }
    });
  }

  private ensureRsvpSettings(): void {
    if (!this.invitation) return;
    this.invitation.rsvpSettings = {
      deadline: this.invitation.rsvpSettings?.deadline,
      allowMaybe: this.invitation.rsvpSettings?.allowMaybe !== false,
      allowChangesUntilDeadline: this.invitation.rsvpSettings?.allowChangesUntilDeadline !== false,
      declineRequiresConfirmation: this.invitation.rsvpSettings?.declineRequiresConfirmation !== false,
      reminderDaysBeforeDeadline: this.invitation.rsvpSettings?.reminderDaysBeforeDeadline ?? 3
    };
  }

  private ensureContentCollections(): void {
    if (!this.invitation) return;
    if (!this.invitation.content.gallery) this.invitation.content.gallery = [];
    if (!this.invitation.content.giftRegistry) this.invitation.content.giftRegistry = [];
    if (!this.invitation.content.giftSettings) this.invitation.content.giftSettings = { enabled: true, introText: '', showRegistry: true, showEnvelope: true };
    if (!this.invitation.content.dedicationSettings) this.invitation.content.dedicationSettings = { enabled: true, requireApproval: true, introText: '' };
    if (!this.invitation.content.digitalEnvelope) this.invitation.content.digitalEnvelope = { bank: '', account: '', clabe: '', holder: '', note: '', qrImageUrl: '' };
    if (!this.invitation.content.itinerary) this.invitation.content.itinerary = this.parseItinerary();
    if (!this.invitation.content.locations) {
      const venue = this.event?.venue;
      this.invitation.content.locations = venue?.name || venue?.address || venue?.mapUrl
        ? [{ type: 'principal', name: venue.name || '', address: venue.address || '', mapUrl: venue.mapUrl || '', wazeUrl: '', notes: '' }]
        : [];
    }
  }

  private getRsvpSettingsPayload() {
    if (!this.invitation?.rsvpSettings) return undefined;
    return {
      ...this.invitation.rsvpSettings,
      deadline: this.invitation.rsvpSettings.deadline || undefined,
      reminderDaysBeforeDeadline: Number(this.invitation.rsvpSettings.reminderDaysBeforeDeadline ?? 3),
      customQuestions: this.parseCustomQuestions()
    };
  }

  private getContentPayload() {
    if (!this.invitation) return undefined;
    return {
      ...this.invitation.content,
      itinerary: this.cleanItinerary(this.invitation.content.itinerary || this.parseItinerary()),
      locations: this.cleanLocations(this.invitation.content.locations || []),
      giftRegistry: this.cleanGiftRegistry(this.invitation.content.giftRegistry || []),
      lodging: this.parseLodging()
    };
  }

  private syncEditorTextFields(): void {
    if (!this.invitation) return;
    this.itineraryText = (this.invitation.content.itinerary || [])
      .map((item) => [item.time, item.title, item.description].filter(Boolean).join(' | '))
      .join('\n');
    this.giftRegistryText = '';
    this.lodgingText = (this.invitation.content.lodging || [])
      .map((item) => [item.name, item.description, item.url].filter(Boolean).join(' | '))
      .join('\n');
    this.customQuestionsText = (this.invitation.rsvpSettings?.customQuestions || [])
      .map((question) => [
        question.label,
        question.type || 'text',
        question.required ? 'required' : '',
        (question.options || []).join(';')
      ].filter((value) => value !== '').join(' | '))
      .join('\n');
  }

  private parseItinerary() {
    return this.itineraryText.split('\n').map((line) => {
      const [time, title, description] = line.split('|').map((part) => part.trim());
      return { time, title, description };
    }).filter((item) => item.time || item.title || item.description);
  }

  private cleanItinerary(items: Array<Partial<EventAgendaItem>>) {
    return items
      .map((item) => ({
        time: String(item.time || '').trim(),
        title: String(item.title || '').trim(),
        description: String(item.description || '').trim()
      }))
      .filter((item) => item.time || item.title || item.description);
  }

  private cleanLocations(items: InvitationLocation[]) {
    return items
      .map((item) => ({
        type: String(item.type || '').trim(),
        name: String(item.name || '').trim(),
        address: String(item.address || '').trim(),
        mapUrl: String(item.mapUrl || '').trim(),
        wazeUrl: String(item.wazeUrl || '').trim(),
        notes: String(item.notes || '').trim()
      }))
      .filter((item) => item.type || item.name || item.address || item.mapUrl || item.wazeUrl || item.notes);
  }

  private parsePairs(text: string, labelKey: 'label') {
    return text.split('\n').map((line) => {
      const [label, url] = line.split('|').map((part) => part.trim());
      return { [labelKey]: label, url };
    }).filter((item) => item.label || item.url);
  }

  private cleanGiftRegistry(values: any[] = []) {
    return (values || []).map((item, index) => ({
      store: String(item.store || '').trim() || undefined,
      title: String(item.title || '').trim() || undefined,
      label: String(item.label || item.title || item.store || '').trim() || undefined,
      url: String(item.url || '').trim() || undefined,
      imageUrl: String(item.imageUrl || '').trim() || undefined,
      note: String(item.note || '').trim() || undefined,
      priority: item.priority !== '' && item.priority !== undefined && item.priority !== null ? Number(item.priority) : index
    })).filter((item) => item.store || item.title || item.label || item.url || item.imageUrl || item.note);
  }

  private parseLodging() {
    return this.lodgingText.split('\n').map((line) => {
      const [name, description, url] = line.split('|').map((part) => part.trim());
      return { name, description, url };
    }).filter((item) => item.name || item.description || item.url);
  }

  private parseCustomQuestions() {
    return this.customQuestionsText.split('\n').map((line, index) => {
      const [label, type, required, options] = line.split('|').map((part) => part.trim());
      return {
        key: label ? label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `pregunta_${index + 1}` : `pregunta_${index + 1}`,
        label,
        type: ['text', 'textarea', 'select', 'boolean'].includes(type) ? type as 'text' | 'textarea' | 'select' | 'boolean' : 'text',
        required: required === 'required' || required === 'si' || required === 'true',
        options: options ? options.split(';').map((option) => option.trim()).filter(Boolean) : []
      };
    }).filter((question) => question.label);
  }
}
