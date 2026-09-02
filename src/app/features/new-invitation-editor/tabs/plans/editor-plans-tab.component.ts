import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InvitationModel, EventModel, TemplateModel, PlanDefinition, PaymentPackage, CustomTemplateSubmission } from '../../../../core/models';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';

@Component({
  selector: 'app-editor-plans-tab',
  templateUrl: './editor-plans-tab.component.html'
})
export class EditorPlansTabComponent implements OnInit, OnChanges, OnDestroy {
  @Input() invitation!: InvitationModel;
  @Input() event?: EventModel;
  @Input() templates: TemplateModel[] = [];
  @Input() plans: PlanDefinition[] = [];
  @Input() currentPlan?: PlanDefinition;
  @Input() checkoutLoading = '';
  @Input() payments: any[] = [];

  @Output() applyTemplate = new EventEmitter<TemplateModel>();
  @Output() checkout = new EventEmitter<PaymentPackage>();
  @Output() selectTemplateKey = new EventEmitter<string>();
  @Output() saveChanges = new EventEmitter<void>();
  @Output() openAiWizard = new EventEmitter<void>();
  @Output() openTextEditor = new EventEmitter<{ templateKey: string; submission?: CustomTemplateSubmission; clean?: boolean } | string>();

  // Custom submissions / Edited routine cards
  customSubmissions: CustomTemplateSubmission[] = [];
  loadingSubmissions = false;
  activeFilterTab: 'all' | 'builtin' | 'custom' = 'all';

  // Live preview & Plan collapse states
  planCollapsed = true; // Section starts collapsed as requested
  previewViewport: 'mobile' | 'desktop' = 'mobile';
  previewRefreshKey = Date.now();
  iframeLoading = true;

  // Toasts
  message = '';
  error = '';
  private messageTimeout?: any;
  private errorTimeout?: any;

  builtinTemplates = [
    {
      id: 'envelope-cards',
      name: 'Sobre Interactivo & Cards Deslizables',
      badge: 'Recomendado Móvil',
      description: 'Apertura animada de sobrecito digital con sello, verificación opcional de acceso (correo/teléfono), fondo de boda elegante y tarjetas independientes deslizables a izquierda/derecha.',
      iconKey: 'envelope',
      features: ['Sobre 3D animado', 'Navegación por Swipe (Tarjetas)', 'Autenticación en sobre', 'Optimizado Celulares']
    },
    {
      id: 'classic-vertical',
      name: 'Clásica Editorial Vertical',
      badge: 'Estándar',
      description: 'Formato editorial continuo de scroll vertical. Diseño clásico con tipografía limpia y secciones de lectura secuencial.',
      iconKey: 'classic',
      features: ['Scroll vertical continuo', 'Portada hero amplia', 'Lectura secuencial', 'Excelente en Escritorio']
    },
    {
      id: 'modern-minimal',
      name: 'Plantilla 3: Glamour Moderno & Minimal',
      badge: 'Plantilla 3',
      description: 'Diseño vanguardista con estética limpia, tarjetas flotantes glassmorphism, hero interactivo, timeline moderno y animación fluida.',
      iconKey: 'modern',
      features: ['Estilo Glassmorphism', 'Diseño Minimalista & Lujo', 'Hero interactivo', 'Optimizada Móvil & Desktop']
    },
    {
      id: 'boda-mobile-first',
      name: 'Boda Mobile-First (Story Vertical)',
      badge: 'Nueva &bull; Móvil',
      description: 'Experiencia inmersiva vertical tipo Story móvil con microinteracciones táctiles, barra FAB flotante inferior (RSVP y mapa directo), animaciones suaves on-scroll (AOS) y destellos de confeti dorado.',
      iconKey: 'envelope',
      features: ['Formato vertical tipo Story', 'Barra FAB flotante fija', 'Efectos on-scroll AOS', 'Confeti dorado de celebración']
    },
    {
      id: 'boda-desktop-first',
      name: 'Boda Desktop-First (Revista Editorial)',
      badge: 'Nueva &bull; Editorial',
      description: 'Diseño estilo revista editorial de alta gama para pantallas anchas y portátiles, con tipografía monumental Cinzel y Cormorant Garamond, composiciones asimétricas y total adaptabilidad responsiva a celulares.',
      iconKey: 'classic',
      features: ['Layout editorial tipo revista', 'Tipografía monumental de gala', 'Dípticos y grids asimétricos', '100% responsiva']
    },
    {
      id: 'boda-cards-lateral',
      name: 'Boda Cards Lateral (App Deck Deslizable)',
      badge: 'Innovación &bull; Swipe',
      description: 'Presentación horizontal tipo App con swipe táctil a pantalla completa, flechas de navegación y paginación de puntos que rompe el esquema tradicional de scroll vertical.',
      iconKey: 'envelope',
      features: ['Deck horizontal deslizable', 'Navegación por Swipe táctil', '16 diapositivas completas', 'Controles interactivos']
    },
    {
      id: 'boda-creativa-premium',
      name: 'Boda Creativa Premium (Royal Cinematic)',
      badge: 'Exclusiva &bull; Súper Lujo',
      description: 'Atmósfera cinematográfica nocturna de alta costura con auroras doradas en movimiento, tarjetas esmeriladas en arco de catedral, tipografía de oro líquido y animaciones GSAP de máximo impacto.',
      iconKey: 'modern',
      features: ['Estética Royal Cinematic', 'Arcos de catedral esmerilados', 'Microinteracciones GSAP', 'Efectos de oro líquido']
    }
  ];

  constructor(
    private apiService: ApiService,
    private confirmDialog: ConfirmDialogService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadCustomSubmissions();
    this.updateLivePreviewUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['invitation'] || changes['event']) {
      this.loadCustomSubmissions();
      this.updateLivePreviewUrl();
    }
  }

  ngOnDestroy(): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
  }

  showSuccess(msg: string): void {
    this.message = msg;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => { this.message = ''; }, 3500);
  }

  showError(msg: string): void {
    this.error = msg;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => { this.error = ''; }, 4000);
  }

  loadCustomSubmissions(): void {
    this.loadingSubmissions = true;
    const slug = this.invitation?.slug;
    const eventId = typeof this.invitation?.event === 'string'
      ? this.invitation.event
      : (this.invitation?.event as any)?._id || this.event?.id || this.event?._id;
    const invId = this.invitation?._id || this.invitation?.id;

    this.apiService.listCustomTemplateSubmissions().subscribe({
      next: res => {
        const all = res.submissions || [];
        const remoteFiltered = all.filter(s => {
          if (slug && s.eventSlug === slug) return true;
          if (eventId && s.eventId === eventId) return true;
          if (invId && s.invitationId === invId) return true;
          return false;
        });

        const local = this.apiService.getLocalCustomSubmissions();
        const localFiltered = local.filter(s => {
          if (slug && s.eventSlug === slug) return true;
          if (eventId && s.eventId === eventId) return true;
          if (invId && s.invitationId === invId) return true;
          return false;
        });

        const mergedMap = new Map<string, CustomTemplateSubmission>();
        remoteFiltered.forEach(s => {
          const id = s.id || s._id;
          if (id) mergedMap.set(id, s);
        });
        localFiltered.forEach(s => {
          const id = s.id || s._id;
          if (id) {
            const existing = mergedMap.get(id);
            if (!existing || (s.editedTexts && Object.keys(s.editedTexts).length > 0)) {
              mergedMap.set(id, s);
            }
          }
        });

        this.customSubmissions = Array.from(mergedMap.values());
        this.loadingSubmissions = false;
        this.updateLivePreviewUrl();
      },
      error: () => {
        const local = this.apiService.getLocalCustomSubmissions();
        this.customSubmissions = local.filter(s => {
          if (slug && s.eventSlug === slug) return true;
          if (eventId && s.eventId === eventId) return true;
          if (invId && s.invitationId === invId) return true;
          return false;
        });
        this.loadingSubmissions = false;
        this.updateLivePreviewUrl();
      }
    });
  }

  get totalTemplatesCount(): number {
    return this.builtinTemplates.length + this.customSubmissions.length;
  }

  get approvedCustomCount(): number {
    return this.customSubmissions.filter(s => s.status === 'approved').length;
  }

  get pendingCustomCount(): number {
    return this.customSubmissions.filter(s => s.status === 'pending').length;
  }

  get activeCustomSubmissionId(): string | null {
    if (this.invitation?.content?.activeCustomTemplateId) {
      return this.invitation.content.activeCustomTemplateId;
    }
    // Check if customHtml saved in backend database contains sub ID marker
    const customHtml = this.invitation?.content?.customHtml;
    if (customHtml) {
      const match = customHtml.match(/<!--\s*custom_sub_id:([a-zA-Z0-9_\-]+)\s*-->/);
      if (match && match[1]) {
        return match[1];
      }
      const found = this.customSubmissions.find(s => {
        const sid = s.id || s._id;
        if (!sid) return false;
        if (s.htmlCode && (s.htmlCode.trim() === customHtml.trim() || customHtml.includes(sid))) return true;
        return false;
      });
      if (found) {
        return found.id || found._id || null;
      }
    }

    const invId = this.invitation?._id || this.invitation?.id;
    const slug = this.invitation?.slug;
    const fromStorage = (slug ? localStorage.getItem(`inv_active_sub_${slug}`) : null) ||
                        (invId ? localStorage.getItem(`inv_active_sub_${invId}`) : null);
    if (fromStorage) return fromStorage;

    if (slug && typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp(`(^|;\\s*)inv_active_sub_${slug}=([^;]+)`));
      if (match) return match[2];
    }
    return null;
  }

  get currentTemplateKey(): string {
    const invId = this.invitation?._id || this.invitation?.id;
    const slug = this.invitation?.slug;
    const stored = (invId ? localStorage.getItem(`inv_tpl_${invId}`) : null) || (slug ? localStorage.getItem(`inv_tpl_${slug}`) : null);
    return this.invitation?.content?.template || stored || 'envelope-cards';
  }

  isBuiltinActive(tplId: string): boolean {
    const activeSubId = this.activeCustomSubmissionId;
    if (activeSubId) {
      const activeSub = this.customSubmissions.find(s => (s.id || s._id) === activeSubId);
      if (activeSub) {
        return false;
      }
    }
    const current = this.currentTemplateKey;
    if (tplId === 'modern-minimal' && (current === 'modern-minimal' || current === 'template-3' || current === 'plantilla-3')) {
      return true;
    }
    return current === tplId;
  }

  isCustomSubmissionActive(sub: CustomTemplateSubmission): boolean {
    const subId = sub.id || sub._id;
    const activeSubId = this.activeCustomSubmissionId;
    return activeSubId === subId;
  }

  /**
   * Activates a clean base template for this invitation, removing custom overlays.
   */
  setBuiltinTemplate(key: string): void {
    if (!this.invitation) return;
    if (!this.invitation.content) this.invitation.content = {};

    // Clear custom template overrides
    delete this.invitation.content.activeCustomTemplateId;
    delete this.invitation.content.editedTexts;
    delete this.invitation.content.customHtml;
    delete this.invitation.content.customCss;
    delete this.invitation.content.customPageApproved;
    delete this.invitation.content.sourceTemplateKey;
    delete this.invitation.template;

    this.invitation.content.template = key;

    const invId = this.invitation._id || this.invitation.id;
    const slug = this.invitation.slug;
    if (slug) {
      localStorage.setItem(`inv_tpl_${slug}`, key);
      localStorage.removeItem(`inv_active_sub_${slug}`);
      localStorage.removeItem(`inv_edited_texts_${slug}`);
      localStorage.removeItem(`inv_custom_html_${slug}`);
      localStorage.removeItem(`inv_custom_css_${slug}`);
      localStorage.removeItem(`custom_template_html_${slug}`);
      localStorage.removeItem(`custom_template_css_${slug}`);
      if (typeof document !== 'undefined') {
        document.cookie = `inv_active_sub_${slug}=; path=/; max-age=0`;
      }
    }
    if (invId) {
      localStorage.setItem(`inv_tpl_${invId}`, key);
      localStorage.removeItem(`inv_active_sub_${invId}`);
    }

    this.selectTemplateKey.emit(key);
    this.saveChanges.emit();
    this.showSuccess(`Plantilla base "${this.getBuiltinName(key)}" activada.`);
    this.refreshPreview();
  }

  /**
   * Activates a custom edited routine or AI generated template.
   */
  setCustomSubmission(sub: CustomTemplateSubmission): void {
    if (!this.invitation) return;
    if (!this.invitation.content) this.invitation.content = {};

    const subId = sub.id || sub._id || '';
    this.invitation.content.activeCustomTemplateId = subId;
    this.invitation.content.sourceTemplateKey = sub.sourceTemplateKey;
    this.invitation.content.editedTexts = sub.editedTexts;

    let htmlCode = sub.htmlCode || '';
    if (htmlCode && !htmlCode.includes('custom_sub_id:')) {
      htmlCode = `<!-- custom_sub_id:${subId} -->\n` + htmlCode;
    }
    this.invitation.content.customHtml = htmlCode;
    this.invitation.content.customCss = sub.cssCode;
    this.invitation.content.customPageApproved = sub.status === 'approved';

    const targetTpl = sub.sourceTemplateKey || 'custom-html';
    this.invitation.content.template = targetTpl;

    const slug = this.invitation.slug;
    const invId = this.invitation._id || this.invitation.id;

    if (slug) {
      localStorage.setItem(`inv_active_sub_${slug}`, subId);
      if (typeof document !== 'undefined') {
        document.cookie = `inv_active_sub_${slug}=${encodeURIComponent(subId)}; path=/; max-age=31536000`;
      }

      if (sub.editedTexts && Object.keys(sub.editedTexts).length > 0 && sub.sourceTemplateKey) {
        localStorage.setItem(`inv_edited_texts_${slug}`, JSON.stringify(sub.editedTexts));
        localStorage.setItem(`inv_source_tpl_${slug}`, sub.sourceTemplateKey);
        localStorage.setItem(`inv_tpl_${slug}`, sub.sourceTemplateKey);
        localStorage.removeItem(`inv_custom_html_${slug}`);
      } else {
        localStorage.setItem(`inv_custom_html_${slug}`, htmlCode);
        localStorage.setItem(`inv_custom_css_${slug}`, sub.cssCode || '');
        localStorage.setItem(`inv_tpl_${slug}`, 'custom-html');
      }
    }
    if (invId) {
      localStorage.setItem(`inv_active_sub_${invId}`, subId);
      localStorage.setItem(`inv_tpl_${invId}`, targetTpl);
    }

    this.selectTemplateKey.emit(targetTpl);
    this.saveChanges.emit();
    this.showSuccess(`Versión personalizada "${sub.name}" seleccionada.`);
    this.refreshPreview();
  }

  togglePlanCollapsed(): void {
    this.planCollapsed = !this.planCollapsed;
  }

  get activeTemplateDisplayName(): string {
    const activeSubId = this.activeCustomSubmissionId;
    if (activeSubId) {
      const foundSub = this.customSubmissions.find(s => (s.id || s._id) === activeSubId);
      if (foundSub) return foundSub.name;
    }
    const currentKey = this.currentTemplateKey;
    return this.getBuiltinName(currentKey);
  }

  livePreviewUrl: SafeResourceUrl | null = null;
  private lastPreviewUrlString = '';

  updateLivePreviewUrl(forceRefresh = false): void {
    if (!this.invitation?.slug) {
      this.livePreviewUrl = null;
      this.lastPreviewUrlString = '';
      return;
    }
    const slug = this.invitation.slug;
    const currentKey = this.currentTemplateKey;
    const activeSubId = this.activeCustomSubmissionId;

    if (forceRefresh) {
      this.previewRefreshKey = Date.now();
    }

    let rawUrl = `${window.location.origin}/new/i/${slug}?tpl=${encodeURIComponent(currentKey)}&preview=true`;
    if (activeSubId) {
      rawUrl += `&subId=${encodeURIComponent(activeSubId)}`;
    } else {
      rawUrl += `&clean=1`;
    }
    rawUrl += `&_v=${this.previewRefreshKey}`;

    if (rawUrl !== this.lastPreviewUrlString) {
      this.lastPreviewUrlString = rawUrl;
      this.livePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    }
  }

  refreshPreview(): void {
    this.iframeLoading = true;
    this.updateLivePreviewUrl(true);
  }

  onIframeLoad(): void {
    this.iframeLoading = false;
  }

  openLivePreviewWindow(): void {
    if (!this.invitation?.slug) return;
    const currentKey = this.currentTemplateKey;
    const activeSubId = this.activeCustomSubmissionId;
    let url = `/new/i/${this.invitation.slug}?tpl=${encodeURIComponent(currentKey)}&preview=true`;
    if (activeSubId) {
      url += `&subId=${encodeURIComponent(activeSubId)}`;
    } else {
      url += `&clean=1`;
    }
    window.open(url, '_blank');
  }

  getBuiltinName(key: string): string {
    const found = this.builtinTemplates.find(t => t.id === key);
    return found ? found.name : key;
  }

  getEditedTextsCount(sub: CustomTemplateSubmission): number {
    return sub.editedTexts ? Object.keys(sub.editedTexts).length : 0;
  }

  previewBuiltinTemplate(key: string): void {
    if (this.invitation?.slug) {
      window.open(`/new/i/${this.invitation.slug}?tpl=${key}&preview=true&clean=1`, '_blank');
    }
  }

  previewCustomSubmission(sub: CustomTemplateSubmission): void {
    if (this.invitation?.slug) {
      const subId = sub.id || sub._id;
      const tpl = sub.sourceTemplateKey || 'custom-html';
      window.open(`/new/i/${this.invitation.slug}?tpl=${tpl}&preview=true&subId=${subId}`, '_blank');
    }
  }

  editCleanBuiltin(key: string): void {
    this.openTextEditor.emit({ templateKey: key, clean: true });
  }

  editCustomSubmission(sub: CustomTemplateSubmission): void {
    if (sub.sourceTemplateKey && sub.editedTexts) {
      this.openTextEditor.emit({ templateKey: sub.sourceTemplateKey, submission: sub, clean: false });
    } else {
      this.openAiWizard.emit();
    }
  }

  deleteCustomSubmission(sub: CustomTemplateSubmission, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const subId = sub.id || sub._id || '';

    this.confirmDialog.confirm({
      title: '¿Eliminar versión personalizada?',
      message: `¿Estás seguro de eliminar "${sub.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.apiService.deleteCustomTemplateSubmission(subId).subscribe({
          next: () => {
            if (this.isCustomSubmissionActive(sub)) {
              this.setBuiltinTemplate('envelope-cards');
            }
            this.loadCustomSubmissions();
            this.showSuccess('Versión personalizada eliminada.');
          },
          error: (err) => {
            this.showError(err?.message || 'Error al eliminar la versión personalizada.');
          }
        });
      }
    });
  }

  canUsePremiumTemplates(): boolean {
    if (!this.currentPlan) return false;
    return this.currentPlan.key !== 'free';
  }

  formatPrice(plan: PlanDefinition): string {
    return plan.amount ? `$${Math.round(plan.amount / 100).toLocaleString('es-MX')} MXN` : 'Gratis';
  }

  checkoutScopeText(plan: PlanDefinition): string {
    return plan.scope === 'event' ? 'Pago único por evento' : 'Pago por cuenta';
  }

  planLimitText(plan: PlanDefinition): string {
    if (!plan.limits) return '';
    const limits = plan.limits;
    const items = [
      `${limits.guests} invitados`,
      `${limits.galleryImages} imágenes`,
      limits.music ? 'música' : 'sin música',
      limits.premiumTemplates ? 'plantillas premium' : 'plantillas free',
      limits.exportData ? 'exportación' : '',
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

  isProPlan(key?: string): boolean {
    return ['pro', 'planner_pro_monthly', 'planner_pro_yearly', 'organizer'].includes(key || '');
  }

  isEventPlan(key?: string): boolean {
    return ['event', 'event_12m', 'external_dashboard_12m'].includes(key || '');
  }

  canCheckoutPlan(plan: PlanDefinition): boolean {
    if (!plan || plan.key === 'free') return false;
    const currentKey = this.currentPlan?.key;
    if (this.isProPlan(currentKey)) return false;
    if (this.isEventPlan(plan.key) && this.isEventPlan(currentKey)) return false;
    if (plan.key === currentKey) return false;
    return true;
  }

  hasPendingPayment(planKey: string): boolean {
    return this.payments.some(p => p.planKey === planKey && p.status === 'pending');
  }
}
