import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import {
  EventTableModel, GuestModel, AutoAssignStrategy, AutoAssignTablesResponse
} from '../../../../core/models';

@Component({
  selector: 'app-event-tables-tab',
  templateUrl: './event-tables-tab.component.html'
})
export class EventTablesTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;
  @Input() guests: GuestModel[] = [];
  @Output() tablesUpdated = new EventEmitter<void>();

  tables: EventTableModel[] = [];
  tablesLoading = false;
  clearingTables = false;

  tableMessage = '';
  tableError = '';

  showTableForm = false;
  tableForm = {
    name: '',
    capacity: 10,
    order: 0,
    notes: ''
  };

  showAutoAssignModal = false;
  autoAssigning = false;
  autoAssignError = '';
  autoAssignResult?: AutoAssignTablesResponse;
  autoAssignForm = {
    strategy: 'by_group' as AutoAssignStrategy,
    includeConfirmed: true,
    includePending: false,
    includeDeclined: false,
    overwrite: false
  };

  Math = Math;

  constructor(
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.eventId) {
      this.loadTables();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadTables();
    }
  }

  loadTables(): void {
    this.tablesLoading = true;
    this.apiService.listTables(this.eventId).subscribe({
      next: res => {
        this.tables = res.tables || [];
        this.tablesLoading = false;
      },
      error: err => {
        this.tableError = err?.error?.message || 'Error al cargar mesas';
        this.tablesLoading = false;
      }
    });
  }

  get hasAssignedGuests(): boolean {
    return this.guests.some(g => !!g.tableName);
  }

  goToSeating(): void {
    this.router.navigate(['/new/events', this.eventId, 'seating']);
  }

  createTable(): void {
    if (!this.tableForm.name.trim()) return;
    this.apiService.createTable(this.eventId, {
      name: this.tableForm.name.trim(),
      capacity: Number(this.tableForm.capacity || 10),
      order: Number(this.tableForm.order || 0),
      notes: this.tableForm.notes.trim() || undefined
    }).subscribe({
      next: res => {
        this.tables.push(res.table);
        this.tableForm = { name: '', capacity: 10, order: 0, notes: '' };
        this.showTableForm = false;
        this.tableMessage = `Mesa "${res.table.name}" creada.`;
        this.tablesUpdated.emit();
      },
      error: err => {
        this.tableError = err?.error?.message || 'Error al crear mesa';
      }
    });
  }

  deleteTable(table: EventTableModel): void {
    const tId = (table._id || table.id)!;
    this.confirmDialogService.confirm({
      title: 'Eliminar mesa',
      message: `¿Estás seguro de eliminar la mesa "${table.name}"?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.apiService.deleteTable(this.eventId, tId).subscribe({
        next: () => {
          this.tables = this.tables.filter(t => (t._id || t.id) !== tId);
          this.tableMessage = `Mesa "${table.name}" eliminada.`;
          this.tablesUpdated.emit();
        },
        error: err => {
          this.tableError = err?.error?.message || 'Error al eliminar mesa';
        }
      });
    });
  }

  clearAssignments(): void {
    this.confirmDialogService.confirm({
      title: 'Limpiar mesas',
      message: '¿Desasignar a todos los invitados de sus mesas?',
      confirmText: 'Sí, desasignar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.clearingTables = true;
      this.apiService.autoAssignTables(this.eventId, {
        strategy: 'by_group',
        includeStatuses: [],
        overwrite: true
      }).subscribe({
        next: () => {
          this.clearingTables = false;
          this.tableMessage = 'Se han desasignado los invitados de sus mesas.';
          this.loadTables();
          this.tablesUpdated.emit();
        },
        error: err => {
          this.clearingTables = false;
          this.tableError = err?.error?.message || 'Error al limpiar mesas';
        }
      });
    });
  }

  openAutoAssignModal(): void {
    this.autoAssignResult = undefined;
    this.autoAssignError = '';
    this.showAutoAssignModal = true;
  }

  runAutoAssign(): void {
    this.autoAssigning = true;
    this.autoAssignError = '';
    const statuses: string[] = [];
    if (this.autoAssignForm.includeConfirmed) statuses.push('confirmed');
    if (this.autoAssignForm.includePending) statuses.push('pending');
    if (this.autoAssignForm.includeDeclined) statuses.push('declined');

    this.apiService.autoAssignTables(this.eventId, {
      strategy: this.autoAssignForm.strategy,
      includeStatuses: statuses,
      overwrite: this.autoAssignForm.overwrite
    }).subscribe({
      next: res => {
        this.autoAssigning = false;
        this.autoAssignResult = res;
        this.loadTables();
        this.tablesUpdated.emit();
      },
      error: err => {
        this.autoAssigning = false;
        this.autoAssignError = err?.error?.message || 'Error al ejecutar auto-asignación';
      }
    });
  }
}
