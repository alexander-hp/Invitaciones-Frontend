import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, from, of } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import {
  EventTableModel, GuestModel, AutoAssignStrategy, AutoAssignTablesResponse, TableShape
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
  deletingAllTables = false;
  creating = false;

  // Guest Detail Modal
  showGuestDetailModal = false;
  loadingGuestDetail = false;
  selectedGuestForDetail: GuestModel | null = null;

  tableMessage = '';
  tableError = '';

  // Unified Table/Element Creation Modal matching Croquis
  showCreateModal = false;
  createTab: 'single' | 'batch' | 'preset' = 'single';
  showAdvancedDimensions = false;
  
  newTable = {
    name: '',
    capacity: 8,
    shape: 'round' as TableShape,
    width: 1.2,
    height: 1.2,
    floor: 1,
    notes: ''
  };

  batchForm = {
    quantity: 10,
    prefix: 'Mesa',
    capacity: 8,
    shape: 'round' as TableShape,
    width: 1.2,
    height: 1.2,
    floor: 1
  };

  shapes = [
    { value: 'round', label: 'Mesa Redonda', icon: '⭕', category: 'table', defaultWidth: 1.2, defaultHeight: 1.2 },
    { value: 'rect', label: 'Mesa Rectangular', icon: '▭', category: 'table', defaultWidth: 1.8, defaultHeight: 1.0 },
    { value: 'oval', label: 'Mesa Ovalada', icon: '⬏', category: 'table', defaultWidth: 1.6, defaultHeight: 1.1 },
    { value: 'square', label: 'Mesa Cuadrada', icon: '▢', category: 'table', defaultWidth: 1.2, defaultHeight: 1.2 },
    { value: 'dance_floor', label: '💃 Pista de Baile', icon: '💃', category: 'element', defaultWidth: 3.6, defaultHeight: 3.6 },
    { value: 'stage_dj', label: '🎧 Escenario / DJ', icon: '🎧', category: 'element', defaultWidth: 3.2, defaultHeight: 1.8 },
    { value: 'bar', label: '🍸 Barra de Bebidas', icon: '🍸', category: 'element', defaultWidth: 3.0, defaultHeight: 1.2 },
    { value: 'gift_table', label: '🎁 Mesa de Regalos', icon: '🎁', category: 'element', defaultWidth: 2.2, defaultHeight: 1.2 },
    { value: 'cake_table', label: '🎂 Mesa de Pastel', icon: '🎂', category: 'element', defaultWidth: 1.2, defaultHeight: 1.2 },
    { value: 'photobooth', label: '📷 Photo Booth', icon: '📷', category: 'element', defaultWidth: 2.4, defaultHeight: 1.6 },
    { value: 'entrance', label: '🚪 Entrada Principal', icon: '🚪', category: 'element', defaultWidth: 2.4, defaultHeight: 1.0 }
  ];

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

  get floorsList(): Array<{ id: number; name: string }> {
    const list: Array<{ id: number; name: string }> = [];
    const floorIds = new Set<number>();

    // Always include Floor 1 (Planta Baja)
    list.push({ id: 1, name: 'Planta Baja' });
    floorIds.add(1);

    this.tables.forEach(t => {
      const f = t.floor || 1;
      if (!floorIds.has(f)) {
        floorIds.add(f);
        list.push({ id: f, name: t.floorName || `Piso ${f}` });
      }
    });

    return list.sort((a, b) => a.id - b.id);
  }

  notifySuccess(msg: string): void {
    this.tableMessage = msg;
    setTimeout(() => {
      if (this.tableMessage === msg) this.tableMessage = '';
    }, 3500);
  }

  notifyError(err: string): void {
    this.tableError = err;
    setTimeout(() => {
      if (this.tableError === err) this.tableError = '';
    }, 4000);
  }

  loadTables(): void {
    this.tablesLoading = true;
    this.apiService.listTables(this.eventId).subscribe({
      next: res => {
        this.tables = res.tables || [];
        this.tablesLoading = false;
      },
      error: err => {
        this.notifyError(err?.error?.message || 'Error al cargar mesas');
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

  isElementShape(shape?: string): boolean {
    return ['dance_floor', 'stage_dj', 'bar', 'gift_table', 'cake_table', 'photobooth', 'entrance'].includes(shape || '');
  }

  onShapeSelect(shape: TableShape): void {
    this.newTable.shape = shape;
    switch (shape) {
      case 'rect':
        this.newTable.width = 1.8;
        this.newTable.height = 1.0;
        break;
      case 'oval':
        this.newTable.width = 1.6;
        this.newTable.height = 1.1;
        break;
      case 'square':
        this.newTable.width = 1.2;
        this.newTable.height = 1.2;
        break;
      case 'dance_floor':
        this.newTable.width = 3.6;
        this.newTable.height = 3.6;
        break;
      case 'stage_dj':
        this.newTable.width = 3.2;
        this.newTable.height = 1.8;
        break;
      case 'bar':
        this.newTable.width = 3.0;
        this.newTable.height = 1.2;
        break;
      case 'gift_table':
        this.newTable.width = 2.2;
        this.newTable.height = 1.2;
        break;
      case 'cake_table':
        this.newTable.width = 1.2;
        this.newTable.height = 1.2;
        break;
      case 'photobooth':
        this.newTable.width = 2.4;
        this.newTable.height = 1.6;
        break;
      case 'entrance':
        this.newTable.width = 2.4;
        this.newTable.height = 1.0;
        break;
      case 'round':
      default:
        this.newTable.width = 1.2;
        this.newTable.height = 1.2;
        break;
    }
  }

  onBatchShapeSelect(shape: TableShape): void {
    this.batchForm.shape = shape;
    switch (shape) {
      case 'rect':
        this.batchForm.width = 1.8;
        this.batchForm.height = 1.0;
        break;
      case 'oval':
        this.batchForm.width = 1.6;
        this.batchForm.height = 1.1;
        break;
      case 'square':
        this.batchForm.width = 1.2;
        this.batchForm.height = 1.2;
        break;
      case 'round':
      default:
        this.batchForm.width = 1.2;
        this.batchForm.height = 1.2;
        break;
    }
  }

  openCreateModal(): void {
    const diningTables = this.tables.filter(t => !this.isElementShape(t.shape));
    this.createTab = 'single';
    this.showAdvancedDimensions = false;
    this.newTable = {
      name: `Mesa ${diningTables.length + 1}`,
      capacity: 8,
      shape: 'round',
      width: 1.2,
      height: 1.2,
      floor: 1,
      notes: ''
    };
    this.batchForm = {
      quantity: 10,
      prefix: 'Mesa',
      capacity: 8,
      shape: 'round',
      width: 1.2,
      height: 1.2,
      floor: 1
    };
    this.showCreateModal = true;
  }

  createSingleTable(): void {
    if (!this.newTable.name.trim()) return;
    this.creating = true;
    const isElem = this.isElementShape(this.newTable.shape);
    const targetFloorId = Number(this.newTable.floor || 1);
    const floorObj = this.floorsList.find(f => f.id === targetFloorId) || { id: targetFloorId, name: `Piso ${targetFloorId}` };

    this.apiService.createTable(this.eventId, {
      name: this.newTable.name.trim(),
      capacity: isElem ? 0 : Math.max(1, Number(this.newTable.capacity || 1)),
      shape: this.newTable.shape,
      width: Math.min(1200, Math.max(40, Math.round((this.newTable.width || 1.2) * 100))),
      height: Math.min(1200, Math.max(40, Math.round((this.newTable.height || 1.2) * 100))),
      floor: targetFloorId,
      floorName: floorObj.name,
      order: this.tables.length + 1,
      notes: this.newTable.notes?.trim() || undefined
    }).subscribe({
      next: res => {
        this.creating = false;
        this.showCreateModal = false;
        this.notifySuccess(`✨ Mesa "${res.table.name}" agregada con éxito.`);
        this.loadTables();
        this.tablesUpdated.emit();
      },
      error: err => {
        this.creating = false;
        this.notifyError(err?.error?.message || 'Error al crear mesa');
      }
    });
  }

  createBatchTables(): void {
    if (!this.eventId || this.batchForm.quantity < 1) return;
    this.creating = true;

    const count = Math.min(50, Math.max(1, this.batchForm.quantity));
    const prefix = (this.batchForm.prefix || 'Mesa').trim();
    const capacity = Math.max(1, this.batchForm.capacity || 8);
    const shape = this.batchForm.shape || 'round';
    const targetFloorId = Number(this.batchForm.floor || 1);
    const floorObj = this.floorsList.find(f => f.id === targetFloorId) || { id: targetFloorId, name: `Piso ${targetFloorId}` };

    const requests = [];
    for (let i = 1; i <= count; i++) {
      const tableName = `${prefix} ${this.tables.length + i}`;
      requests.push(this.apiService.createTable(this.eventId, {
        name: tableName,
        capacity: capacity,
        shape: shape,
        width: Math.min(1200, Math.max(40, Math.round((this.batchForm.width || 1.2) * 100))),
        height: Math.min(1200, Math.max(40, Math.round((this.batchForm.height || 1.2) * 100))),
        floor: targetFloorId,
        floorName: floorObj.name,
        order: this.tables.length + i
      }));
    }

    if (requests.length === 0) return;
    this.creating = true;

    from(requests).pipe(
      mergeMap(req => req, 3),
      toArray()
    ).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateModal = false;
        this.notifySuccess(`✨ Se generaron ${count} mesas por lote correctamente.`);
        this.loadTables();
        this.tablesUpdated.emit();
      },
      error: err => {
        this.creating = false;
        this.notifyError(err?.error?.message || 'Error al crear mesas en lote');
      }
    });
  }

  createPresetSet(count: number): void {
    this.batchForm.quantity = count;
    this.batchForm.prefix = 'Mesa';
    this.batchForm.capacity = 10;
    this.batchForm.shape = 'round';
    this.createBatchTables();
  }

  deleteTable(table: EventTableModel): void {
    const tId = (table._id || table.id)!;
    this.confirmDialogService.confirm({
      title: 'Eliminar mesa',
      message: `¿Estás seguro de eliminar la mesa "${table.name}"?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.apiService.deleteTable(this.eventId, tId).subscribe({
        next: () => {
          this.tables = this.tables.filter(t => (t._id || t.id) !== tId);
          this.notifySuccess(`Mesa "${table.name}" eliminada.`);
          this.tablesUpdated.emit();
        },
        error: err => {
          this.notifyError(err?.error?.message || 'Error al eliminar mesa');
        }
      });
    });
  }

  deleteAllTables(): void {
    if (!this.eventId || this.tables.length === 0) return;
    const count = this.tables.length;
    this.confirmDialogService.confirm({
      title: 'Borrar todas las mesas',
      message: `⚠️ ¿Estás seguro de que deseas ELIMINAR TODAS LAS MESAS (${count}) del evento? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, borrar todas',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.deletingAllTables = true;
      const deleteRequests = this.tables.map(t => this.apiService.deleteTable(this.eventId, (t._id || t.id)!));
      from(deleteRequests).pipe(
        mergeMap(req => req, 3),
        toArray()
      ).subscribe({
        next: () => {
          this.deletingAllTables = false;
          this.tables = [];
          this.notifySuccess(`Se eliminaron las ${count} mesas correctamente.`);
          this.tablesUpdated.emit();
        },
        error: err => {
          this.deletingAllTables = false;
          this.notifyError(err?.error?.message || 'Error al borrar todas las mesas');
          this.loadTables();
          this.tablesUpdated.emit();
        }
      });
    });
  }

  openGuestDetailModal(guestInput: GuestModel | { id?: string; _id?: string; name: string }): void {
    const guestId = guestInput._id || guestInput.id || '';
    const foundLocal = this.guests.find(g => (g._id || g.id) === guestId);

    this.selectedGuestForDetail = foundLocal || (guestInput as GuestModel);
    this.showGuestDetailModal = true;
    this.loadingGuestDetail = !!guestId;

    if (guestId) {
      this.apiService.getGuest(guestId).subscribe({
        next: ({ guest }) => {
          this.selectedGuestForDetail = guest;
          this.loadingGuestDetail = false;
        },
        error: () => {
          this.loadingGuestDetail = false;
        }
      });
    }
  }

  closeGuestDetailModal(): void {
    this.showGuestDetailModal = false;
    this.selectedGuestForDetail = null;
  }

  guestInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  getGuestGroupOrRole(g: GuestModel): string {
    if (g.group && g.relationshipLabel) {
      return `${g.group} (${g.relationshipLabel})`;
    }
    if (g.group) return g.group;
    if (g.relationshipLabel) return g.relationshipLabel;
    if (g.roles && g.roles.length) return g.roles.join(', ');
    if (g.visibilityGroup) return g.visibilityGroup;
    return 'Sin grupo';
  }

  clearAssignments(): void {
    const assignedGuests = (this.guests || []).filter(g => !!g.tableName);
    if (assignedGuests.length === 0) {
      this.notifySuccess('No hay invitados asignados a mesas.');
      return;
    }

    this.confirmDialogService.confirm({
      title: 'Limpiar mesas',
      message: `¿Estás seguro de desasignar a los ${assignedGuests.length} invitados de sus mesas?`,
      confirmText: 'Sí, desasignar todos',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.clearingTables = true;

      const requests = assignedGuests.map(g =>
        this.apiService.updateGuest((g._id || g.id)!, { tableName: '' })
      );

      from(requests).pipe(
        mergeMap(req => req, 3),
        toArray()
      ).subscribe({
        next: () => {
          this.clearingTables = false;
          this.notifySuccess(`✨ Se desasignaron ${assignedGuests.length} invitados de sus mesas.`);
          this.loadTables();
          this.tablesUpdated.emit();
        },
        error: err => {
          this.clearingTables = false;
          this.notifyError(err?.error?.message || 'Error al limpiar mesas');
        }
      });
    });
  }

  // Quick Guest Assignment Modal (Multi-select + Filters)
  showAssignGuestModal = false;
  selectedTableForAssign: EventTableModel | null = null;
  selectedGuestIds: string[] = [];
  assignSearch = '';
  assignStatusFilter: 'all' | 'confirmed' | 'pending' | 'declined' = 'all';
  assignGroupFilter = 'all';
  assigningGuests = false;

  get distinctGroups(): string[] {
    const groups = new Set<string>();
    (this.guests || []).forEach(g => {
      if (g.group?.trim()) groups.add(g.group.trim());
    });
    return Array.from(groups).sort();
  }

  get unassignedGuests(): GuestModel[] {
    return (this.guests || []).filter(g => !g.tableName);
  }

  get filteredUnassignedGuests(): GuestModel[] {
    let list = this.unassignedGuests;

    if (this.assignStatusFilter !== 'all') {
      list = list.filter(g => (g.status || 'pending') === this.assignStatusFilter);
    }

    if (this.assignGroupFilter !== 'all') {
      list = list.filter(g => (g.group || '').trim() === this.assignGroupFilter);
    }

    const query = (this.assignSearch || '').trim().toLowerCase();
    if (query) {
      list = list.filter(g =>
        (g.name || '').toLowerCase().includes(query) ||
        (g.group || '').toLowerCase().includes(query)
      );
    }

    return list;
  }

  get selectedSeatsCount(): number {
    if (!this.selectedGuestIds.length) return 0;
    return (this.guests || [])
      .filter(g => this.selectedGuestIds.includes((g._id || g.id)!))
      .reduce((sum, g) => sum + ((g as any).seats || (1 + (g.allowedCompanions || 0))), 0);
  }

  get selectedTableAvailableSeats(): number {
    if (!this.selectedTableForAssign) return 0;
    const occupied = this.selectedTableForAssign.occupied || 0;
    const capacity = this.selectedTableForAssign.capacity || 10;
    return Math.max(0, capacity - occupied);
  }

  get isOverCapacityWarning(): boolean {
    if (!this.selectedTableForAssign || this.selectedGuestIds.length === 0) return false;
    return this.selectedSeatsCount > this.selectedTableAvailableSeats;
  }

  get overCapacityExcess(): number {
    if (!this.isOverCapacityWarning) return 0;
    return this.selectedSeatsCount - this.selectedTableAvailableSeats;
  }

  isGuestSelected(g: GuestModel): boolean {
    const id = (g._id || g.id)!;
    return this.selectedGuestIds.includes(id);
  }

  toggleGuestSelection(g: GuestModel): void {
    const id = (g._id || g.id)!;
    if (!id) return;
    if (this.selectedGuestIds.includes(id)) {
      this.selectedGuestIds = this.selectedGuestIds.filter(i => i !== id);
    } else {
      this.selectedGuestIds.push(id);
    }
  }

  selectAllFilteredGuests(): void {
    const filteredIds = this.filteredUnassignedGuests.map(g => (g._id || g.id)!);
    const newSelected = new Set([...this.selectedGuestIds, ...filteredIds]);
    this.selectedGuestIds = Array.from(newSelected);
  }

  clearSelectedGuests(): void {
    this.selectedGuestIds = [];
  }

  openAssignModal(table?: EventTableModel): void {
    this.selectedTableForAssign = table || (this.tables.length ? this.tables[0] : null);
    this.selectedGuestIds = [];
    this.assignSearch = '';
    this.assignStatusFilter = 'all';
    this.assignGroupFilter = 'all';
    this.showAssignGuestModal = true;
  }

  assignSelectedGuestsToTable(): void {
    if (!this.selectedTableForAssign || this.selectedGuestIds.length === 0) return;
    const tableName = this.selectedTableForAssign.name;
    const count = this.selectedGuestIds.length;

    this.assigningGuests = true;
    const requests = this.selectedGuestIds.map(gId =>
      this.apiService.updateGuest(gId, { tableName })
    );

    from(requests).pipe(
      mergeMap(req => req, 3),
      toArray()
    ).subscribe({
      next: () => {
        this.assigningGuests = false;
        this.notifySuccess(`✨ ${count} invitado${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''} a ${tableName}.`);
        this.showAssignGuestModal = false;
        this.selectedGuestIds = [];
        this.loadTables();
        this.tablesUpdated.emit();
      },
      error: err => {
        this.assigningGuests = false;
        this.notifyError(err?.error?.message || 'Error al asignar invitados a la mesa');
      }
    });
  }

  unassignGuest(guest: { id?: string; _id?: string; name: string }): void {
    const gId = guest._id || guest.id;
    if (!gId) return;

    this.confirmDialogService.confirm({
      title: 'Desasignar invitado',
      message: `¿Desasignar a "${guest.name}" de su mesa?`,
      confirmText: 'Sí, desasignar',
      cancelText: 'Cancelar',
      type: 'warning'
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.apiService.updateGuest(gId, { tableName: '' }).subscribe({
        next: () => {
          this.notifySuccess(`Invitado "${guest.name}" desasignado.`);
          this.loadTables();
          this.tablesUpdated.emit();
        },
        error: err => {
          this.notifyError(err?.error?.message || 'Error al desasignar invitado');
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
