import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AutoAssignStrategy, AutoAssignTablesResponse, EventModel, EventTableModel, GuestModel, GuestStatus, TableAutoAssignStrategy, TableShape } from '../../core/models';

interface DragState {
  active: boolean;
  tableId: string;
  startX: number;
  startY: number;
  tableStartX: number;
  tableStartY: number;
}

@Component({ selector: 'app-seating-chart', templateUrl: './seating-chart.component.html' })
export class SeatingChartComponent implements OnInit, AfterViewInit {
  @ViewChild('svgCanvas') svgCanvas!: ElementRef<SVGSVGElement>;

  event?: EventModel;
  tables: EventTableModel[] = [];
  guests: GuestModel[] = [];
  loading = true;
  error = '';
  message = '';

  Math = Math;

  // Canvas state
  viewBox = { x: 0, y: 0, w: 1200, h: 800 };
  zoom = 1;
  isPanning = false;
  panStart = { x: 0, y: 0, vx: 0, vy: 0 };
  selectedTable?: EventTableModel;
  hoveredTable?: EventTableModel;

  // Drag
  drag: DragState = { active: false, tableId: '', startX: 0, startY: 0, tableStartX: 0, tableStartY: 0 };

  // Create modal
  showCreateModal = false;
  newTable = { name: '', capacity: 8, shape: 'round' as TableShape, width: 1.2, height: 1.2 };
  creating = false;
  createError = '';

  // Auto-assign modal
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

  // Guest panel
  guestSearch = '';
  guestStatusFilter: 'all' | GuestStatus = 'all';
  guestGroupFilter = '';
  draggedGuest?: GuestModel;

  autoAssignStrategy: TableAutoAssignStrategy = 'by_group';
  autoAssignStatuses: Record<GuestStatus, boolean> = { confirmed: true, pending: false, declined: false };
  autoAssignOverwrite = false;
  autoAssignSummary?: { assigned: number; skipped: number };

  // Venue dimensions (in meters)
  venueWidth = 12;
  venueHeight = 8;
  showVenueSettings = false;

  // Floor / Level Management
  activeFloor = 1;
  floorsList: Array<{ id: number; name: string }> = [
    { id: 1, name: 'Planta Baja' }
  ];
  showAddFloorModal = false;
  newFloorName = '';

  get visibleTables(): EventTableModel[] {
    return this.tables.filter(t => (t.floor || 1) === this.activeFloor);
  }

  get activeFloorObject(): { id: number; name: string } {
    return this.floorsList.find(f => f.id === this.activeFloor) || { id: this.activeFloor, name: `Piso ${this.activeFloor}` };
  }

  selectFloor(floorId: number): void {
    this.activeFloor = floorId;
    this.selectedTable = undefined;
  }

  openAddFloorModal(): void {
    const nextId = this.floorsList.length + 1;
    this.newFloorName = nextId === 2 ? 'Segundo Piso' : `Piso ${nextId}`;
    this.showAddFloorModal = true;
  }

  addFloor(): void {
    if (!this.newFloorName.trim()) return;
    const nextId = Math.max(0, ...this.floorsList.map(f => f.id)) + 1;
    const newFloor = { id: nextId, name: this.newFloorName.trim() };
    this.floorsList = [...this.floorsList, newFloor];
    this.activeFloor = nextId;
    this.showAddFloorModal = false;
    this.message = `Nivel "${newFloor.name}" agregado.`;
    setTimeout(() => this.message = '', 3000);
  }

  setTableFloor(table: EventTableModel, floorId: number): void {
    const tableId = this.getTableId(table);
    if (!this.eventId || !tableId) return;
    const floorObj = this.floorsList.find(f => f.id === floorId) || { id: floorId, name: `Piso ${floorId}` };

    this.api.updateTable(this.eventId, tableId, { floor: floorId, floorName: floorObj.name }).subscribe({
      next: () => {
        table.floor = floorId;
        table.floorName = floorObj.name;
        this.message = `"${table.name}" movida a ${floorObj.name}.`;
        this.loadTables(this.eventId!);
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al cambiar piso de la mesa.';
      }
    });
  }

  floorTableCount(floorId: number): number {
    return this.tables.filter(t => (t.floor || 1) === floorId).length;
  }

  shapes: { value: TableShape; label: string; icon: string; category: 'table' | 'element' }[] = [
    // Mesas de invitados
    { value: 'round', label: 'Mesa Redonda', icon: '⭕', category: 'table' },
    { value: 'rect', label: 'Mesa Rectangular', icon: '⬜', category: 'table' },
    { value: 'oval', label: 'Mesa Ovalada', icon: '🔵', category: 'table' },
    { value: 'square', label: 'Mesa Cuadrada', icon: '🟩', category: 'table' },

    // Elementos del Salón / Evento
    { value: 'dance_floor', label: '💃 Pista de Baile', icon: '💃', category: 'element' },
    { value: 'stage_dj', label: '🎧 Escenario / DJ', icon: '🎧', category: 'element' },
    { value: 'bar', label: '🍸 Barra de Bebidas', icon: '🍸', category: 'element' },
    { value: 'gift_table', label: '🎁 Mesa de Regalos', icon: '🎁', category: 'element' },
    { value: 'cake_table', label: '🎂 Mesa de Pastel', icon: '🎂', category: 'element' },
    { value: 'photobooth', label: '📷 Photocall / Photo Booth', icon: '📷', category: 'element' },
    { value: 'entrance', label: '🚪 Entrada / Acceso', icon: '🚪', category: 'element' }
  ];

  eventTypeIcon(type?: string): string {
    switch (type) {
      case 'boda': return '💍';
      case 'xv': return '👑';
      case 'bautizo': return '🕊️';
      case 'cumpleanos': return '🎂';
      case 'graduacion': return '🎓';
      case 'baby_shower': return '🍼';
      case 'corporativo': return '💼';
      default: return '🎉';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {}

  load(): void {
    const eventId = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.api.getEvent(eventId).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loadTables(eventId);
        this.loadGuests(eventId);
      },
      error: (err) => { this.error = err.error?.message || 'Evento no encontrado'; this.loading = false; }
    });
  }

  private loadTables(eventId: string): void {
    this.api.listTables(eventId).subscribe({
      next: ({ tables }) => {
        this.tables = tables.map((t, i) => ({
          ...t,
          floor: t.floor || 1,
          floorName: t.floorName || (t.floor === 2 ? 'Segundo Piso' : (t.floor && t.floor > 1 ? `Piso ${t.floor}` : 'Planta Baja')),
          x: t.x || (100 + (i % 5) * 200),
          y: t.y || (100 + Math.floor(i / 5) * 200),
          shape: t.shape || 'round',
          width: t.width || 120,
          height: t.height || 120
        }));

        // Rebuild floorsList dynamically from existing tables
        const floorMap = new Map<number, string>();
        floorMap.set(1, 'Planta Baja');
        this.tables.forEach(t => {
          const fId = t.floor || 1;
          const fName = t.floorName || (fId === 1 ? 'Planta Baja' : `Piso ${fId}`);
          floorMap.set(fId, fName);
        });

        this.floorsList = Array.from(floorMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([id, name]) => ({ id, name }));

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadGuests(eventId: string): void {
    this.api.listGuests(eventId).subscribe({ next: ({ guests }) => this.guests = guests, error: () => {} });
  }

  get eventId(): string { return this.event?._id || this.event?.id || ''; }

  get unassignedGuests(): GuestModel[] {
    const search = this.guestSearch.toLowerCase().trim();
    return this.guests.filter(g => {
      if (g.tableName) return false;
      if (search && !g.name.toLowerCase().includes(search)) return false;
      if (this.guestStatusFilter !== 'all' && g.status !== this.guestStatusFilter) return false;
      if (this.guestGroupFilter && (g.group || '') !== this.guestGroupFilter) return false;
      return true;
    });
  }

  get groups(): string[] {
    return Array.from(new Set(this.guests.map(g => g.group).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  }

  get selectedAutoAssignStatuses(): GuestStatus[] {
    return (Object.keys(this.autoAssignStatuses) as GuestStatus[]).filter(status => this.autoAssignStatuses[status]);
  }

  get missingTables(): Array<{ name: string; guests: number; seats: number }> {
    const tableNames = new Set(this.tables.map(t => t.name.trim().toLowerCase()));
    const missingMap = new Map<string, { name: string; guests: number; seats: number }>();
    
    this.guests.forEach(g => {
      if (g.tableName && g.tableName.trim()) {
        const nameTrimmed = g.tableName.trim();
        const nameLower = nameTrimmed.toLowerCase();
        if (!tableNames.has(nameLower)) {
          const current = missingMap.get(nameLower) || { name: nameTrimmed, guests: 0, seats: 0 };
          current.guests += 1;
          current.seats += 1 + (g.allowedCompanions || 0);
          missingMap.set(nameLower, current);
        }
      }
    });
    
    return Array.from(missingMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getTableId(t: EventTableModel): string { return (t as any)._id || (t as any).id || ''; }
  getGuestId(g: GuestModel): string { return (g as any)._id || (g as any).id || ''; }

  tableColor(t: EventTableModel): string {
    const occupied = t.occupied || 0;
    if (occupied > t.capacity) return 'var(--nw-danger)';    // Red (over capacity)
    if (occupied === t.capacity) return 'var(--nw-success)'; // Green (full/complete)
    return 'var(--nw-info)';                                 // Blue (has empty seats / gaps)
  }

  tableFill(t: EventTableModel): string {
    const occupied = t.occupied || 0;
    if (occupied > t.capacity) return 'rgba(248,113,113,.15)';    // Translucent Red
    if (occupied === t.capacity) return 'rgba(52,211,153,.15)';   // Translucent Green
    return 'rgba(96,165,250,.12)';                                // Translucent Blue
  }

  occupancyPercent(t: EventTableModel): number {
    return t.capacity ? Math.min(100, ((t.occupied || 0) / t.capacity) * 100) : 0;
  }

  isElementShape(shape?: string): boolean {
    return ['dance_floor', 'stage_dj', 'bar', 'gift_table', 'cake_table', 'photobooth', 'entrance'].includes(shape || '');
  }

  onShapeSelect(shape: TableShape): void {
    this.newTable.shape = shape;
    switch (shape) {
      case 'dance_floor':
        this.newTable.name = 'Pista de Baile';
        this.newTable.capacity = 0;
        this.newTable.width = 4.0;
        this.newTable.height = 4.0;
        break;
      case 'stage_dj':
        this.newTable.name = 'Escenario / DJ';
        this.newTable.capacity = 0;
        this.newTable.width = 3.2;
        this.newTable.height = 1.8;
        break;
      case 'bar':
        this.newTable.name = 'Barra de Bebidas';
        this.newTable.capacity = 0;
        this.newTable.width = 3.0;
        this.newTable.height = 1.2;
        break;
      case 'gift_table':
        this.newTable.name = 'Mesa de Regalos';
        this.newTable.capacity = 0;
        this.newTable.width = 2.2;
        this.newTable.height = 1.2;
        break;
      case 'cake_table':
        this.newTable.name = 'Mesa de Pastel';
        this.newTable.capacity = 0;
        this.newTable.width = 1.6;
        this.newTable.height = 1.6;
        break;
      case 'photobooth':
        this.newTable.name = 'Photo Booth';
        this.newTable.capacity = 0;
        this.newTable.width = 2.4;
        this.newTable.height = 1.6;
        break;
      case 'entrance':
        this.newTable.name = 'Entrada Principal';
        this.newTable.capacity = 0;
        this.newTable.width = 2.4;
        this.newTable.height = 1.0;
        break;
      default:
        const diningTables = this.tables.filter(t => !this.isElementShape(t.shape));
        this.newTable.name = `Mesa ${diningTables.length + 1}`;
        this.newTable.capacity = 8;
        this.newTable.width = 1.2;
        this.newTable.height = 1.2;
        break;
    }
  }

  // ── Create Table / Element ──
  openCreateModal(): void {
    const diningTables = this.tables.filter(t => !this.isElementShape(t.shape));
    this.newTable = { name: `Mesa ${diningTables.length + 1}`, capacity: 8, shape: 'round', width: 1.2, height: 1.2 };
    this.createError = '';
    this.showCreateModal = true;
  }

  createTable(): void {
    if (!this.newTable.name.trim()) { this.createError = 'Nombre requerido'; return; }
    this.creating = true;
    this.createError = '';

    // Position in empty area
    const x = 80 + (this.tables.length % 5) * 180;
    const y = 80 + Math.floor(this.tables.length / 5) * 180;

    this.api.createTable(this.eventId, {
      name: this.newTable.name.trim(),
      capacity: this.isElementShape(this.newTable.shape) ? 0 : Math.max(1, Number(this.newTable.capacity || 1)),
      shape: this.newTable.shape,
      width: Math.min(1200, Math.max(40, Math.round((this.newTable.width || 1.2) * 100))),
      height: Math.min(1200, Math.max(40, Math.round((this.newTable.height || 1.2) * 100))),
      floor: this.activeFloor,
      floorName: this.activeFloorObject.name,
      x, y, order: this.tables.length
    }).subscribe({
      next: ({ table }) => {
        this.tables = [...this.tables, { 
          ...table, 
          x: table.x || x, 
          y: table.y || y, 
          shape: table.shape || this.newTable.shape, 
          width: table.width || Math.round(this.newTable.width * 100), 
          height: table.height || Math.round(this.newTable.height * 100), 
          guests: [] 
        }];
        this.showCreateModal = false;
        this.creating = false;
        this.message = `Mesa "${table.name}" creada`;
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => { this.createError = err.error?.message || 'Error creando mesa'; this.creating = false; }
    });
  }

  openAutoAssignModal(): void {
    this.showAutoAssignModal = true;
    this.autoAssignError = '';
    this.autoAssignResult = undefined;
  }

  runAutoAssign(): void {
    const eventId = this.route.snapshot.paramMap.get('id') || '';
    if (!eventId) return;

    const includeStatuses: string[] = [];
    if (this.autoAssignForm.includeConfirmed) includeStatuses.push('confirmed');
    if (this.autoAssignForm.includePending) includeStatuses.push('pending');
    if (this.autoAssignForm.includeDeclined) includeStatuses.push('declined');

    if (includeStatuses.length === 0) {
      this.autoAssignError = 'Debes seleccionar al menos un estado de invitado a incluir.';
      return;
    }

    this.autoAssigning = true;
    this.autoAssignError = '';
    this.autoAssignResult = undefined;

    this.api.autoAssignTables(eventId, {
      strategy: this.autoAssignForm.strategy,
      includeStatuses,
      overwrite: this.autoAssignForm.overwrite
    }).subscribe({
      next: (res) => {
        this.autoAssigning = false;
        this.autoAssignResult = res;
        this.message = `Asignación automática completada: ${res.assigned.length} invitados asignados.`;
        this.loadTables(eventId);
        this.loadGuests(eventId);
        setTimeout(() => this.message = '', 4000);
      },
      error: (err) => {
        this.autoAssigning = false;
        this.autoAssignError = err.error?.message || 'Error al ejecutar la asignación automática de mesas.';
      }
    });
  }

  clearingTables = false;

  get hasAssignedGuests(): boolean {
    return this.guests.some(g => !!g.tableName);
  }

  clearAssignments(): void {
    const assigned = this.guests.filter(g => !!g.tableName && !!(g._id || g.id));
    if (assigned.length === 0) {
      this.message = 'No hay invitados con mesa asignada.';
      setTimeout(() => this.message = '', 3000);
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas desasignar a los ${assigned.length} invitados de sus mesas?`)) {
      return;
    }

    const eventId = this.route.snapshot.paramMap.get('id') || '';
    this.clearingTables = true;
    const requests = assigned.map(g => this.api.updateGuest((g._id || g.id)!, { tableName: '', seatLabel: '' } as any));

    forkJoin(requests).subscribe({
      next: () => {
        this.clearingTables = false;
        this.message = `Se desasignaron ${assigned.length} invitados de sus mesas.`;
        if (eventId) {
          this.loadTables(eventId);
          this.loadGuests(eventId);
        }
        setTimeout(() => this.message = '', 4000);
      },
      error: (err) => {
        this.clearingTables = false;
        this.error = err.error?.message || 'Error al limpiar asignaciones de mesas.';
      }
    });
  }

  createMissingTable(name: string, capacity: number): void {
    this.creating = true;
    const x = 80 + (this.tables.length % 5) * 180;
    const y = 80 + Math.floor(this.tables.length / 5) * 180;

    // Use default capacity of 8, or dynamic capacity if more seats are needed
    const defaultCapacity = Math.max(8, capacity);

    this.api.createTable(this.eventId, {
      name: name,
      capacity: defaultCapacity,
      shape: 'round',
      width: 120,
      height: 120,
      x, y, order: this.tables.length
    }).subscribe({
      next: ({ table }) => {
        this.tables = [...this.tables, { 
          ...table, 
          x: table.x || x, 
          y: table.y || y, 
          shape: table.shape || 'round', 
          width: table.width || 120, 
          height: table.height || 120, 
          guests: [] 
        }];
        this.creating = false;
        // Reload to recalculate occupancies and assigned guests lists
        this.loadTables(this.eventId);
        this.loadGuests(this.eventId);
        this.message = `Mesa "${name}" colocada en el croquis`;
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al colocar mesa faltante';
        this.creating = false;
      }
    });
  }

  autoAssignTables(): void {
    if (!this.eventId) return;
    const includeStatuses = this.selectedAutoAssignStatuses;
    if (!includeStatuses.length) {
      this.error = 'Selecciona al menos un estado para autoasignar.';
      return;
    }
    if (this.autoAssignOverwrite && !confirm('Esto puede reemplazar mesas ya asignadas para los estados seleccionados. ¿Continuar?')) return;

    this.autoAssigning = true;
    this.error = '';
    this.autoAssignSummary = undefined;
    this.api.autoAssignTables(this.eventId, {
      strategy: this.autoAssignStrategy,
      includeStatuses,
      overwrite: this.autoAssignOverwrite
    }).subscribe({
      next: ({ assigned, skipped, tables }) => {
        this.tables = tables;
        this.autoAssignSummary = { assigned: assigned.length, skipped: skipped.length };
        this.message = `Autoasignación lista: ${assigned.length} asignados, ${skipped.length} sin espacio.`;
        this.autoAssigning = false;
        this.loadGuests(this.eventId);
        setTimeout(() => this.message = '', 4000);
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo autoasignar mesas.';
        this.autoAssigning = false;
      }
    });
  }

  updateTableProperties(t: EventTableModel): void {
    const tableId = this.getTableId(t);
    if (!this.eventId || !tableId) return;
    this.api.updateTable(this.eventId, tableId, {
      name: t.name,
      capacity: Number(t.capacity),
      shape: t.shape,
      width: Number(t.width),
      height: Number(t.height)
    } as any).subscribe({
      next: () => {
        // Reload to recalculate occupied seats and overCapacity flags
        this.loadTables(this.eventId);
        this.loadGuests(this.eventId);
        this.message = `Mesa "${t.name}" actualizada`;
        setTimeout(() => this.message = '', 2000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al actualizar la mesa';
      }
    });
  }

  deleteTable(t: EventTableModel): void {
    if (!confirm(`¿Eliminar mesa "${t.name}"?`)) return;
    this.api.deleteTable(this.eventId, this.getTableId(t)).subscribe({
      next: () => {
        this.tables = this.tables.filter(table => this.getTableId(table) !== this.getTableId(t));
        if (this.selectedTable && this.getTableId(this.selectedTable) === this.getTableId(t)) this.selectedTable = undefined;
        this.message = 'Mesa eliminada';
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => this.error = err.error?.message || 'Error eliminando mesa'
    });
  }

  // ── Drag Tables ──
  onTableMouseDown(event: MouseEvent, table: EventTableModel): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedTable = table;
    const svg = this.svgCanvas.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());

    this.drag = {
      active: true,
      tableId: this.getTableId(table),
      startX: svgPt.x,
      startY: svgPt.y,
      tableStartX: table.x || 0,
      tableStartY: table.y || 0
    };
  }

  onSvgMouseMove(event: MouseEvent): void {
    if (this.drag.active) {
      const svg = this.svgCanvas.nativeElement;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());

      const dx = svgPt.x - this.drag.startX;
      const dy = svgPt.y - this.drag.startY;

      const table = this.tables.find(t => this.getTableId(t) === this.drag.tableId);
      if (table) {
        table.x = Math.max(0, Math.min((this.venueWidth * 100) - (table.width || 120), this.drag.tableStartX + dx));
        table.y = Math.max(0, Math.min((this.venueHeight * 100) - (table.height || 120), this.drag.tableStartY + dy));
      }
    } else if (this.isPanning) {
      const dx = (event.clientX - this.panStart.x) / this.zoom;
      const dy = (event.clientY - this.panStart.y) / this.zoom;
      this.viewBox.x = this.panStart.vx - dx;
      this.viewBox.y = this.panStart.vy - dy;
    }
  }

  onSvgMouseUp(): void {
    if (this.drag.active) {
      const table = this.tables.find(t => this.getTableId(t) === this.drag.tableId);
      if (table) {
        this.api.updateTable(this.eventId, this.getTableId(table), {
          x: Math.round(table.x || 0),
          y: Math.round(table.y || 0)
        } as any).subscribe({ error: () => {} });
      }
      this.drag.active = false;
    }
    this.isPanning = false;
  }

  onSvgMouseDown(event: MouseEvent): void {
    if ((event.target as Element)?.tagName === 'svg' || (event.target as Element)?.classList?.contains('venue-bg')) {
      this.selectedTable = undefined;
      this.isPanning = true;
      this.panStart = { x: event.clientX, y: event.clientY, vx: this.viewBox.x, vy: this.viewBox.y };
    }
  }

  // ── Zoom ──
  zoomIn(): void {
    this.zoom = Math.min(3, this.zoom * 1.2);
    this.updateViewBox();
  }

  zoomOut(): void {
    this.zoom = Math.max(0.3, this.zoom / 1.2);
    this.updateViewBox();
  }

  resetView(): void {
    this.zoom = 1;
    this.viewBox = { x: 0, y: 0, w: this.venueWidth * 100, h: this.venueHeight * 100 };
  }

  private updateViewBox(): void {
    this.viewBox.w = (this.venueWidth * 100) / this.zoom;
    this.viewBox.h = (this.venueHeight * 100) / this.zoom;
  }

  get viewBoxStr(): string {
    return `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`;
  }

  // ── Guest Assignment ──
  startDragGuest(event: DragEvent, guest: GuestModel): void {
    this.draggedGuest = guest;
    event.dataTransfer?.setData('text/plain', this.getGuestId(guest));
  }

  onTableDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onTableDrop(event: DragEvent, table: EventTableModel): void {
    event.preventDefault();
    if (!this.draggedGuest) return;
    const guestId = this.getGuestId(this.draggedGuest);
    this.api.updateGuest(guestId, { tableName: table.name } as any).subscribe({
      next: () => {
        this.loadTables(this.eventId);
        this.loadGuests(this.eventId);
        this.message = `${this.draggedGuest!.name} asignado a ${table.name}`;
        this.draggedGuest = undefined;
        setTimeout(() => this.message = '', 3000);
      },
      error: () => { this.draggedGuest = undefined; }
    });
  }

  unassignGuest(guest: { id: string; name: string }): void {
    this.api.updateGuest(guest.id, { tableName: '' } as any).subscribe({
      next: () => {
        this.loadTables(this.eventId);
        this.loadGuests(this.eventId);
        this.message = `${guest.name} desasignado`;
        setTimeout(() => this.message = '', 3000);
      },
      error: () => {}
    });
  }

  guestInitials(name: string): string {
    return name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  goBack(): void {
    this.router.navigate(['/new/events', this.eventId]);
  }

  // ── SVG Shape Helpers ──
  tableCx(t: EventTableModel): number { return (t.x || 0) + (t.width || 120) / 2; }
  tableCy(t: EventTableModel): number { return (t.y || 0) + (t.height || 120) / 2; }
  tableRx(t: EventTableModel): number { return (t.width || 120) / 2; }
  tableRy(t: EventTableModel): number { return (t.height || 120) / 2; }

  // ── Export Multi-Floor Plan PDF ──
  exportPDFPlan(): void {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const eventTitle = this.event?.title || 'Evento';
    const totalTablesCount = this.tables.length;
    const totalSeatsCount = this.tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
    const totalOccupiedCount = this.tables.reduce((acc, t) => acc + (t.occupied || 0), 0);

    let floorsHtml = '';

    this.floorsList.forEach(floorObj => {
      const floorTables = this.tables.filter(t => (t.floor || 1) === floorObj.id);

      // SVG graphics for this floor
      let svgTablesHtml = '';
      floorTables.forEach(t => {
        const cx = this.tableCx(t);
        const cy = this.tableCy(t);
        const rx = this.tableRx(t);
        const ry = this.tableRy(t);
        const w = t.width || 120;
        const h = t.height || 120;
        const isElem = this.isElementShape(t.shape);

        let shapeSvg = '';
        switch (t.shape) {
          case 'round':
            shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(96,165,250,.12)" stroke="#3b82f6" stroke-width="2"/>`;
            break;
          case 'oval':
            shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry * 0.65}" fill="rgba(96,165,250,.12)" stroke="#3b82f6" stroke-width="2"/>`;
            break;
          case 'rect':
          case 'square':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${t.shape === 'square' ? w : h}" rx="6" fill="rgba(96,165,250,.12)" stroke="#3b82f6" stroke-width="2"/>`;
            break;
          case 'dance_floor':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="8" fill="rgba(139,92,246,.14)" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="6 3"/>`;
            break;
          case 'stage_dj':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="8" fill="rgba(30,41,59,.9)" stroke="#6366f1" stroke-width="2.5"/>`;
            break;
          case 'bar':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="8" fill="rgba(245,158,11,.15)" stroke="#f59e0b" stroke-width="2.5"/>`;
            break;
          case 'gift_table':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="8" fill="rgba(236,72,153,.15)" stroke="#ec4899" stroke-width="2.5"/>`;
            break;
          case 'cake_table':
            shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(244,114,182,.18)" stroke="#f472b6" stroke-width="2.5"/>`;
            break;
          case 'photobooth':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="8" fill="rgba(59,130,246,.15)" stroke="#3b82f6" stroke-width="2.5"/>`;
            break;
          case 'entrance':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="6" fill="rgba(16,185,129,.15)" stroke="#10b981" stroke-width="2.5"/>`;
            break;
          default:
            shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(96,165,250,.12)" stroke="#3b82f6" stroke-width="2"/>`;
            break;
        }

        const seatsSvg = this.seatPositions(t).map((s, si) => 
          `<circle cx="${s.cx}" cy="${s.cy}" r="6" fill="${si < (t.occupied || 0) ? '#3b82f6' : '#cbd5e1'}" stroke="#3b82f6" stroke-width="1"/>`
        ).join('');

        const labelText = `<text x="${cx}" y="${isElem ? cy : cy - 5}" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" font-size="12" font-weight="700">${t.name}</text>`;
        const occText = !isElem ? `<text x="${cx}" y="${cy + 10}" text-anchor="middle" dominant-baseline="middle" fill="#2563eb" font-size="10" font-weight="600">${t.occupied || 0}/${t.capacity}</text>` : '';

        svgTablesHtml += `<g>${shapeSvg}${seatsSvg}${labelText}${occText}</g>`;
      });

      // Tables Breakdown HTML
      let tablesBreakdownHtml = '';
      floorTables.forEach(t => {
        const isElem = this.isElementShape(t.shape);
        const guestsList = t.guests?.map(g => 
          `<li><strong>${g.name}</strong> (${g.seats} lugar${g.seats !== 1 ? 'es' : ''})${g.group ? ` <span class="badge">🏷️ ${g.group}</span>` : ''}</li>`
        ).join('') || '<li class="empty">Sin invitados asignados</li>';

        tablesBreakdownHtml += `
          <div class="table-card">
            <div class="table-card-header">
              <strong>${t.name}</strong>
              <span>${isElem ? 'Elemento' : `Capacidad: ${t.occupied || 0}/${t.capacity}`}</span>
            </div>
            <ul class="guest-list">
              ${guestsList}
            </ul>
          </div>
        `;
      });

      floorsHtml += `
        <div class="floor-page">
          <div class="floor-title-bar">
            <h2>🏢 ${floorObj.name}</h2>
            <span>${floorTables.length} elementos/mesas en este nivel</span>
          </div>

          <div class="svg-container">
            <svg viewBox="0 0 ${this.venueWidth * 100} ${this.venueHeight * 100}" width="100%" height="100%">
              <rect x="0" y="0" width="${this.venueWidth * 100}" height="${this.venueHeight * 100}" fill="#f8fafc" rx="8" stroke="#cbd5e1" stroke-width="2"/>
              ${svgTablesHtml}
            </svg>
          </div>

          <h3 style="margin-top:16px; margin-bottom:8px; font-size:13px; text-transform:uppercase; color:#64748b;">Desglose de Mesas e Invitados</h3>
          <div class="tables-grid">
            ${tablesBreakdownHtml || '<p style="color:#94a3b8;">No hay mesas registradas en este nivel.</p>'}
          </div>
        </div>
      `;
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plano de Mesas - ${eventTitle}</title>
        <style>
          @page { size: landscape A4; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 22px; color: #1e293b; }
          .header p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
          .stats-bar { display: flex; gap: 16px; font-size: 13px; font-weight: 600; color: #334155; }
          .floor-page { page-break-after: always; padding-bottom: 20px; }
          .floor-page:last-child { page-break-after: avoid; }
          .floor-title-bar { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 8px 14px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #3b82f6; }
          .floor-title-bar h2 { margin: 0; font-size: 16px; color: #1e293b; }
          .floor-title-bar span { font-size: 12px; color: #64748b; }
          .svg-container { width: 100%; height: 320px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
          .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
          .table-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; background: #fff; font-size: 12px; page-break-inside: avoid; }
          .table-card-header { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; }
          .guest-list { margin: 0; padding-left: 14px; font-size: 11px; color: #334155; }
          .guest-list li { margin-bottom: 2px; }
          .guest-list li.empty { list-style-type: none; margin-left: -14px; color: #94a3b8; font-style: italic; }
          .badge { font-size: 10px; color: #2563eb; background: #eff6ff; padding: 1px 4px; border-radius: 4px; font-weight: 600; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>🪑 Plano Completo de Distribución de Mesas</h1>
            <p><strong>Evento:</strong> ${eventTitle}</p>
          </div>
          <div class="stats-bar">
            <span><strong>Niveles:</strong> ${this.floorsList.length}</span>
            <span><strong>Mesas:</strong> ${totalTablesCount}</span>
            <span><strong>Lugares:</strong> ${totalOccupiedCount}/${totalSeatsCount}</span>
          </div>
        </div>

        ${floorsHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(fullHtml);
    printWin.document.close();
  }

  // Generate seat positions around the table
  seatPositions(t: EventTableModel): Array<{ cx: number; cy: number }> {
    if (this.isElementShape(t.shape) || !t.capacity || t.capacity <= 0) {
      return [];
    }
    const seats: Array<{ cx: number; cy: number }> = [];
    const count = t.capacity;
    const shape = t.shape || 'round';

    if (shape === 'rect' || shape === 'square') {
      const x = t.x || 0;
      const y = t.y || 0;
      const w = t.width || 120;
      const h = shape === 'square' ? w : (t.height || 120);
      const offset = 14; // Distance from table edge to seat center (radius 8 + gap 6)

      // Total perimeter length of the table
      const L = 2 * w + 2 * h;
      const step = L / count;

      for (let i = 0; i < count; i++) {
        // Distribute seats evenly along the perimeter path
        const d = (i * step) + (step / 2);
        let cx = 0;
        let cy = 0;

        if (d <= w) {
          // Top edge
          cx = x + d;
          cy = y - offset;
        } else if (d <= w + h) {
          // Right edge
          cx = x + w + offset;
          cy = y + (d - w);
        } else if (d <= 2 * w + h) {
          // Bottom edge
          cx = x + w - (d - (w + h));
          cy = y + h + offset;
        } else {
          // Left edge
          cx = x - offset;
          cy = y + h - (d - (2 * w + h));
        }
        seats.push({ cx, cy });
      }
    } else {
      // Oval, round or default (ellipse distribution)
      const cx = this.tableCx(t);
      const cy = this.tableCy(t);
      const rx = this.tableRx(t) + 18;
      const ry = t.shape === 'oval' ? (this.tableRy(t) * 0.65) + 18 : this.tableRy(t) + 18;
      for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        seats.push({ cx: cx + rx * Math.cos(angle), cy: cy + ry * Math.sin(angle) });
      }
    }
    return seats;
  }

  occupiedSeats(t: EventTableModel): number { return t.occupied || 0; }

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

  getTableTooltip(t: EventTableModel): string {
    if (!t.guests || t.guests.length === 0) return 'Sin invitados asignados';
    return t.guests.map(g => `• ${g.name}${g.group ? ' (' + g.group + ')' : ''} [${g.seats} lug.]`).join('\n');
  }
}
