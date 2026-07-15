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
  newTable = { name: '', capacity: 8, shape: 'round' as TableShape, width: 120, height: 120 };
  creating = false;
  createError = '';

  // Guest panel
  guestSearch = '';
  draggedGuest?: GuestModel;

  // Venue dimensions
  venueWidth = 1200;
  venueHeight = 800;
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

  getTableId(t: EventTableModel): string { return (t as any)._id || (t as any).id || ''; }
  getGuestId(g: GuestModel): string { return (g as any)._id || (g as any).id || ''; }

  tableColor(t: EventTableModel): string {
    if (t.overCapacity) return 'var(--nw-danger)';
    if ((t.available || 0) <= 0) return 'var(--nw-warning)';
    return 'var(--nw-success)';
  }

  tableFill(t: EventTableModel): string {
    if (t.overCapacity) return 'rgba(248,113,113,.12)';
    if ((t.available || 0) <= 0) return 'rgba(251,191,36,.12)';
    return 'rgba(52,211,153,.08)';
  }

  occupancyPercent(t: EventTableModel): number {
    return t.capacity ? Math.min(100, ((t.occupied || 0) / t.capacity) * 100) : 0;
  }

  // ── Create Table ──
  openCreateModal(): void {
    this.newTable = { name: `Mesa ${this.tables.length + 1}`, capacity: 8, shape: 'round', width: 120, height: 120 };
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
      width: this.newTable.width,
      height: this.newTable.height,
      x, y, order: this.tables.length
    }).subscribe({
      next: ({ table }) => {
        this.tables = [...this.tables, { ...table, x: table.x || x, y: table.y || y, shape: table.shape || this.newTable.shape, width: table.width || this.newTable.width, height: table.height || this.newTable.height, guests: [] }];
        this.showCreateModal = false;
        this.creating = false;
        this.message = `Mesa "${table.name}" creada`;
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => { this.createError = err.error?.message || 'Error creando mesa'; this.creating = false; }
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
        table.x = Math.max(0, Math.min(this.venueWidth - (table.width || 120), this.drag.tableStartX + dx));
        table.y = Math.max(0, Math.min(this.venueHeight - (table.height || 120), this.drag.tableStartY + dy));
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
    this.viewBox = { x: 0, y: 0, w: this.venueWidth, h: this.venueHeight };
  }

  private updateViewBox(): void {
    this.viewBox.w = this.venueWidth / this.zoom;
    this.viewBox.h = this.venueHeight / this.zoom;
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
    const cx = this.tableCx(t);
    const cy = this.tableCy(t);
    const rx = this.tableRx(t) + 18;
    const ry = this.tableRy(t) + 18;
    const count = t.capacity;
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      seats.push({ cx: cx + rx * Math.cos(angle), cy: cy + ry * Math.sin(angle) });
    }
    return seats;
  }

  occupiedSeats(t: EventTableModel): number { return t.occupied || 0; }
}
