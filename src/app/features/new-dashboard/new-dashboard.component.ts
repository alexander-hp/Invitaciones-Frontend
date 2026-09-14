import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DashboardMetrics, EventModel, EventType } from '../../core/models';

@Component({ selector: 'app-new-dashboard', templateUrl: './new-dashboard.component.html' })
export class NewDashboardComponent implements OnInit {
  sidebarOpen = false;
  loading = true;
  error = '';
  message = '';
  coverImageMap: Record<string, string> = {};

  showCreateModal = false;
  newEvent = {
    mode: 'invitation',
    type: 'boda' as EventType,
    title: '',
    date: '',
    time: '',
    hosts: '',
    venueName: '',
    venueAddress: '',
    mapUrl: '',
    externalSiteUrl: '',
    externalSiteLabel: ''
  };
  creating = false;
  createError = '';

  openTimePicker(inputEl: HTMLInputElement): void {
    try {
      const el = inputEl as any;
      if (el && typeof el.showPicker === 'function') {
        el.showPicker();
      } else {
        inputEl?.focus();
      }
    } catch {
      inputEl?.focus();
    }
  }

  locationSearchResults: Array<{ name: string; address: string; mapUrl: string; wazeUrl: string }> = [];
  locationSearchLoading = false;
  locationExtractLoading = false;
  private searchTimeout: any;

  metrics: DashboardMetrics = {
    events: 0,
    invitations: 0,
    guests: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
    companions: 0,
    emailSent: 0,
    whatsappSent: 0,
    opened: 0,
    failed: 0,
    checkedIn: 0
  };
  events: EventModel[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadMetrics();
    this.loadEvents();
  }

  loadMetrics(): void {
    this.api.getDashboard().subscribe({
      next: ({ metrics }) => { this.metrics = metrics; this.loading = false; },
      error: (err) => { this.error = err.error?.message || 'Error cargando métricas'; this.loading = false; }
    });
  }

  loadEvents(): void {
    this.api.listEvents().subscribe({
      next: ({ events }) => {
        this.events = events.slice(0, 6);
        this.loadInvitationsCoverMap();
      },
      error: () => {}
    });
  }

  loadInvitationsCoverMap(): void {
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        (invitations || []).forEach(inv => {
          const evId = typeof inv.event === 'string' ? inv.event : (inv.event?._id || inv.event?.id);
          if (evId && inv.content?.coverImageUrl) {
            this.coverImageMap[String(evId).trim()] = inv.content.coverImageUrl;
          }
        });
      },
      error: () => {}
    });
  }

  getCoverImage(ev: EventModel): string {
    const id = String(ev._id || ev.id || '').trim();
    if (this.coverImageMap[id]) return this.coverImageMap[id];
    if (ev.externalContent?.coverImageUrl) return ev.externalContent.coverImageUrl;
    return '';
  }

  get confirmRate(): number {
    const total = this.metrics.confirmed + this.metrics.declined + this.metrics.pending;
    return total ? Math.round((this.metrics.confirmed / total) * 100) : 0;
  }

  get attendanceTotal(): number {
    return this.metrics.confirmed + this.metrics.companions;
  }

  get totalSent(): number {
    return (this.metrics.whatsappSent || 0) + (this.metrics.emailSent || 0);
  }

  get deliverySuccessRate(): number {
    const total = this.totalSent;
    if (!total) return 0;
    const successful = total - (this.metrics.failed || 0);
    return Math.round((successful / total) * 100);
  }

  getNormalizedEventType(eventObj?: EventModel | string, eventTitle?: string): string {
    let type = typeof eventObj === 'string' ? eventObj : eventObj?.type;
    let title = typeof eventObj === 'object' ? eventObj?.title : eventTitle;

    if (title) {
      const t = title.toLowerCase().trim();
      if (t.includes('boda') || t.includes('matrimonio') || t.includes('wedding')) return 'boda';
      if (t.includes('xv') || t.includes('quince') || t.includes('15')) return 'xv';
      if (t.includes('gradua')) return 'graduacion';
      if (t.includes('cumple')) return 'cumpleanos';
      if (t.includes('bautiz')) return 'bautizo';
      if (t.includes('otro') || t.includes('fiesta') || t.includes('evento')) return 'otro';
    }

    if (!type) return 'otro';
    const t = type.toLowerCase().trim();
    if (t.includes('boda') || t.includes('matrimonio') || t.includes('wedding')) return 'boda';
    if (t.includes('xv') || t.includes('quince') || t.includes('15')) return 'xv';
    if (t.includes('gradua')) return 'graduacion';
    if (t.includes('cumple')) return 'cumpleanos';
    if (t.includes('bautiz')) return 'bautizo';
    return 'otro';
  }

  eventTypeIcon(eventObj?: EventModel | string, title?: string): string {
    const norm = this.getNormalizedEventType(eventObj, title);
    const icons: Record<string, string> = { boda: '💍', xv: '👑', graduacion: '🎓', cumpleanos: '🎂', bautizo: '⛪', otro: '🎉' };
    return icons[norm] || '🎉';
  }

  eventTypeLabel(eventObj?: EventModel | string, title?: string): string {
    const norm = this.getNormalizedEventType(eventObj, title);
    const labels: Record<string, string> = { boda: 'Boda', xv: 'XV Años', graduacion: 'Graduación', cumpleanos: 'Cumpleaños', bautizo: 'Bautizo', otro: 'Otro' };
    return labels[norm] || (typeof eventObj === 'string' ? eventObj : eventObj?.type) || 'Evento';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getEventId(event: EventModel): string {
    return event._id || event.id || '';
  }

  goToEvent(event: EventModel): void {
    this.router.navigate(['/new/events', this.getEventId(event)]);
  }

  isPastEvent(event: EventModel): boolean {
    return new Date(event.date) < new Date();
  }

  onVenueNameInput(query?: string): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 3) {
      this.locationSearchResults = [];
      this.locationSearchLoading = false;
      return;
    }
    this.locationSearchLoading = true;
    this.searchTimeout = setTimeout(() => {
      this.api.searchPlaces(trimmed).subscribe({
        next: (results) => {
          this.locationSearchResults = results;
          this.locationSearchLoading = false;
        },
        error: () => {
          this.locationSearchResults = [];
          this.locationSearchLoading = false;
        }
      });
    }, 450);
  }

  selectVenueSearchResult(result: { name: string; address: string; mapUrl: string; wazeUrl: string }): void {
    if (result.name) this.newEvent.venueName = result.name;
    if (result.address) this.newEvent.venueAddress = result.address;
    if (result.mapUrl) this.newEvent.mapUrl = result.mapUrl;
    this.locationSearchResults = [];
  }

  async extractInfoFromMapUrl(): Promise<void> {
    if (!this.newEvent.mapUrl) return;
    this.locationExtractLoading = true;
    try {
      const parsed = await this.api.parseGoogleMapsUrl(this.newEvent.mapUrl);
      if (parsed.name) this.newEvent.venueName = parsed.name;
      if (parsed.address) this.newEvent.venueAddress = parsed.address;
    } catch (e) {
    } finally {
      this.locationExtractLoading = false;
    }
  }

  createEvent(): void {
    if (!this.newEvent.title || !this.newEvent.date) {
      this.createError = 'Título y fecha son requeridos';
      return;
    }
    this.creating = true;
    this.createError = '';

    const payload: any = {
      mode: this.newEvent.mode,
      type: this.newEvent.type,
      title: this.newEvent.title,
      date: this.newEvent.date,
      time: this.newEvent.time ? this.newEvent.time.trim() : undefined,
      hosts: this.newEvent.hosts ? this.newEvent.hosts.split(',').map(s => s.trim()) : [],
      venue: {
        name: this.newEvent.venueName,
        address: this.newEvent.venueAddress,
        mapUrl: this.newEvent.mapUrl
      }
    };

    if (this.newEvent.mode === 'external_dashboard') {
      payload.externalSiteUrl = this.newEvent.externalSiteUrl || undefined;
      payload.externalSiteLabel = this.newEvent.externalSiteLabel || undefined;
    }

    this.api.createEvent(payload).subscribe({
      next: ({ event }) => {
        this.showCreateModal = false;
        this.creating = false;
        this.router.navigate(['/new/events', event._id || event.id]);
      },
      error: (err) => {
        this.createError = err.error?.message || 'No se pudo crear el evento';
        this.creating = false;
      }
    });
  }
}
