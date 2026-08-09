import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import { DedicationModel, DedicationStatus, DedicationType } from '../../../../core/models';

@Component({
  selector: 'app-event-dedications-tab',
  templateUrl: './event-dedications-tab.component.html'
})
export class EventDedicationsTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;

  dedications: DedicationModel[] = [];
  loadingDedications = false;
  
  // Toast notifications
  dedicationMessage = '';
  dedicationError = '';
  private messageTimeout?: any;
  private errorTimeout?: any;

  // Filters & Search
  searchQuery = '';
  filterStatus: 'all' | 'pending' | 'approved' | 'hidden' | 'rejected' = 'all';
  filterType = '';

  constructor(
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService
  ) { }

  ngOnInit(): void {
    if (this.eventId) {
      this.loadDedications();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadDedications();
    }
  }

  showSuccess(msg: string): void {
    this.dedicationMessage = msg;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => { this.dedicationMessage = ''; }, 3500);
  }

  showError(msg: string): void {
    this.dedicationError = msg;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => { this.dedicationError = ''; }, 4000);
  }

  loadDedications(): void {
    this.loadingDedications = true;
    this.apiService.listDedications(this.eventId).subscribe({
      next: res => {
        this.dedications = res.dedications || [];
        this.loadingDedications = false;
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al cargar dedicatorias');
        this.loadingDedications = false;
      }
    });
  }

  updateDedicationStatus(d: DedicationModel, status: DedicationStatus): void {
    const name = d.publicName || 'Invitado';

    if (status === 'rejected') {
      this.confirmDialogService.confirm({
        title: '¿Rechazar dedicatoria?',
        message: `¿Estás seguro de rechazar el mensaje de "${name}"? No será visible en el portal.`,
        confirmText: 'Sí, rechazar',
        cancelText: 'Cancelar',
        type: 'danger'
      }).then((confirmed: boolean) => {
        if (confirmed) {
          this.executeStatusUpdate(d, status, 'Dedicatoria rechazada');
        }
      });
      return;
    }

    if (status === 'hidden') {
      this.confirmDialogService.confirm({
        title: '¿Ocultar dedicatoria?',
        message: `El mensaje de "${name}" quedará oculto del portal público.`,
        confirmText: 'Sí, ocultar',
        cancelText: 'Cancelar',
        type: 'warning'
      }).then((confirmed: boolean) => {
        if (confirmed) {
          this.executeStatusUpdate(d, status, 'Dedicatoria ocultada');
        }
      });
      return;
    }

    this.executeStatusUpdate(d, status, status === 'approved' ? 'Dedicatoria aprobada correctamente' : 'Estado actualizado');
  }

  private executeStatusUpdate(d: DedicationModel, status: DedicationStatus, successMsg: string): void {
    const dId = (d._id || d.id)!;
    this.apiService.updateDedication(this.eventId, dId, status).subscribe({
      next: res => {
        d.status = res.dedication.status;
        this.showSuccess(successMsg);
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al actualizar dedicatoria');
      }
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterStatus = 'all';
    this.filterType = '';
  }

  get filteredDedications(): DedicationModel[] {
    return this.dedications.filter(d => {
      // Search filter
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesName = (d.publicName || '').toLowerCase().includes(q);
        const matchesEmail = (d.email || '').toLowerCase().includes(q);
        const matchesMsg = (d.message || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesMsg) return false;
      }

      // Status filter
      if (this.filterStatus !== 'all') {
        if (this.filterStatus === 'pending' && d.status !== 'pending') return false;
        if (this.filterStatus === 'approved' && d.status !== 'approved') return false;
        if (this.filterStatus === 'hidden' && d.status !== 'hidden') return false;
        if (this.filterStatus === 'rejected' && d.status !== 'rejected') return false;
      }

      // Type filter
      if (this.filterType && d.type !== this.filterType) return false;

      return true;
    });
  }

  // Metrics
  get totalCount(): number { return this.dedications.length; }
  get pendingCount(): number { return this.dedications.filter(d => d.status === 'pending').length; }
  get approvedCount(): number { return this.dedications.filter(d => d.status === 'approved').length; }
  get hiddenOrRejectedCount(): number { return this.dedications.filter(d => d.status === 'hidden' || d.status === 'rejected').length; }

  getStatusPillClass(status: string): string {
    if (status === 'approved') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'rejected') return 'danger';
    return 'accent';
  }

  getStatusLabel(status: string): string {
    if (status === 'approved') return 'Aprobado ✅';
    if (status === 'pending') return 'Pendiente ⏳';
    if (status === 'rejected') return 'Rechazado ❌';
    if (status === 'hidden') return 'Oculto 🙈';
    return status;
  }

  getTypeLabel(type?: string): string {
    if (type === 'wish') return 'Deseo 🌟';
    if (type === 'memory') return 'Recuerdo 📸';
    if (type === 'toast') return 'Brindis 🥂';
    return 'Dedicatoria 💌';
  }

  getTypeIcon(type?: string): string {
    if (type === 'wish') return '🌟';
    if (type === 'memory') return '📸';
    if (type === 'toast') return '🥂';
    return '💬';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }
}
