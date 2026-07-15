import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, EventTableModel, GuestModel, TableShape } from '../../core/models';

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

  // Guest panel
  guestSearch = '';
  draggedGuest?: GuestModel;

  // Venue dimensions (in meters)
  venueWidth = 12;
  venueHeight = 8;
  showVenueSettings = false;

  shapes: { value: TableShape; label: string; icon: string }[] = [
    { value: 'round', label: 'Redonda', icon: '⭕' },
    { value: 'rect', label: 'Rectangular', icon: '⬜' },
    { value: 'oval', label: 'Ovalada', icon: '🔵' },
    { value: 'square', label: 'Cuadrada', icon: '🟩' }
  ];

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
          x: t.x || (100 + (i % 5) * 200),
          y: t.y || (100 + Math.floor(i / 5) * 200),
          shape: t.shape || 'round',
          width: t.width || 120,
          height: t.height || 120
        }));
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
      return true;
    });
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

  // ── Create Table ──
  openCreateModal(): void {
    this.newTable = { name: `Mesa ${this.tables.length + 1}`, capacity: 8, shape: 'round', width: 1.2, height: 1.2 };
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
      name: this.newTable.name,
      capacity: this.newTable.capacity,
      shape: this.newTable.shape,
      width: Math.round(this.newTable.width * 100),
      height: Math.round(this.newTable.height * 100),
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

  // Generate seat positions around the table
  seatPositions(t: EventTableModel): Array<{ cx: number; cy: number }> {
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
}
