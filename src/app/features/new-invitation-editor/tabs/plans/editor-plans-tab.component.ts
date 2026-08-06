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
