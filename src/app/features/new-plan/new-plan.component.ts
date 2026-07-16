import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PaymentModel, PlanDefinition, SubscriptionStatus } from '../../core/models';

@Component({
  selector: 'app-new-plan',
  templateUrl: './new-plan.component.html'
})
export class NewPlanComponent implements OnInit {
  loading = true;
  error = '';
  currentPlan?: PlanDefinition;
  subscriptionStatus: SubscriptionStatus = 'inactive';
  subscriptionActive = false;
  subscriptionCurrentPeriodEnd = '';
  payments: PaymentModel[] = [];

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadPaymentStatus();
  }

  loadPaymentStatus(): void {
    this.loading = true;
    this.error = '';
    this.api.getPaymentStatus().subscribe({
      next: ({ planDefinition, payments, subscriptionStatus, subscriptionActive, subscriptionCurrentPeriodEnd }) => {
        this.currentPlan = planDefinition;
        this.subscriptionStatus = subscriptionStatus || 'inactive';
        this.subscriptionActive = Boolean(subscriptionActive);
        this.subscriptionCurrentPeriodEnd = subscriptionCurrentPeriodEnd || '';
        this.payments = payments;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error cargando estado de pago y límites de la cuenta';
        this.currentPlan = undefined;
        this.subscriptionStatus = 'inactive';
        this.subscriptionActive = false;
        this.subscriptionCurrentPeriodEnd = '';
        this.payments = [];
        this.loading = false;
      }
    });
  }

  formatAmount(payment: PaymentModel): string {
    return payment.amount ? `$${Math.round(payment.amount / 100).toLocaleString('es-MX')} ${payment.currency || 'MXN'}` : 'Sin monto';
  }

  paymentDate(payment: PaymentModel): string | undefined {
    return payment.paidAt || payment.createdAt;
  }

  get subscriptionEndDateLabel(): string {
    return this.subscriptionCurrentPeriodEnd ? new Date(this.subscriptionCurrentPeriodEnd).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }
}
