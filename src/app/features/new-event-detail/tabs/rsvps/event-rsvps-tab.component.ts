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
  
  // Toast notifications
  message = '';
  error = '';
  private messageTimeout?: any;
  private errorTimeout?: any;

  // Filters & Search
  searchQuery = '';
  statusFilter = '';
  companionsFilter = '';

  constructor(private apiService: ApiService) { }

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

  loadRsvps(): void {
    this.rsvpsLoading = true;
    this.apiService.listRsvps(this.eventId).subscribe({
      next: res => {
        this.rsvps = res.rsvps || [];
        this.rsvpsLoading = false;
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al cargar respuestas RSVP');
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
        this.showSuccess('Archivo CSV exportado exitosamente');
      },
      error: () => {
        this.exportingRsvps = false;
        this.showError('No se pudo exportar el archivo CSV de RSVPs');
      }
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.companionsFilter = '';
  }

  get filteredRsvps(): RsvpModel[] {
    return this.rsvps.filter(r => {
      // Search Query
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesName = (r.name || '').toLowerCase().includes(q);
        const matchesEmail = (r.email || '').toLowerCase().includes(q);
        const matchesPhone = (r.phone || r.phoneE164 || '').toLowerCase().includes(q);
        const matchesMsg = (r.message || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesMsg) return false;
      }

      // Status filter
      if (this.statusFilter) {
        const isConfirmed = r.response === 'confirmed' || (r.response as string) === 'attending';
        const isDeclined = r.response === 'declined';
        if (this.statusFilter === 'confirmed' && !isConfirmed) return false;
        if (this.statusFilter === 'declined' && !isDeclined) return false;
        if (this.statusFilter === 'pending' && (isConfirmed || isDeclined)) return false;
      }

      // Companions filter
      if (this.companionsFilter) {
        const compCount = r.companions || 0;
        if (this.companionsFilter === 'with_companions' && compCount <= 0) return false;
        if (this.companionsFilter === 'solo' && compCount > 0) return false;
      }

      return true;
    });
  }

  // Metrics
  get confirmedCount(): number {
    return this.rsvps.filter(r => r.response === 'confirmed' || (r.response as string) === 'attending').length;
  }

  get totalAttendingGuests(): number {
    return this.rsvps
      .filter(r => r.response === 'confirmed' || (r.response as string) === 'attending')
      .reduce((sum, r) => sum + 1 + (r.companions || 0), 0);
  }

  get declinedCount(): number {
    return this.rsvps.filter(r => r.response === 'declined').length;
  }

  get pendingCount(): number {
    return this.rsvps.filter(r => !r.response || (r.response !== 'confirmed' && (r.response as string) !== 'attending' && r.response !== 'declined')).length;
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
