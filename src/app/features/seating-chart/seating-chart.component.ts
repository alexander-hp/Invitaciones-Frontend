import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
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
  isInspectorCollapsed = false;

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
  showAdvancedDimensions = false;
  createTab: 'single' | 'batch' = 'single';
  newTable: { name: string; capacity: number; shape: TableShape; width: number; height: number; floor?: number } = { name: '', capacity: 8, shape: 'round' as TableShape, width: 1.2, height: 1.2, floor: 1 };
  batchForm = {
    quantity: 10,
    capacity: 8,
    floor: 1,
    shape: 'round' as TableShape,
    prefix: 'Mesa',
    width: 1.2,
    height: 1.2
  };
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
    overwrite: true
  };

  clearingTables = false;
  deletingAllTables = false;

  // Guest Detail Modal
  showGuestDetailModal = false;
  loadingGuestDetail = false;
  selectedGuestForDetail: GuestModel | null = null;

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
  showToolsInSidebar = false;
  showHeroHeader = true;

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

  deleteFloor(floorId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.floorsList.length <= 1) {
      this.error = 'Debe haber al menos un nivel en el recinto.';
      setTimeout(() => this.error = '', 3000);
      return;
    }
    const floorObj = this.floorsList.find(f => f.id === floorId);
    if (!floorObj) return;

    const count = this.floorTableCount(floorId);
    const confirmMsg = count > 0 
      ? `¿Eliminar el nivel "${floorObj.name}"? Sus ${count} mesa(s) se moverán automáticamente a Planta Baja.`
      : `¿Estás seguro de eliminar el nivel "${floorObj.name}"?`;

    this.confirmDialogService.confirm({
      title: 'Eliminar Nivel',
      message: confirmMsg,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;

      const tablesOnFloor = this.tables.filter(t => (t.floor || 1) === floorId);
      if (tablesOnFloor.length > 0 && this.eventId) {
        const requests = tablesOnFloor.map(t =>
          this.api.updateTable(this.eventId, this.getTableId(t), { floor: 1, floorName: 'Planta Baja' } as any)
        );
        forkJoin(requests).subscribe({
          next: () => {
            this.tables.forEach(t => {
              if ((t.floor || 1) === floorId) {
                t.floor = 1;
                t.floorName = 'Planta Baja';
              }
            });
            this.finishFloorDeletion(floorId, floorObj.name);
          },
          error: (err) => {
            this.error = err.error?.message || 'Error al reubicar mesas del nivel.';
          }
        });
      } else {
        this.finishFloorDeletion(floorId, floorObj.name);
      }
    });
  }

  private finishFloorDeletion(floorId: number, floorName: string): void {
    this.floorsList = this.floorsList.filter(f => f.id !== floorId);
    if (this.activeFloor === floorId) {
      this.activeFloor = this.floorsList[0]?.id || 1;
    }
    this.message = `Nivel "${floorName}" eliminado correctamente.`;
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private confirmDialogService: ConfirmDialogService
  ) {}

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
        if (event.venue?.width) {
          this.venueWidth = event.venue.width;
        }
        if (event.venue?.height) {
          this.venueHeight = event.venue.height;
        }
        this.loadTables(eventId);
        this.loadGuests(eventId);
      },
      error: (err) => { this.error = err.error?.message || 'Evento no encontrado'; this.loading = false; }
    });
  }

  saveVenueDimensions(): void {
    const eventId = this.eventId;
    if (!eventId) return;

    const currentVenue = this.event?.venue || {};
    const newWidth = Number(this.venueWidth) || 12;
    const newHeight = Number(this.venueHeight) || 8;

    const updatedVenue = {
      ...currentVenue,
      width: newWidth,
      height: newHeight
    };

    this.api.updateEvent(eventId, { venue: updatedVenue }).subscribe({
      next: ({ event }) => {
        if (this.event) {
          this.event.venue = event.venue;
        }
        this.resetView();
        this.message = 'Medidas del salón guardadas correctamente.';
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al guardar las medidas del salón.';
      }
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

  onBatchShapeSelect(shape: TableShape): void {
    this.batchForm.shape = shape;
    switch (shape) {
      case 'rect':
        this.batchForm.width = 2.0;
        this.batchForm.height = 1.0;
        break;
      case 'oval':
        this.batchForm.width = 2.2;
        this.batchForm.height = 1.2;
        break;
      case 'square':
        this.batchForm.width = 1.5;
        this.batchForm.height = 1.5;
        break;
      case 'round':
      default:
        this.batchForm.width = 1.2;
        this.batchForm.height = 1.2;
        break;
    }
  }

  // ── Create Table / Element ──
  openCreateModal(): void {
    const diningTables = this.tables.filter(t => !this.isElementShape(t.shape));
    this.newTable = {
      name: `Mesa ${diningTables.length + 1}`,
      capacity: 8,
      shape: 'round',
      width: 1.2,
      height: 1.2,
      floor: this.activeFloor
    };
    this.batchForm = {
      quantity: 10,
      capacity: 8,
      floor: this.activeFloor,
      shape: 'round',
      prefix: 'Mesa',
      width: 1.2,
      height: 1.2
    };
    this.createTab = 'single';
    this.showAdvancedDimensions = false;
    this.createError = '';
    this.showCreateModal = true;
  }

  createTable(): void {
    if (!this.newTable.name.trim()) { this.createError = 'Nombre requerido'; return; }
    this.creating = true;
    this.createError = '';

    const targetFloorId = Number(this.newTable.floor || this.activeFloor);
    const floorObj = this.floorsList.find(f => f.id === targetFloorId) || { id: targetFloorId, name: `Piso ${targetFloorId}` };

    // Position in empty area of selected floor
    const floorTables = this.tables.filter(t => (t.floor || 1) === targetFloorId);
    const x = 80 + (floorTables.length % 5) * 180;
    const y = 80 + Math.floor(floorTables.length / 5) * 180;

    this.api.createTable(this.eventId, {
      name: this.newTable.name.trim(),
      capacity: this.isElementShape(this.newTable.shape) ? 0 : Math.max(1, Number(this.newTable.capacity || 1)),
      shape: this.newTable.shape,
      width: Math.min(1200, Math.max(40, Math.round((this.newTable.width || 1.2) * 100))),
      height: Math.min(1200, Math.max(40, Math.round((this.newTable.height || 1.2) * 100))),
      floor: targetFloorId,
      floorName: floorObj.name,
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
          floor: table.floor || targetFloorId,
          floorName: table.floorName || floorObj.name,
          guests: [] 
        }];
        this.activeFloor = targetFloorId;
        this.showCreateModal = false;
        this.creating = false;
        this.message = `Mesa "${table.name}" creada en ${floorObj.name}`;
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => { this.createError = err.error?.message || 'Error creando mesa'; this.creating = false; }
    });
  }

  createBatchTables(): void {
    const qty = Math.max(1, Math.min(50, Number(this.batchForm.quantity || 1)));
    const cap = Math.max(1, Math.min(100, Number(this.batchForm.capacity || 1)));
    const targetFloorId = Number(this.batchForm.floor || this.activeFloor);
    const floorObj = this.floorsList.find(f => f.id === targetFloorId) || { id: targetFloorId, name: `Piso ${targetFloorId}` };
    const shape = this.batchForm.shape || 'round';
    const prefix = (this.batchForm.prefix || 'Mesa').trim();

    this.creating = true;
    this.createError = '';

    const existingNames = new Set(this.tables.map(t => t.name.toLowerCase()));
    
    let startNumber = 1;
    const prefixLower = prefix.toLowerCase();
    const regex = new RegExp(`^${prefixLower}\\s*(\\d+)$`, 'i');
    for (const t of this.tables) {
      const match = t.name.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= startNumber) {
          startNumber = num + 1;
        }
      }
    }

    const floorTableCount = this.tables.filter(t => (t.floor || 1) === targetFloorId).length;

    const payloadList: Array<{ name: string; capacity: number; shape: string; width: number; height: number; floor: number; floorName: string; x: number; y: number; order: number }> = [];

    let currentNum = startNumber;
    for (let i = 0; i < qty; i++) {
      let tableName = `${prefix} ${currentNum}`;
      while (existingNames.has(tableName.toLowerCase())) {
        currentNum++;
        tableName = `${prefix} ${currentNum}`;
      }
      existingNames.add(tableName.toLowerCase());

      const idx = floorTableCount + i;
      const col = idx % 5;
      const row = Math.floor(idx / 5);
      const x = 80 + col * 180;
      const y = 80 + row * 180;

      const widthPx = Math.min(1200, Math.max(40, Math.round((this.batchForm.width || 1.2) * 100)));
      const heightPx = Math.min(1200, Math.max(40, Math.round((this.batchForm.height || 1.2) * 100)));

      payloadList.push({
        name: tableName,
        capacity: cap,
        shape,
        width: widthPx,
        height: heightPx,
        floor: targetFloorId,
        floorName: floorObj.name,
        x,
        y,
        order: this.tables.length + i
      });
      currentNum++;
    }

    const applyTablesSuccess = (tables: EventTableModel[]) => {
      this.tables = [...this.tables, ...tables];
      this.activeFloor = targetFloorId;
      this.showCreateModal = false;
      this.creating = false;
      this.message = `¡Se crearon ${tables.length} mesas exitosamente en ${floorObj.name}!`;
      setTimeout(() => this.message = '', 4000);
    };

    this.api.createTablesBatch(this.eventId, payloadList).subscribe({
      next: ({ tables }) => {
        const mappedTables = tables.map((table, idx) => ({
          ...table,
          x: table.x || payloadList[idx].x,
          y: table.y || payloadList[idx].y,
          shape: table.shape || shape,
          width: table.width || 120,
          height: table.height || 120,
          floor: table.floor || targetFloorId,
          floorName: table.floorName || floorObj.name,
          guests: []
        }));
        applyTablesSuccess(mappedTables);
      },
      error: () => {
        // Fallback: parallel single table creation if batch route is not reached
        const requests = payloadList.map(p => this.api.createTable(this.eventId, p));
        forkJoin(requests).subscribe({
          next: (results) => {
            const mappedTables = results.map((res, idx) => ({
              ...res.table,
              x: res.table.x || payloadList[idx].x,
              y: res.table.y || payloadList[idx].y,
              shape: res.table.shape || shape,
              width: res.table.width || 120,
              height: res.table.height || 120,
              floor: res.table.floor || targetFloorId,
              floorName: res.table.floorName || floorObj.name,
              guests: []
            }));
            applyTablesSuccess(mappedTables);
          },
          error: (err) => {
            this.createError = err.error?.message || 'Error al generar mesas en lote.';
            this.creating = false;
          }
        });
      }
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

    this.confirmDialogService.confirm({
      title: 'Limpiar Asignaciones',
      message: `¿Estás seguro de que deseas desasignar a los ${assigned.length} invitados de sus mesas?`,
      confirmText: 'Sí, desasignar',
      cancelText: 'Cancelar',
      type: 'warning'
    }).then(confirmed => {
      if (!confirmed) return;

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

    const executeAutoAssign = () => {
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
    };

    if (this.autoAssignOverwrite) {
      this.confirmDialogService.confirm({
        title: 'Auto-asignación de Mesas',
        message: 'Esto puede reemplazar mesas ya asignadas para los estados seleccionados. ¿Deseas continuar?',
        confirmText: 'Sí, reemplazar',
        cancelText: 'Cancelar',
        type: 'warning'
      }).then(confirmed => {
        if (confirmed) executeAutoAssign();
      });
    } else {
      executeAutoAssign();
    }
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
    this.confirmDialogService.confirm({
      title: 'Eliminar Mesa',
      message: `¿Estás seguro de eliminar la mesa "${t.name}"?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.api.deleteTable(this.eventId, this.getTableId(t)).subscribe({
        next: () => {
          this.tables = this.tables.filter(table => this.getTableId(table) !== this.getTableId(t));
          if (this.selectedTable && this.getTableId(this.selectedTable) === this.getTableId(t)) this.selectedTable = undefined;
          this.message = 'Mesa eliminada';
          setTimeout(() => this.message = '', 3000);
        },
        error: (err) => this.error = err.error?.message || 'Error eliminando mesa'
      });
    });
  }

  deleteAllTables(): void {
    if (!this.eventId || this.tables.length === 0) return;
    const count = this.tables.length;
    this.confirmDialogService.confirm({
      title: 'Borrar Todas las Mesas',
      message: `⚠️ ¿Estás seguro de que deseas ELIMINAR TODAS LAS MESAS (${count})? Esta acción borrará todas las mesas del croquis.`,
      confirmText: 'Sí, borrar todas',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;

      this.deletingAllTables = true;
      const deleteRequests = this.tables.map(t => this.api.deleteTable(this.eventId!, this.getTableId(t)!));

      forkJoin(deleteRequests).subscribe({
        next: () => {
          this.deletingAllTables = false;
          this.selectedTable = undefined;
          this.message = `Se eliminaron las ${count} mesas correctamente.`;
          if (this.eventId) {
            this.loadTables(this.eventId);
            this.loadGuests(this.eventId);
          }
          setTimeout(() => this.message = '', 3000);
        },
        error: (err) => {
          this.deletingAllTables = false;
          this.error = err.error?.message || 'Error al borrar las mesas.';
          if (this.eventId) {
            this.loadTables(this.eventId);
            this.loadGuests(this.eventId);
          }
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
      this.api.getGuest(guestId).subscribe({
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
    const eventDateStr = this.formatDate(this.event?.date);
    const venueName = this.event?.venue?.name || '';
    const hostsStr = this.event?.hosts?.join(', ') || '';

    const totalTablesCount = this.tables.length;
    const totalSeatsCount = this.tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
    const totalOccupiedCount = this.tables.reduce((acc, t) => acc + (t.occupied || 0), 0);
    const unassignedCount = this.unassignedGuests.length;

    let floorsHtml = '';

    // Generar páginas por cada nivel / piso
    this.floorsList.forEach(floorObj => {
      const floorTables = this.tables.filter(t => (t.floor || 1) === floorObj.id);
      const floorSeatsCount = floorTables.reduce((acc, t) => acc + (t.capacity || 0), 0);
      const floorOccupiedCount = floorTables.reduce((acc, t) => acc + (t.occupied || 0), 0);

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
            shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(192, 156, 120, 0.14)" stroke="#c09c78" stroke-width="2.5"/>`;
            break;
          case 'oval':
            shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry * 0.65}" fill="rgba(192, 156, 120, 0.14)" stroke="#c09c78" stroke-width="2.5"/>`;
            break;
          case 'rect':
          case 'square':
            shapeSvg = `<rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${t.shape === 'square' ? w : h}" rx="8" fill="rgba(192, 156, 120, 0.14)" stroke="#c09c78" stroke-width="2.5"/>`;
            break;
          case 'dance_floor':
            shapeSvg = `<g><rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="10" fill="rgba(139, 92, 246, 0.14)" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="6 3"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#7c3aed" font-size="14" font-weight="800">💃 PISTA DE BAILE</text></g>`;
            break;
          case 'stage_dj':
            shapeSvg = `<g><rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="10" fill="rgba(30, 41, 59, 0.92)" stroke="#6366f1" stroke-width="2.5"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-size="13" font-weight="800">🎧 ESCENARIO / DJ</text></g>`;
            break;
          case 'bar':
            shapeSvg = `<g><rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="10" fill="rgba(245, 158, 11, 0.16)" stroke="#f59e0b" stroke-width="2.5"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#d97706" font-size="13" font-weight="800">🍸 BARRA DE BEBIDAS</text></g>`;
            break;
          case 'gift_table':
            shapeSvg = `<g><rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="10" fill="rgba(236, 72, 153, 0.16)" stroke="#ec4899" stroke-width="2.5"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#db2777" font-size="13" font-weight="800">🎁 MESA DE REGALOS</text></g>`;
            break;
          case 'cake_table':
            shapeSvg = `<g><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(244, 114, 182, 0.18)" stroke="#f472b6" stroke-width="2.5"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#db2777" font-size="13" font-weight="800">🎂 PASTEL</text></g>`;
            break;
          case 'photobooth':
            shapeSvg = `<g><rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="10" fill="rgba(59, 130, 246, 0.16)" stroke="#3b82f6" stroke-width="2.5"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#2563eb" font-size="13" font-weight="800">📷 PHOTO BOOTH</text></g>`;
            break;
          case 'entrance':
            shapeSvg = `<g><rect x="${t.x || 0}" y="${t.y || 0}" width="${w}" height="${h}" rx="8" fill="rgba(16, 185, 129, 0.16)" stroke="#10b981" stroke-width="2.5"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#059669" font-size="13" font-weight="800">🚪 ENTRADA PRINCIPAL</text></g>`;
            break;
          default:
            shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(192, 156, 120, 0.14)" stroke="#c09c78" stroke-width="2.5"/>`;
            break;
        }

        const seatsSvg = this.seatPositions(t).map((s, si) => 
          `<circle cx="${s.cx}" cy="${s.cy}" r="6" fill="${si < (t.occupied || 0) ? '#c09c78' : '#e2e8f0'}" stroke="#94a3b8" stroke-width="1.2"/>`
        ).join('');

        const labelText = !isElem ? `<text x="${cx}" y="${cy - 5}" text-anchor="middle" dominant-baseline="middle" fill="#1e293b" font-size="13" font-weight="800">${t.name}</text>` : '';
        const occText = !isElem ? `<text x="${cx}" y="${cy + 11}" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="11" font-weight="700">${t.occupied || 0}/${t.capacity} sillas</text>` : '';

        svgTablesHtml += `<g>${shapeSvg}${seatsSvg}${labelText}${occText}</g>`;
      });

      // Tarjetas de Montaje Operativo por Mesa
      let tablesBreakdownHtml = '';
      floorTables.forEach(t => {
        const isElem = this.isElementShape(t.shape);
        if (isElem) return; // No generar tarjeta de armar sillas para pista/escenario

        const guestsList = t.guests?.map(g => 
          `<li>
            <span class="chk-box">[ ]</span>
            <span class="guest-name"><strong>${g.name}</strong></span>
            <span class="guest-seats">(${g.seats} lugar${g.seats !== 1 ? 'es' : ''})</span>
            ${g.group ? `<span class="badge">🏷️ ${g.group}</span>` : ''}
          </li>`
        ).join('') || '<li class="empty"><span class="chk-box">[ ]</span> Sin invitados asignados a esta mesa</li>';

        const freeChairs = Math.max(0, (t.capacity || 0) - (t.occupied || 0));

        tablesBreakdownHtml += `
          <div class="table-card">
            <div class="table-card-header">
              <div class="table-card-title">
                <strong>🪑 ${t.name}</strong>
                <span class="table-shape-pill">${t.shape ? t.shape.toUpperCase() : 'MESA'}</span>
              </div>
              <div class="chair-count-badge">
                🪑 COLOCAR ${t.capacity} SILLAS
              </div>
            </div>
            <div class="table-card-sub">
              <span>Ocupación: <strong>${t.occupied || 0}/${t.capacity}</strong></span>
              ${freeChairs > 0 ? `<span class="free-text">(${freeChairs} libres)</span>` : '<span class="full-text">🟢 Completa</span>'}
            </div>
            <ul class="guest-list">
              ${guestsList}
            </ul>
          </div>
        `;
      });

      floorsHtml += `
        <!-- SECCIÓN 1: PLANO GRÁFICO DEL NIVEL -->
        <div class="pdf-page">
          <div class="page-header">
            <div>
              <span class="op-badge">GUÍA DE MONTAJE Y PLANO OPERATIVO</span>
              <h2>🏢 NIVEL: ${floorObj.name.toUpperCase()}</h2>
            </div>
            <div class="floor-stats">
              <span>Mesas: <strong>${floorTables.length}</strong></span>
              <span>Sillas a colocar: <strong>${floorSeatsCount}</strong></span>
              <span>Invitados: <strong>${floorOccupiedCount}</strong></span>
            </div>
          </div>

          <div class="svg-container">
            <svg viewBox="0 0 ${this.venueWidth * 100} ${this.venueHeight * 100}" width="100%" height="100%">
              <rect x="0" y="0" width="${this.venueWidth * 100}" height="${this.venueHeight * 100}" fill="#faf7f2" rx="10" stroke="#cbd5e1" stroke-width="2"/>
              <!-- Grid Background -->
              <pattern id="pdfGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="#94a3b8" opacity="0.3" />
              </pattern>
              <rect width="${this.venueWidth * 100}" height="${this.venueHeight * 100}" fill="url(#pdfGrid)" />
              ${svgTablesHtml}
            </svg>
          </div>

          <!-- Leyenda de Simbología de Montaje -->
          <div class="legend-bar">
            <strong>Simbología:</strong>
            <span>🪑 Mesa & Sillas</span>
            <span>💃 Pista</span>
            <span>🎧 Escenario/DJ</span>
            <span>🍸 Barra</span>
            <span>🎁 Regalos</span>
            <span>🎂 Pastel</span>
            <span>📷 Photo Booth</span>
            <span>🚪 Entrada</span>
          </div>
        </div>

        <!-- SECCIÓN 2: HOJA DE MONTAJE Y ASIGNACIÓN DE MESAS PARA PERSONAL -->
        <div class="pdf-page">
          <div class="page-header">
            <div>
              <span class="op-badge">CHECKLIST PARA CAPITÁN Y HOSTESSES</span>
              <h2>📋 MONTAJE DE MESAS Y SILLAS - ${floorObj.name.toUpperCase()}</h2>
            </div>
            <span style="font-size:12px; color:#64748b;">Marque [ ] al colocar las sillas e instalar invitados</span>
          </div>

          <div class="tables-grid">
            ${tablesBreakdownHtml || '<p style="color:#94a3b8; font-style:italic;">No hay mesas de invitados registradas en este nivel.</p>'}
          </div>
        </div>
      `;
    });

    // Generar Directorio Alfabético de Invitados para Recepción / Hostesses
    const assignedGuestsSorted = [...this.guests]
      .filter(g => !!g.tableName)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let directoryRowsHtml = '';
    assignedGuestsSorted.forEach((g, idx) => {
      const guestSeatsCount = (g as any).seats || (1 + (g.allowedCompanions || 0));
      directoryRowsHtml += `
        <tr>
          <td style="width: 30px; text-align: center; font-weight: 600; color: #94a3b8;">${idx + 1}</td>
          <td><strong>${g.name}</strong></td>
          <td>${g.group ? `<span class="badge">🏷️ ${g.group}</span>` : '-'}</td>
          <td style="text-align: center;"><strong>${guestSeatsCount}</strong></td>
          <td style="color: #c09c78; font-weight: 800;">🪑 ${g.tableName}</td>
          <td>${g.seatLabel || '-'}</td>
          <td style="text-align: center; font-weight: 600;">[ ]</td>
        </tr>
      `;
    });

    const directoryPageHtml = `
      <div class="pdf-page">
        <div class="page-header">
          <div>
            <span class="op-badge">DIRECTORIO DE RECEPCIÓN & HOSTESSES</span>
            <h2>🔎 BÚSQUEDA RÁPIDA ALFABÉTICA DE INVITADOS</h2>
          </div>
          <span style="font-size:12px; color:#64748b;">Total Ubicados: <strong>${assignedGuestsSorted.length}</strong> invitados</span>
        </div>

        <table class="directory-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre del Invitado</th>
              <th>Grupo / Familia</th>
              <th style="text-align: center;">Pases</th>
              <th>Mesa Asignada</th>
              <th>Silla / Nota</th>
              <th style="text-align: center;">Check [ ]</th>
            </tr>
          </thead>
          <tbody>
            ${directoryRowsHtml || '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No hay invitados asignados a mesas aún.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plano de Mesas y Guía de Montaje - ${eventTitle}</title>
        <style>
          @page { size: landscape A4; margin: 8mm; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-size: 12px;
          }
          
          .op-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #c09c78;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .op-header h1 {
            margin: 0;
            font-size: 20px;
            color: #1e293b;
            font-weight: 800;
          }
          .op-header p {
            margin: 3px 0 0;
            font-size: 12px;
            color: #64748b;
          }
          .op-metrics {
            display: flex;
            gap: 12px;
          }
          .metric-box {
            background: #faf7f2;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #c09c78;
            padding: 6px 12px;
            border-radius: 6px;
            text-align: center;
          }
          .metric-box label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            display: block;
          }
          .metric-box span {
            font-size: 14px;
            font-weight: 800;
            color: #1e293b;
          }

          .pdf-page {
            page-break-after: always;
            padding-bottom: 10px;
          }
          .pdf-page:last-child {
            page-break-after: avoid;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            background: #f8fafc;
            padding: 8px 14px;
            border-radius: 6px;
            border-left: 4px solid #c09c78;
            margin-bottom: 12px;
          }
          .op-badge {
            font-size: 10px;
            font-weight: 800;
            color: #c09c78;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .page-header h2 {
            margin: 2px 0 0;
            font-size: 16px;
            color: #1e293b;
          }
          .floor-stats {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #475569;
          }

          .svg-container {
            width: 100%;
            height: 380px;
            background: #faf7f2;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 10px;
          }

          .legend-bar {
            display: flex;
            align-items: center;
            gap: 14px;
            background: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            color: #475569;
            flex-wrap: wrap;
          }

          .tables-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .table-card {
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            background: #ffffff;
            page-break-inside: avoid;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          }
          .table-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .table-card-title strong {
            font-size: 13px;
            color: #1e293b;
          }
          .table-shape-pill {
            font-size: 9px;
            background: #f1f5f9;
            color: #64748b;
            padding: 1px 5px;
            border-radius: 4px;
            font-weight: 700;
            margin-left: 4px;
          }
          .chair-count-badge {
            background: #c09c78;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            letter-spacing: 0.02em;
          }
          .table-card-sub {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
            margin-bottom: 6px;
          }
          .free-text { color: #d97706; font-weight: 700; }
          .full-text { color: #16a34a; font-weight: 700; }

          .guest-list {
            margin: 0;
            padding: 0;
            list-style: none;
            font-size: 11px;
          }
          .guest-list li {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 0;
            border-bottom: 1px dashed #f1f5f9;
          }
          .guest-list li:last-child { border-bottom: none; }
          .chk-box { font-family: monospace; color: #94a3b8; font-weight: bold; }
          .guest-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .guest-seats { color: #64748b; font-size: 10px; }
          .badge {
            font-size: 9px;
            background: #eff6ff;
            color: #2563eb;
            padding: 1px 5px;
            border-radius: 4px;
            font-weight: 600;
          }
          .guest-list li.empty { color: #94a3b8; font-style: italic; }

          .directory-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 6px;
          }
          .directory-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 700;
            text-align: left;
            padding: 6px 10px;
            border: 1px solid #e2e8f0;
          }
          .directory-table td {
            padding: 5px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
          }
          .directory-table tr:nth-child(even) {
            background: #faf7f2;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <!-- ENCABEZADO DE GUÍA OPERATIVA DEL EVENTO -->
        <div class="op-header">
          <div>
            <h1>🪑 GUÍA OPERATIVA Y PLANO DE MONTAJE DE MESAS</h1>
            <p>
              <strong>Evento:</strong> ${eventTitle}
              ${eventDateStr ? ` · 🗓️ ${eventDateStr}` : ''}
              ${venueName ? ` · 📍 ${venueName}` : ''}
              ${hostsStr ? ` · 👤 ${hostsStr}` : ''}
            </p>
          </div>
          <div class="op-metrics">
            <div class="metric-box">
              <label>Niveles</label>
              <span>${this.floorsList.length}</span>
            </div>
            <div class="metric-box">
              <label>Mesas</label>
              <span>${totalTablesCount}</span>
            </div>
            <div class="metric-box">
              <label>Sillas Total</label>
              <span>${totalSeatsCount}</span>
            </div>
            <div class="metric-box">
              <label>Invitados Ubicados</label>
              <span>${totalOccupiedCount}</span>
            </div>
          </div>
        </div>

        ${floorsHtml}

        ${directoryPageHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
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
