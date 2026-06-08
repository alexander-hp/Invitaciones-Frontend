import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AssetFolder, EventModel, InvitationModel, PaymentPackage, TemplateModel } from '../../core/models';

@Component({ selector: 'app-invitation-editor', templateUrl: './invitation-editor.component.html' })
export class InvitationEditorComponent implements OnInit {
  invitation?: InvitationModel;
  event?: EventModel;
  templates: TemplateModel[] = [];
  loading = false;
  saving = false;
  publishing = false;
  assetUploading = false;
  checkoutLoading = '';
  message = '';
  error = '';
  assetMessage = '';
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
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureRsvpSettings();
        this.event = typeof this.invitation.event === 'string' ? undefined : this.invitation.event;
        this.publicUrl = `${window.location.origin}/i/${this.invitation.slug}`;
        this.loadTemplates();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar la invitacion.';
        this.loading = false;
      }
    });
  }

  loadTemplates(): void {
    this.api.listTemplates(this.event?.type).subscribe({
      next: ({ templates }) => this.templates = templates,
      error: () => this.templates = []
    });
  }

  applyTemplate(template: TemplateModel): void {
    if (!this.invitation) return;
    this.invitation.template = template._id || template.id;
    if (template.config?.palette) {
      this.invitation.content.palette = {
        ...this.invitation.content.palette,
        ...template.config.palette
      };
    }
    this.invitation.content.subheadline = template.name;
    this.message = `Plantilla seleccionada: ${template.name}`;
  }

  save(): void {
    if (!this.invitation) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.api.updateInvitation(this.getInvitationId(this.invitation), {
      slug: this.invitation.slug,
      accessMode: this.invitation.accessMode,
      rsvpSettings: this.getRsvpSettingsPayload(),
      template: this.invitation.template,
      content: this.invitation.content
    }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureRsvpSettings();
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
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureRsvpSettings();
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

  selectAsset(event: Event, folder: AssetFolder): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.invitation) return;
    this.assetUploading = true;
    this.assetMessage = '';
    this.error = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, size: file.size }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            if (!this.invitation) return;
            if (folder === 'covers') this.invitation.content.coverImageUrl = upload.publicUrl;
            if (folder === 'music') this.invitation.content.musicUrl = upload.publicUrl;
            if (folder === 'gallery') this.invitation.content.gallery = [...(this.invitation.content.gallery || []), upload.publicUrl];
            this.persistUploadedAsset();
          },
          error: () => {
            this.error = 'S3 rechazo la subida. Revisa CORS del bucket, permisos PutObject y que el archivo coincida con el tipo permitido.';
            this.assetUploading = false;
          }
        });
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo preparar la URL de subida. Revisa AWS_S3_BUCKET, region, credenciales y tipo de archivo.';
        this.assetUploading = false;
      }
    });
  }

  checkout(pack: PaymentPackage): void {
    if (!this.invitation) return;
    this.checkoutLoading = pack;
    this.error = '';
    this.api.createCheckout({ package: pack, invitation: this.getInvitationId(this.invitation) }).subscribe({
      next: ({ checkoutUrl }) => {
        window.location.href = checkoutUrl;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo iniciar el checkout.';
        this.checkoutLoading = '';
      }
    });
  }

  getInvitationId(invitation: InvitationModel): string {
    return invitation._id || invitation.id || '';
  }

  private persistUploadedAsset(): void {
    if (!this.invitation) return;
    this.api.updateInvitation(this.getInvitationId(this.invitation), {
      slug: this.invitation.slug,
      accessMode: this.invitation.accessMode,
      rsvpSettings: this.getRsvpSettingsPayload(),
      template: this.invitation.template,
      content: this.invitation.content
    }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureRsvpSettings();
        this.publicUrl = `${window.location.origin}/i/${invitation.slug}`;
        this.assetMessage = 'Asset subido y guardado en la invitacion.';
        this.assetUploading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'El asset subio a S3, pero no se pudo guardar en la invitacion.';
        this.assetUploading = false;
      }
    });
  }

  private ensureRsvpSettings(): void {
    if (!this.invitation) return;
    this.invitation.rsvpSettings = {
      deadline: this.invitation.rsvpSettings?.deadline,
      allowMaybe: this.invitation.rsvpSettings?.allowMaybe !== false,
      allowChangesUntilDeadline: this.invitation.rsvpSettings?.allowChangesUntilDeadline !== false,
      declineRequiresConfirmation: this.invitation.rsvpSettings?.declineRequiresConfirmation !== false,
      reminderDaysBeforeDeadline: this.invitation.rsvpSettings?.reminderDaysBeforeDeadline ?? 3
    };
  }

  private getRsvpSettingsPayload() {
    if (!this.invitation?.rsvpSettings) return undefined;
    return {
      ...this.invitation.rsvpSettings,
      deadline: this.invitation.rsvpSettings.deadline || undefined,
      reminderDaysBeforeDeadline: Number(this.invitation.rsvpSettings.reminderDaysBeforeDeadline ?? 3)
    };
  }
}
