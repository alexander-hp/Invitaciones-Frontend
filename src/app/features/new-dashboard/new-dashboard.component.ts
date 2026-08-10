import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DashboardMetrics, EventModel } from '../../core/models';

@Component({ selector: 'app-new-dashboard', templateUrl: './new-dashboard.component.html' })
export class NewDashboardComponent implements OnInit {
  sidebarOpen = false;
  loading = true;
  error = '';
  metrics: DashboardMetrics = {
    events: 0,
    invitations: 0,
    guests: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
    companions: 0,
    emailSent: 0,
    whatsappSent: 0,
    opened: 0,
    failed: 0,
    checkedIn: 0
  };
  events: EventModel[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadMetrics();
    this.loadEvents();
  }

  loadMetrics(): void {
    this.api.getDashboard().subscribe({
      next: ({ metrics }) => { this.metrics = metrics; this.loading = false; },
      error: (err) => { this.error = err.error?.message || 'Error cargando métricas'; this.loading = false; }
    });
  }

  loadEvents(): void {
    this.api.listEvents().subscribe({
      next: ({ events }) => this.events = events.slice(0, 6),
      error: () => {}
    });
  }

  get confirmRate(): number {
    const total = this.metrics.confirmed + this.metrics.declined + this.metrics.pending;
    return total ? Math.round((this.metrics.confirmed / total) * 100) : 0;
  }

  get attendanceTotal(): number {
    return this.metrics.confirmed + this.metrics.companions;
  }

  get totalSent(): number {
    return (this.metrics.whatsappSent || 0) + (this.metrics.emailSent || 0);
  }

  get deliverySuccessRate(): number {
    const total = this.totalSent;
    if (!total) return 0;
    const successful = total - (this.metrics.failed || 0);
    return Math.round((successful / total) * 100);
  }

  eventTypeIcon(type: string): string {
    const icons: Record<string, string> = { boda: '💍', xv: '👑', graduacion: '🎓', cumpleanos: '🎂', bautizo: '⛪', otro: '🎉' };
    return icons[type] || '🎉';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getEventId(event: EventModel): string {
    return event._id || event.id || '';
  }

  goToEvent(event: EventModel): void {
    this.router.navigate(['/new/events', this.getEventId(event)]);
  }

  isPastEvent(event: EventModel): boolean {
    return new Date(event.date) < new Date();
  }
}
