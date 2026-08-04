import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventMode, EventModel, EventPayload, EventType } from '../../core/models';

@Component({ selector: 'app-events', templateUrl: './events.component.html' })
export class EventsComponent implements OnInit {
  events: EventModel[] = [];
  loading = false;
  saving = false;
  error = '';
  form = {
    mode: 'invitation' as EventMode,
    type: 'boda' as EventType,
    title: 'Boda de Alex y Tania',
    hosts: 'Alex, Tania',
    date: '2026-11-21',
    venueName: 'Hacienda Santa Lucia',
    venueAddress: 'Camino Real 120, Guadalajara, Jal.',
    mapUrl: 'https://maps.google.com',
    externalSiteUrl: '',
    externalSiteLabel: 'Abrir pagina del evento'
  };

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
    if (result.name) this.form.venueName = result.name;
    if (result.address) this.form.venueAddress = result.address;
    if (result.mapUrl) this.form.mapUrl = result.mapUrl;
    this.locationSearchResults = [];
  }

  async extractInfoFromMapUrl(): Promise<void> {
    if (!this.form.mapUrl) return;
    this.locationExtractLoading = true;
    try {
      const parsed = await this.api.parseGoogleMapsUrl(this.form.mapUrl);
      if (parsed.name) this.form.venueName = parsed.name;
      if (parsed.address) this.form.venueAddress = parsed.address;
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
    this.error = '';
    this.api.listEvents().subscribe({
      next: ({ events }) => {
        this.events = events;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudieron cargar los eventos.';
        this.loading = false;
      }
    });
  }

  create(): void {
    this.saving = true;
    this.error = '';
    const payload: EventPayload = {
      mode: this.form.mode,
      type: this.form.type,
      title: this.form.title,
      hosts: this.form.hosts.split(',').map((host) => host.trim()).filter(Boolean),
      date: this.form.date,
      venue: { name: this.form.venueName, address: this.form.venueAddress, mapUrl: this.form.mapUrl },
      externalSiteUrl: this.form.mode === 'external_dashboard' ? this.form.externalSiteUrl : undefined,
      externalSiteLabel: this.form.mode === 'external_dashboard' ? this.form.externalSiteLabel : undefined
    };
    this.api.createEvent(payload).subscribe({
      next: ({ event }) => this.router.navigate(['/events', this.getId(event)]),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo crear el evento.';
        this.saving = false;
      }
    });
  }

  getId(event: EventModel): string {
    return event._id || event.id || '';
  }
}
