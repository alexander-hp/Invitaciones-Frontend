import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, InvitationModel } from '../../core/models';

@Component({ selector: 'app-event-detail', templateUrl: './event-detail.component.html' })
export class EventDetailComponent implements OnInit {
  event?: EventModel;
  invitations: InvitationModel[] = [];
  loading = false;
  saving = false;
  error = '';

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.getEvent(id).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loadInvitations(id);
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar el evento.';
        this.loading = false;
      }
    });
  }

  createInvitation(): void {
    if (!this.event) return;
    this.saving = true;
    this.error = '';
    const eventId = this.getEventId();
    this.api.createInvitation({
      event: eventId,
      slug: this.slugify(this.event.title),
      content: {
        headline: this.event.title,
        subheadline: 'Nos encantaria que nos acompanes',
        message: 'Confirma tu asistencia y comparte este dia especial con nosotros.',
        palette: { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' },
        gallery: []
      }
    }).subscribe({
      next: ({ invitation }) => this.router.navigate(['/invitations', this.getInvitationId(invitation), 'editor']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo crear la invitacion.';
        this.saving = false;
      }
    });
  }

  getEventId(): string {
    return this.event?._id || this.event?.id || '';
  }

  getInvitationId(invitation: InvitationModel): string {
    return invitation._id || invitation.id || '';
  }

  private loadInvitations(eventId: string): void {
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitations = invitations.filter((invitation) => {
          const eventRef = typeof invitation.event === 'string' ? invitation.event : invitation.event._id || invitation.event.id;
          return eventRef === eventId;
        });
        this.loading = false;
      },
      error: () => {
        this.invitations = [];
        this.loading = false;
      }
    });
  }

  private slugify(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
