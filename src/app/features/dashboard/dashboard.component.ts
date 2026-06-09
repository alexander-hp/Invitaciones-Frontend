import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DashboardMetrics, PaymentModel, PlanDefinition } from '../../core/models';

@Component({ selector: 'app-dashboard', templateUrl: './dashboard.component.html' })
export class DashboardComponent implements OnInit {
  loading = false;
  error = '';
  paymentMessage = '';
  metrics: DashboardMetrics = { events: 0, invitations: 0, guests: 0, confirmed: 0, declined: 0, pending: 0, companions: 0 };
  currentPlan?: PlanDefinition;
  payments: PaymentModel[] = [];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const payment = this.route.snapshot.queryParamMap.get('payment');
    if (payment === 'success') this.paymentMessage = 'Pago recibido. Tu plan se actualizara cuando Stripe confirme el webhook.';
    if (payment === 'cancelled') this.paymentMessage = 'Pago cancelado. Puedes intentarlo de nuevo cuando quieras.';
    this.load();
    this.loadPaymentStatus();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getDashboard().subscribe({
      next: ({ metrics }) => {
        this.metrics = metrics;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar el dashboard.';
        this.loading = false;
      }
    });
  }

  loadPaymentStatus(): void {
    this.api.getPaymentStatus().subscribe({
      next: ({ planDefinition, payments }) => {
        this.currentPlan = planDefinition;
        this.payments = payments;
      },
      error: () => {
        this.currentPlan = undefined;
        this.payments = [];
      }
    });
  }

  formatAmount(payment: PaymentModel): string {
    return payment.amount ? `$${Math.round(payment.amount / 100).toLocaleString('es-MX')} ${payment.currency || 'MXN'}` : 'Sin monto';
  }

  paymentDate(payment: PaymentModel): string | undefined {
    return payment.paidAt || payment.createdAt;
  }
}
