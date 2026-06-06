import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { DashboardMetrics } from '../../core/models';

@Component({ selector: 'app-dashboard', templateUrl: './dashboard.component.html' })
export class DashboardComponent implements OnInit {
  loading = false;
  error = '';
  metrics: DashboardMetrics = { events: 0, invitations: 0, guests: 0, confirmed: 0, declined: 0, pending: 0, companions: 0 };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
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
}
