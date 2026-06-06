import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, EventPayload, EventType } from '../../core/models';

@Component({ selector: 'app-events', templateUrl: './events.component.html' })
export class EventsComponent implements OnInit {
  events: EventModel[] = [];
  loading = false;
  saving = false;
  error = '';
  form = {
    type: 'boda' as EventType,
    title: 'Boda de Alex y Sofia',
    hosts: 'Alex, Sofia',
    date: '2026-11-21',
    venueName: 'Hacienda Santa Lucia',
    venueAddress: 'Camino Real 120, Guadalajara, Jal.',
    mapUrl: 'https://maps.google.com'
  };

  constructor(private api: ApiService, private router: Router) {}

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
      type: this.form.type,
      title: this.form.title,
      hosts: this.form.hosts.split(',').map((host) => host.trim()).filter(Boolean),
      date: this.form.date,
      venue: { name: this.form.venueName, address: this.form.venueAddress, mapUrl: this.form.mapUrl }
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
