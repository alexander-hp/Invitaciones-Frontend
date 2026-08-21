import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { EventLogModel, EventLogCategory, EventLogSummary } from '../../../../core/models';

export interface CategoryFilterOption {
  key: EventLogCategory;
  label: string;
}

@Component({
  selector: 'app-event-logs-tab',
  templateUrl: './event-logs-tab.component.html',
  styleUrls: ['./event-logs-tab.component.css']
})
export class EventLogsTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;

  logs: EventLogModel[] = [];
  summary: EventLogSummary = { total: 0, today: 0, byCategory: {} };

  loading = false;
  error = '';

  selectedCategory: EventLogCategory = 'all';
  searchQuery = '';
  private searchDebounceTimer?: any;

  currentPage = 1;
  totalPages = 1;
  limit = 20;
  totalLogs = 0;

  expandedLogIds: Set<string> = new Set();

  categoryOptions: CategoryFilterOption[] = [
    { key: 'all', label: 'Todos' },
    { key: 'guest', label: 'Invitados' },
    { key: 'rsvp', label: 'RSVP' },
    { key: 'table', label: 'Mesas' },
    { key: 'access', label: 'Check-in / Acceso' },
    { key: 'communication', label: 'Mensajes' },
    { key: 'album', label: 'Fotos / Álbum' },
    { key: 'music', label: 'Canciones DJ' },
    { key: 'dedication', label: 'Dedicatorias' },
    { key: 'event', label: 'Ajustes de Evento' }
  ];

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.eventId) {
      this.loadLogs();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadLogs();
    }
  }

  loadLogs(page = 1): void {
    if (!this.eventId) return;
    this.loading = true;
    this.error = '';
    this.currentPage = page;

    this.apiService.listEventLogs(this.eventId, {
      category: this.selectedCategory,
      search: this.searchQuery.trim() || undefined,
      page: this.currentPage,
      limit: this.limit
    }).subscribe({
      next: res => {
        this.logs = res.logs || [];
        this.summary = res.summary || { total: 0, today: 0, byCategory: {} };
        this.currentPage = res.pagination.page;
        this.totalPages = res.pagination.pages;
        this.totalLogs = res.pagination.total;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || 'Error al cargar el historial de cambios';
        this.loading = false;
      }
    });
  }

  selectCategory(category: EventLogCategory): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.loadLogs(1);
  }

  onCategorySelectChange(categoryValue: string): void {
    this.selectCategory(categoryValue as EventLogCategory);
  }

  onSearchChange(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadLogs(1);
    }, 350);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadLogs(1);
  }

  toggleExpand(log: EventLogModel): void {
    const id = log._id || log.id;
    if (!id) return;
    if (this.expandedLogIds.has(id)) {
      this.expandedLogIds.delete(id);
    } else {
      this.expandedLogIds.add(id);
    }
  }

  isExpanded(log: EventLogModel): boolean {
    const id = log._id || log.id;
    return id ? this.expandedLogIds.has(id) : false;
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'guest': return 'badge-guest';
      case 'rsvp': return 'badge-rsvp';
      case 'table': return 'badge-table';
      case 'access': return 'badge-access';
      case 'communication': return 'badge-comm';
      case 'album': return 'badge-album';
      case 'music': return 'badge-music';
      case 'dedication': return 'badge-dedication';
      case 'event': return 'badge-event';
      default: return 'badge-default';
    }
  }

  getCategorySvg(category: string): SafeHtml {
    let raw = '';
    switch (category) {
      case 'guest':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
        break;
      case 'rsvp':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
        break;
      case 'table':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`;
        break;
      case 'access':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>`;
        break;
      case 'communication':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
        break;
      case 'album':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        break;
      case 'music':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
        break;
      case 'dedication':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
        break;
      case 'event':
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
        break;
      default:
        raw = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
        break;
    }
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  getCategoryLabel(category: string): string {
    const opt = this.categoryOptions.find(o => o.key === category);
    return opt ? opt.label : category;
  }

  getActorBadge(log: EventLogModel): { label: string; class: string } {
    if (log.actorType === 'guest') {
      return { label: 'Invitado', class: 'actor-guest' };
    }
    if (log.actorType === 'staff') {
      return { label: 'Staff / Acceso', class: 'actor-staff' };
    }
    if (log.actorType === 'system') {
      return { label: 'Automático', class: 'actor-system' };
    }
    return {
      label: log.actor?.name ? log.actor.name : 'Administrador',
      class: 'actor-user'
    };
  }

  formatRelativeTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHour < 24) return `Hace ${diffHour}h`;
    if (diffDay === 1) return 'Ayer';
    if (diffDay < 7) return `Hace ${diffDay} días`;

    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  formatExactTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  hasMetadata(log: EventLogModel): boolean {
    return Boolean(log.metadata && Object.keys(log.metadata).length > 0);
  }

  getFormattedMetadata(meta?: Record<string, any>): { key: string; value: string }[] {
    if (!meta) return [];
    return Object.entries(meta).map(([key, val]) => {
      const formattedValue = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
      return { key, value: formattedValue };
    });
  }
}
