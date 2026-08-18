import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel, EventModel, TemplateModel, PlanDefinition, PaymentPackage } from '../../../../core/models';

@Component({
  selector: 'app-editor-plans-tab',
  templateUrl: './editor-plans-tab.component.html'
})
export class EditorPlansTabComponent {
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

  builtinTemplates = [
    {
      id: 'envelope-cards',
      name: 'Sobre Interactivo & Cards Deslizables',
      badge: '📱 Recomendado Móvil',
      description: 'Apertura animada de sobrecito digital con sello, verificación opcional de acceso (correo/teléfono), fondo de boda elegante y tarjetas independientes deslizables a izquierda/derecha.',
      icon: '✉️📲',
      features: ['Sobre 3D animado', 'Navegación por Swipe (Tarjetas)', 'Autenticación en sobre', 'Optimizado Celulares']
    },
    {
      id: 'classic-vertical',
      name: 'Clásica Editorial Vertical',
      badge: '📜 Estándar',
      description: 'Formato editorial continuo de scroll vertical. Diseño clásico con tipografía limpia y secciones de lectura secuencial.',
      icon: '📜✨',
      features: ['Scroll vertical continuo', 'Portada hero amplia', 'Lectura secuencial', 'Excelente en Escritorio']
    },
    {
      id: 'modern-minimal',
      name: 'Plantilla 3: Glamour Moderno & Minimal',
      badge: '✨ Plantilla 3',
      description: 'Diseño vanguardista con estética limpia, tarjetas flotantes glassmorphism, hero interactivo, timeline moderno y animación fluida.',
      icon: '💎✨',
      features: ['Estilo Glassmorphism', 'Diseño Minimalista & Lujo', 'Hero interactivo', 'Optimizada Móvil & Desktop']
    }
  ];

  get currentTemplateKey(): string {
    const invId = this.invitation?._id || this.invitation?.id;
    const slug = this.invitation?.slug;
    const stored = (invId ? localStorage.getItem(`inv_tpl_${invId}`) : null) || (slug ? localStorage.getItem(`inv_tpl_${slug}`) : null);
    return this.invitation?.content?.template || stored || 'envelope-cards';
  }

  isTemplateActive(key: string): boolean {
    const current = this.currentTemplateKey;
    if (key === 'modern-minimal' && (current === 'modern-minimal' || current === 'template-3' || current === 'plantilla-3')) {
      return true;
    }
    return current === key;
  }

  setTemplate(key: string): void {
    if (this.invitation) {
      if (!this.invitation.content) this.invitation.content = {};
      this.invitation.content.template = key;
      const invId = this.invitation._id || this.invitation.id;
      const slug = this.invitation.slug;
      if (invId) {
        localStorage.setItem(`inv_tpl_${invId}`, key);
      }
      if (slug) {
        localStorage.setItem(`inv_tpl_${slug}`, key);
      }
      if (/^[0-9a-fA-F]{24}$/.test(key)) {
        this.invitation.template = key;
      } else {
        delete this.invitation.template;
      }
      this.selectTemplateKey.emit(key);
      this.saveChanges.emit();
    }
  }

  previewTemplate(key: string): void {
    if (this.invitation?.slug) {
      window.open(`/new/i/${this.invitation.slug}?tpl=${key}`, '_blank');
    }
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
