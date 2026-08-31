import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
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
    }
  ];

  constructor(
    private apiService: ApiService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.loadCustomSubmissions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['invitation'] || changes['event']) {
      this.loadCustomSubmissions();
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
        this.customSubmissions = all.filter(s => {
          if (slug && s.eventSlug === slug) return true;
          if (eventId && s.eventId === eventId) return true;
          if (invId && s.invitationId === invId) return true;
          return false;
        });
        this.loadingSubmissions = false;
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

  get currentTemplateKey(): string {
    const invId = this.invitation?._id || this.invitation?.id;
    const slug = this.invitation?.slug;
    const stored = (invId ? localStorage.getItem(`inv_tpl_${invId}`) : null) || (slug ? localStorage.getItem(`inv_tpl_${slug}`) : null);
    return this.invitation?.content?.template || stored || 'envelope-cards';
  }

  isBuiltinActive(tplId: string): boolean {
    if (this.invitation?.content?.activeCustomTemplateId) {
      return false;
    }
    const current = this.currentTemplateKey;
    if (tplId === 'modern-minimal' && (current === 'modern-minimal' || current === 'template-3' || current === 'plantilla-3')) {
      return true;
    }
    return current === tplId;
  }

  isCustomSubmissionActive(sub: CustomTemplateSubmission): boolean {
    const subId = sub.id || sub._id;
    if (this.invitation?.content?.activeCustomTemplateId && this.invitation.content.activeCustomTemplateId === subId) {
      return true;
    }
    return false;
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
      localStorage.removeItem(`inv_edited_texts_${slug}`);
      localStorage.removeItem(`inv_custom_html_${slug}`);
      localStorage.removeItem(`inv_custom_css_${slug}`);
      localStorage.removeItem(`custom_template_html_${slug}`);
      localStorage.removeItem(`custom_template_css_${slug}`);
    }
    if (invId) {
      localStorage.setItem(`inv_tpl_${invId}`, key);
    }

    this.selectTemplateKey.emit(key);
    this.saveChanges.emit();
    this.showSuccess(`Plantilla base "${this.getBuiltinName(key)}" activada.`);
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
    this.invitation.content.customHtml = sub.htmlCode;
    this.invitation.content.customCss = sub.cssCode;
    this.invitation.content.customPageApproved = sub.status === 'approved';

    const targetTpl = sub.sourceTemplateKey || 'custom-html';
    this.invitation.content.template = targetTpl;

    const slug = this.invitation.slug;
    const invId = this.invitation._id || this.invitation.id;

    if (slug) {
      if (sub.editedTexts && Object.keys(sub.editedTexts).length > 0 && sub.sourceTemplateKey) {
        localStorage.setItem(`inv_edited_texts_${slug}`, JSON.stringify(sub.editedTexts));
        localStorage.setItem(`inv_source_tpl_${slug}`, sub.sourceTemplateKey);
        localStorage.setItem(`inv_tpl_${slug}`, sub.sourceTemplateKey);
        localStorage.removeItem(`inv_custom_html_${slug}`);
      } else {
        localStorage.setItem(`inv_custom_html_${slug}`, sub.htmlCode || '');
        localStorage.setItem(`inv_custom_css_${slug}`, sub.cssCode || '');
        localStorage.setItem(`inv_tpl_${slug}`, 'custom-html');
      }
    }
    if (invId) {
      localStorage.setItem(`inv_tpl_${invId}`, targetTpl);
    }

    this.selectTemplateKey.emit(targetTpl);
    this.saveChanges.emit();
    this.showSuccess(`Versión personalizada "${sub.name}" seleccionada.`);
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
