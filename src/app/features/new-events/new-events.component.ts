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
  showCreateModal = false;

  newEvent = {
    title: '',
    type: 'boda' as EventType,
    date: '',
    venueName: '',
    venueAddress: ''
  };
  creating = false;
  createError = '';

  constructor(private api: ApiService, private router: Router) {}

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
      return true;
    });
  }

  createEvent(): void {
    if (!this.newEvent.title || !this.newEvent.date) { this.createError = 'Título y fecha son requeridos'; return; }
    this.creating = true;
    this.createError = '';
    this.api.createEvent({
      title: this.newEvent.title,
      type: this.newEvent.type,
      date: this.newEvent.date,
      venue: { name: this.newEvent.venueName, address: this.newEvent.venueAddress }
    }).subscribe({
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
