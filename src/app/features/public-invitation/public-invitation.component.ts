import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, InvitationModel, RsvpResponse } from '../../core/models';

@Component({ selector: 'app-public-invitation', templateUrl: './public-invitation.component.html' })
export class PublicInvitationComponent implements OnInit {
  invitation?: InvitationModel;
  event?: EventModel;
  loading = false;
  sending = false;
  error = '';
  success = '';
  rsvp = { name: '', email: '', response: 'confirmed' as RsvpResponse, companions: 0, mealPreference: '', message: '' };

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loading = true;
    this.error = '';
    this.api.getPublicInvitation(slug).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        this.event = typeof invitation.event === 'string' ? undefined : invitation.event;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Invitacion no disponible.';
        this.loading = false;
      }
    });
  }

  submit(): void {
    if (!this.invitation) return;
    this.sending = true;
    this.error = '';
    this.success = '';
    this.api.submitRsvp(this.invitation.slug, this.rsvp).subscribe({
      next: () => {
        this.success = 'Gracias, tu respuesta fue registrada.';
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo enviar tu RSVP.';
        this.sending = false;
      }
    });
  }
}
