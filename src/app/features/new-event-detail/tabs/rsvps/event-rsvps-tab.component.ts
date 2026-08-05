import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { RsvpModel } from '../../../../core/models';

@Component({
  selector: 'app-event-rsvps-tab',
  templateUrl: './event-rsvps-tab.component.html'
})
export class EventRsvpsTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;

  rsvps: RsvpModel[] = [];
  rsvpsLoading = false;
  exportingRsvps = false;
  rsvpError = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.eventId) {
      this.loadRsvps();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadRsvps();
    }
  }

  loadRsvps(): void {
    this.rsvpsLoading = true;
    this.apiService.listRsvps(this.eventId).subscribe({
      next: res => {
        this.rsvps = res.rsvps || [];
        this.rsvpsLoading = false;
      },
      error: err => {
        this.rsvpError = err?.error?.message || 'Error al cargar RSVPs';
        this.rsvpsLoading = false;
      }
    });
  }

  exportRsvps(): void {
    this.exportingRsvps = true;
    this.apiService.exportRsvps(this.eventId).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rsvps-evento-${this.eventId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exportingRsvps = false;
      },
      error: () => {
        this.exportingRsvps = false;
      }
    });
  }

  statusPillClass(resp?: string): string {
    if (resp === 'confirmed' || resp === 'attending') return 'success';
    if (resp === 'declined') return 'danger';
    return 'warning';
  }

  statusLabel(resp?: string): string {
    if (resp === 'confirmed' || resp === 'attending') return 'Confirmado ✅';
    if (resp === 'declined') return 'Rechazado ❌';
    return 'Pendiente ⏳';
  }

  getCustomAnswersList(r: RsvpModel): Array<{ label: string; value: string }> {
    const list: Array<{ label: string; value: string }> = [];
    if (r.dietaryRestrictions) list.push({ label: 'Dieta', value: r.dietaryRestrictions });
    if (r.mealPreference) list.push({ label: 'Menú', value: r.mealPreference });
    if (Array.isArray(r.customAnswers)) {
      for (const qa of r.customAnswers) {
        if (qa.label && qa.value !== undefined && qa.value !== null) {
          list.push({ label: qa.label, value: String(qa.value) });
        }
      }
    }
    return list;
  }

  formatShortDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
