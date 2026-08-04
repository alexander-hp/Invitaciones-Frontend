import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, EventType } from '../../core/models';

@Component({ selector: 'app-new-events', templateUrl: './new-events.component.html' })
export class NewEventsComponent implements OnInit {
  loading = true;
  error = '';
  events: EventModel[] = [];
  filterType = '';
  filterStatus = '';
  filterSearch = '';
  showCreateModal = false;

  newEvent = {
    mode: 'invitation',
    type: 'boda' as EventType,
    title: '',
    date: '',
    hosts: '',
    venueName: '',
    venueAddress: '',
    mapUrl: '',
    externalSiteUrl: '',
    externalSiteLabel: ''
  };
  creating = false;
  createError = '';

  locationSearchResults: Array<{ name: string; address: string; mapUrl: string; wazeUrl: string }> = [];
  locationSearchLoading = false;
  locationExtractLoading = false;
  private searchTimeout: any;

  constructor(private api: ApiService, private router: Router) {}

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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.listEvents().subscribe({
      next: ({ events }) => { this.events = events; this.loading = false; },
      error: (err) => { this.error = err.error?.message || 'Error cargando eventos'; this.loading = false; }
    });
  }

  get filteredEvents(): EventModel[] {
    return this.events.filter(ev => {
      if (this.filterType && ev.type !== this.filterType) return false;
      if (this.filterStatus && ev.status !== this.filterStatus) return false;
      if (this.filterSearch) {
        const query = this.filterSearch.toLowerCase().trim();
        const titleMatch = ev.title?.toLowerCase().includes(query);
        const venueNameMatch = ev.venue?.name?.toLowerCase().includes(query);
        const venueAddressMatch = ev.venue?.address?.toLowerCase().includes(query);
        const hostsMatch = ev.hosts?.some((h: string) => h.toLowerCase().includes(query));
        if (!titleMatch && !venueNameMatch && !venueAddressMatch && !hostsMatch) return false;
      }
      return true;
    });
  }

  openGoogleMapsSearch(): void {
    const venue = this.newEvent.venueName || '';
    const address = this.newEvent.venueAddress || '';
    const query = encodeURIComponent(`${venue} ${address}`.trim() || 'Salón de eventos');
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  createEvent(): void {
    if (!this.newEvent.title || !this.newEvent.date) { this.createError = 'Título y fecha son requeridos'; return; }
    this.creating = true;
    this.createError = '';
    
    const payload: any = {
      mode: this.newEvent.mode,
      type: this.newEvent.type,
      title: this.newEvent.title,
      date: this.newEvent.date,
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

  eventTypeIcon(type: string): string {
    const icons: Record<string, string> = { boda: '💍', xv: '👑', graduacion: '🎓', cumpleanos: '🎂', bautizo: '⛪', otro: '🎉' };
    return icons[type] || '🎉';
  }

  eventTypeLabel(type: string): string {
    const labels: Record<string, string> = { boda: 'Boda', xv: 'XV Años', graduacion: 'Graduación', cumpleanos: 'Cumpleaños', bautizo: 'Bautizo', otro: 'Otro' };
    return labels[type] || type;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  getEventId(ev: EventModel): string { return ev._id || ev.id || ''; }

  goToEvent(ev: EventModel): void {
    this.router.navigate(['/new/events', this.getEventId(ev)]);
  }

  isPast(ev: EventModel): boolean { return new Date(ev.date) < new Date(); }
}
