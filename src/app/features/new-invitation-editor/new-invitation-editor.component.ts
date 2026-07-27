import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AssetFolder, EventAgendaItem, EventModel, InvitationLocation, InvitationModel, PaymentPackage, PlanDefinition, TemplateModel } from '../../core/models';

@Component({ selector: 'app-new-invitation-editor', templateUrl: './new-invitation-editor.component.html' })
export class NewInvitationEditorComponent implements OnInit {
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
  lodgingText = '';
  customQuestionsText = '';
  allowedRolesText = '';
  allowedGroupsText = '';
  allowedEmailsText = '';
  allowedPhonesText = '';

  activeSection = 'content';

  palettePresets = [
    { name: 'Clásico editorial', primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' },
    { name: 'Jardín elegante', primary: '#244034', secondary: '#f4f7f0', accent: '#9f6f46' },
    { name: 'Noche formal', primary: '#121826', secondary: '#f7f7fb', accent: '#c9a85d' },
    { name: 'Celebración viva', primary: '#7f1d1d', secondary: '#fff7ed', accent: '#2563eb' },
    { name: 'Rosa empolvado', primary: '#3d2c2e', secondary: '#fdf2f4', accent: '#d4a0a0' },
    { name: 'Azul cielo', primary: '#1e3a5f', secondary: '#f0f4fa', accent: '#6fa3d4' },
    { name: 'Dorado cálido', primary: '#2a1f14', secondary: '#faf5ed', accent: '#c49a3c' },
    { name: 'Verde salvia', primary: '#2d3b2d', secondary: '#f4f7f2', accent: '#8fac8f' }
  ];

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

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
          this.error = 'Invitación no encontrada.';
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
        this.error = error.error?.message || 'No se pudo cargar la invitación.';
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
    this.clearMessageAfterDelay();
  }

  applyPalette(palette: { primary: string; secondary: string; accent: string; name?: string }): void {
    if (!this.invitation) return;
    this.invitation.content.palette = {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent
    };
    this.message = palette.name ? `Estilo aplicado: ${palette.name}` : 'Estilo aplicado.';
    this.clearMessageAfterDelay();
  }

  applyTextVariant(style: 'formal' | 'warm' | 'brief'): void {
    if (!this.invitation || !this.event) return;
    const title = this.event.title;
    const hostText = this.event.hosts?.length ? this.event.hosts.join(' y ') : 'Nosotros';
    const variants = {
      formal: {
        subheadline: `${hostText} tienen el honor de invitarte`,
        message: `Será un gusto contar con tu presencia en ${title}. Te invitamos a confirmar tu asistencia y acompañarnos en esta celebración especial.`
      },
      warm: {
        subheadline: 'Queremos compartir este día contigo',
        message: `Estamos preparando ${title} con mucha ilusión. Tu presencia haría este momento aún más especial; confirma tu asistencia desde esta invitación.`
      },
      brief: {
        subheadline: 'Estás invitado',
        message: `Acompáñanos en ${title}. Confirma tu asistencia y guarda esta invitación para los detalles del evento.`
      }
    };
    this.invitation.content.subheadline = variants[style].subheadline;
    this.invitation.content.message = variants[style].message;
    this.message = 'Variante de texto aplicada.';
    this.clearMessageAfterDelay();
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
        this.message = 'Invitación guardada exitosamente.';
        this.saving = false;
        this.clearMessageAfterDelay();
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
        this.message = '¡Invitación publicada exitosamente!';
        this.publishing = false;
        this.clearMessageAfterDelay();
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
            this.error = 'S3 rechazó la subida. Revisa CORS del bucket, permisos PutObject y que el archivo coincida con el tipo permitido.';
            this.assetUploading = false;
          }
        });
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo preparar la URL de subida.';
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
      `${limits.galleryImages} imágenes`,
      limits.music ? 'música' : 'sin música',
      limits.premiumTemplates ? 'plantillas premium' : 'plantillas free',
      limits.exportData ? 'exportación' : 'sin exportación',
      limits.whatsappMessaging ? 'WhatsApp individual' : '',
      limits.whatsappBulk ? 'WhatsApp masivo' : '',
      limits.checkIn ? 'check-in QR' : '',
      limits.seating ? 'mesas' : '',
      limits.guestAlbum ? 'álbum invitados' : '',
      limits.customDomain ? 'dominio custom' : '',
      limits.whiteLabel ? 'marca blanca' : ''
    ].filter(Boolean);
    return items.join(' · ');
  }

  canCheckoutPlan(plan: PlanDefinition): boolean {
    if (plan.key === 'free') return false;
    if (this.currentPlan?.key === 'pro') return false;
    if (plan.key === 'event' && this.currentPlan?.key === 'event') return false;
    return true;
  }

  checkoutScopeText(plan: PlanDefinition): string {
    if (plan.key === 'event') return 'Aplica a este evento completo y a todas sus invitaciones.';
    if (plan.key === 'pro') return 'Aplica a toda la cuenta. Desbloquea funciones Pro para todos tus eventos.';
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
    this.invitation.content.locations!.push({ type: 'recepción', name: '', address: '', mapUrl: '', wazeUrl: '', notes: '' });
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

  toggleIdentityMethod(method: 'email' | 'phone', checked: boolean): void {
    if (!this.invitation?.rsvpSettings) return;
    const current = this.invitation.rsvpSettings.identityMethods || [];
    this.invitation.rsvpSettings.identityMethods = checked
      ? Array.from(new Set([...current, method]))
      : current.filter((item) => item !== method);
  }

  removeMusic(): void {
    if (!this.invitation) return;
    this.invitation.content.musicUrl = '';
    this.assetMessage = 'Música quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }

  removeCover(): void {
    if (!this.invitation) return;
    this.invitation.content.coverImageUrl = '';
    this.assetMessage = 'Portada quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }

  removeGalleryImage(index: number): void {
    if (!this.invitation?.content.gallery) return;
    this.invitation.content.gallery.splice(index, 1);
    this.assetMessage = 'Imagen quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }

  removePrivateAlbumImage(index: number): void {
    if (!this.invitation?.content.privateAlbum) return;
    this.invitation.content.privateAlbum.splice(index, 1);
    if (this.invitation.content.privateAlbum.length === 0) {
      this.invitation.content.privateAlbumEnabled = false;
    }
    this.assetMessage = 'Imagen del álbum quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }

  togglePrivateAlbum(): void {
    if (!this.invitation) return;
    this.invitation.content.privateAlbumEnabled = !this.invitation.content.privateAlbumEnabled;
  }

  canUsePremiumTemplates(): boolean {
    return Boolean(this.currentPlan?.limits.premiumTemplates);
  }

  canUseWhiteLabel(): boolean {
    return Boolean(this.currentPlan?.limits.whiteLabel);
  }

  onMusicPlaybackError(): void {
    this.error = 'La música está guardada, pero no se puede reproducir. Revisa permisos de lectura S3/CloudFront.';
  }

  goBackToEvent(): void {
    if (this.event) {
      this.router.navigate(['/new/events', this.getEventId()]);
    } else {
      this.router.navigate(['/new/events']);
    }
  }

  private clearMessageAfterDelay(): void {
    setTimeout(() => {
      this.message = '';
      this.assetMessage = '';
    }, 4000);
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
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = `${window.location.origin}/i/${invitation.slug}`;
        this.assetMessage = 'Asset subido y guardado.';
        this.assetUploading = false;
        this.clearMessageAfterDelay();
      },
      error: (error) => {
        this.error = error.error?.message || 'El asset subió a S3, pero no se pudo guardar en la invitación.';
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
      reminderDaysBeforeDeadline: this.invitation.rsvpSettings?.reminderDaysBeforeDeadline ?? 3,
      identityMethods: this.invitation.rsvpSettings?.identityMethods?.length ? this.invitation.rsvpSettings.identityMethods : ['email', 'phone'],
      allowCompanionsDefault: this.invitation.rsvpSettings?.allowCompanionsDefault === true,
      defaultAllowedCompanions: this.invitation.rsvpSettings?.defaultAllowedCompanions ?? 0,
      maxAttendees: this.invitation.rsvpSettings?.maxAttendees
    };
  }

  private ensureContentCollections(): void {
    if (!this.invitation) return;
    if (!this.invitation.content.gallery) this.invitation.content.gallery = [];
    if (!this.invitation.content.giftRegistry) this.invitation.content.giftRegistry = [];
    if (!this.invitation.content.giftSettings) this.invitation.content.giftSettings = { enabled: true, introText: '', showRegistry: true, showEnvelope: true };
    if (!this.invitation.content.dedicationSettings) this.invitation.content.dedicationSettings = { enabled: true, requireApproval: true, introText: '' };
    this.invitation.content.sectionSettings = {
      story: this.invitation.content.sectionSettings?.story !== false,
      locations: this.invitation.content.sectionSettings?.locations !== false,
      itinerary: this.invitation.content.sectionSettings?.itinerary !== false,
      dressCode: this.invitation.content.sectionSettings?.dressCode !== false,
      rsvp: this.invitation.content.sectionSettings?.rsvp !== false,
      giftRegistry: this.invitation.content.sectionSettings?.giftRegistry !== false,
      digitalEnvelope: this.invitation.content.sectionSettings?.digitalEnvelope !== false,
      lodging: this.invitation.content.sectionSettings?.lodging !== false,
      gallery: this.invitation.content.sectionSettings?.gallery !== false,
      guestAlbum: this.invitation.content.sectionSettings?.guestAlbum !== false,
      dedications: this.invitation.content.sectionSettings?.dedications !== false
    };
    if (!this.invitation.content.digitalEnvelope) this.invitation.content.digitalEnvelope = { bank: '', account: '', clabe: '', holder: '', note: '', qrImageUrl: '' };
    if (!this.invitation.content.itinerary) this.invitation.content.itinerary = [];
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
      identityMethods: (this.invitation.rsvpSettings.identityMethods?.length ? this.invitation.rsvpSettings.identityMethods : ['email', 'phone']) as Array<'email' | 'phone'>,
      defaultAllowedCompanions: Number(this.invitation.rsvpSettings.defaultAllowedCompanions || 0),
      maxAttendees: this.invitation.rsvpSettings.maxAttendees ? Number(this.invitation.rsvpSettings.maxAttendees) : undefined,
      allowedRoles: this.parseLines(this.allowedRolesText),
      allowedGroups: this.parseLines(this.allowedGroupsText),
      allowedEmails: this.parseLines(this.allowedEmailsText),
      allowedPhones: this.parseLines(this.allowedPhonesText),
      customQuestions: this.parseCustomQuestions()
    };
  }

  private getContentPayload() {
    if (!this.invitation) return undefined;
    return {
      ...this.invitation.content,
      itinerary: this.cleanItinerary(this.invitation.content.itinerary || []),
      locations: this.cleanLocations(this.invitation.content.locations || []),
      giftRegistry: this.cleanGiftRegistry(this.invitation.content.giftRegistry || []),
      lodging: this.parseLodging()
    };
  }

  private syncEditorTextFields(): void {
    if (!this.invitation) return;
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
    this.allowedRolesText = (this.invitation.rsvpSettings?.allowedRoles || []).join('\n');
    this.allowedGroupsText = (this.invitation.rsvpSettings?.allowedGroups || []).join('\n');
    this.allowedEmailsText = (this.invitation.rsvpSettings?.allowedEmails || []).join('\n');
    this.allowedPhonesText = (this.invitation.rsvpSettings?.allowedPhones || []).join('\n');
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

  private parseLines(text: string): string[] {
    return text.split('\n').map((value) => value.trim()).filter(Boolean);
  }
}
