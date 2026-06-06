import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, InvitationModel } from '../../core/models';

@Component({ selector: 'app-invitation-editor', templateUrl: './invitation-editor.component.html' })
export class InvitationEditorComponent implements OnInit {
  invitation?: InvitationModel;
  event?: EventModel;
  loading = false;
  saving = false;
  publishing = false;
  message = '';
  error = '';
  publicUrl = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find((item) => this.getInvitationId(item) === id);
        if (!this.invitation) {
          this.error = 'Invitacion no encontrada.';
          this.loading = false;
          return;
        }
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        this.event = typeof this.invitation.event === 'string' ? undefined : this.invitation.event;
        this.publicUrl = `${window.location.origin}/i/${this.invitation.slug}`;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar la invitacion.';
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.invitation) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.api.updateInvitation(this.getInvitationId(this.invitation), {
      slug: this.invitation.slug,
      content: this.invitation.content
    }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        this.publicUrl = `${window.location.origin}/i/${invitation.slug}`;
        this.message = 'Invitacion guardada.';
        this.saving = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo guardar.';
        this.saving = false;
      }
    });
  }

  publish(): void {
    if (!this.invitation) return;
    this.publishing = true;
    this.message = '';
    this.error = '';
    this.api.publishInvitation(this.getInvitationId(this.invitation)).subscribe({
      next: ({ invitation, publicUrl }) => {
        this.invitation = invitation;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        this.publicUrl = publicUrl || `${window.location.origin}/i/${invitation.slug}`;
        this.message = 'Invitacion publicada.';
        this.publishing = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo publicar.';
        this.publishing = false;
      }
    });
  }

  getInvitationId(invitation: InvitationModel): string {
    return invitation._id || invitation.id || '';
  }
}
