import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { AlbumAssetModel, EventModel, InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-event-album-tab',
  templateUrl: './event-album-tab.component.html'
})
export class EventAlbumTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;
  @Input() event?: EventModel;

  albumAssets: AlbumAssetModel[] = [];
  loadingAlbum = false;
  albumError = '';
  albumMessage = '';

  private messageTimeout?: any;
  private errorTimeout?: any;

  albumQrUrl = '';
  albumPublicUrl = '';
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  selectedAsset?: AlbumAssetModel;

  // Imagen de Portada del Evento / Invitación
  invitation?: InvitationModel;
  coverImageUrl = '';
  uploadingCover = false;
  previewCoverModal = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.eventId || this.event) {
      this.loadAlbum();
      this.loadInvitation();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const id = this.eventId || this.event?._id || this.event?.id;
    if (id) {
      this.loadAlbum();
      this.loadInvitation();
    }
  }

  showSuccess(msg: string): void {
    this.albumMessage = msg;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.albumMessage = '';
    }, 3500);
  }

  showError(msg: string): void {
    this.albumError = msg;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => {
      this.albumError = '';
    }, 4000);
  }

  loadAlbum(): void {
    const id = this.eventId || this.event?._id || this.event?.id;
    if (!id) return;
    this.loadingAlbum = true;
    this.apiService.listAlbum(id).subscribe({
      next: res => {
        this.albumAssets = res.assets || [];
        this.loadingAlbum = false;
        this.generateQrUrl();
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al cargar fotos del álbum');
        this.loadingAlbum = false;
      }
    });
  }

  loadInvitation(): void {
    const targetEventId = String(this.eventId || this.event?._id || this.event?.id || '').trim();
    if (!targetEventId) return;

    this.apiService.listInvitations().subscribe({
      next: res => {
        const matches = (res.invitations || []).filter(i => {
          const invEvId = typeof i.event === 'string' ? i.event : (i.event?._id || i.event?.id || '');
          return String(invEvId).trim() === targetEventId;
        });

        // Prefer the invitation that has a coverImageUrl set, or the most recent match
        this.invitation = matches.find(i => !!i.content?.coverImageUrl) || matches[0];

        if (this.invitation?.content?.coverImageUrl) {
          this.coverImageUrl = this.invitation.content.coverImageUrl;
        } else {
          this.syncCoverFromEvent();
        }
      },
      error: () => {
        this.syncCoverFromEvent();
      }
    });
  }

  private syncCoverFromEvent(): void {
    if (this.event?.externalContent?.coverImageUrl) {
      this.coverImageUrl = this.event.externalContent.coverImageUrl;
    }
  }

  uploadCoverImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const targetEventId = this.eventId || this.event?._id || this.event?.id;
    if (!file || !targetEventId) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      this.showError('Formato no válido. Sube una imagen (JPG, PNG, WEBP).');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showError('La imagen de portada no debe sobrepasar 5MB.');
      input.value = '';
      return;
    }

    this.uploadingCover = true;
    this.apiService.createUploadUrl({
      fileName: file.name,
      contentType: file.type,
      folder: 'covers',
      event: targetEventId,
      size: file.size
    }).subscribe({
      next: upload => {
        this.apiService.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            const publicUrl = upload.publicUrl;
            this.coverImageUrl = publicUrl;
            this.saveCoverImage(publicUrl, input);
          },
          error: () => {
            this.showError('Error al subir el archivo de portada.');
            this.uploadingCover = false;
            input.value = '';
          }
        });
      },
      error: err => {
        this.showError(err?.error?.message || 'No se pudo preparar la URL de subida.');
        this.uploadingCover = false;
        input.value = '';
      }
    });
  }

  saveCoverImage(url: string, input?: HTMLInputElement): void {
    const targetEventId = this.eventId || this.event?._id || this.event?.id;
    if (this.invitation) {
      const invId = (this.invitation._id || this.invitation.id)!;
      const updatedContent = { ...(this.invitation.content || {}), coverImageUrl: url };
      this.apiService.updateInvitation(invId, { content: updatedContent }).subscribe({
        next: res => {
          this.invitation = res.invitation;
          this.coverImageUrl = url;
          this.uploadingCover = false;
          if (input) input.value = '';
          this.showSuccess(url ? '✨ ¡Imagen de portada guardada con éxito!' : '🗑️ Imagen de portada eliminada.');
        },
        error: () => {
          this.showError('Error al guardar la portada en la invitación.');
          this.uploadingCover = false;
          if (input) input.value = '';
        }
      });
    } else if (targetEventId) {
      this.apiService.createInvitation({ event: targetEventId, content: { coverImageUrl: url } }).subscribe({
        next: res => {
          this.invitation = res.invitation;
          this.coverImageUrl = url;
          this.uploadingCover = false;
          if (input) input.value = '';
          this.showSuccess(url ? '✨ ¡Imagen de portada asignada!' : '🗑️ Imagen de portada eliminada.');
        },
        error: () => {
          if (this.event) {
            const extContent = { ...(this.event.externalContent || {}), coverImageUrl: url };
            this.apiService.updateEvent(targetEventId, { externalContent: extContent }).subscribe({
              next: () => {
                this.coverImageUrl = url;
                this.uploadingCover = false;
                if (input) input.value = '';
                this.showSuccess(url ? '✨ ¡Imagen de portada actualizada!' : '🗑️ Imagen de portada eliminada.');
              },
              error: () => {
                this.uploadingCover = false;
                if (input) input.value = '';
                this.showError('No se pudo guardar la imagen de portada.');
              }
            });
          } else {
            this.uploadingCover = false;
            if (input) input.value = '';
          }
        }
      });
    }
  }

  removeCoverImage(): void {
    if (!confirm('¿Estás seguro de que deseas eliminar la imagen de portada?')) return;
    this.saveCoverImage('');
  }

  get pendingAlbumAssets(): number {
    return this.albumAssets.filter(a => a.status === 'pending').length;
  }

  get approvedCount(): number {
    return this.albumAssets.filter(a => a.status === 'approved').length;
  }

  get rejectedCount(): number {
    return this.albumAssets.filter(a => a.status === 'rejected').length;
  }

  get filteredAlbumAssets(): AlbumAssetModel[] {
    if (this.filterStatus === 'all') return this.albumAssets;
    return this.albumAssets.filter(a => a.status === this.filterStatus);
  }

  generateQrUrl(): void {
    this.albumPublicUrl = `${window.location.origin}/new/e/${this.eventId}`;
    this.albumQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.albumPublicUrl)}`;
  }

  copyPublicLink(): void {
    if (!this.albumPublicUrl) return;
    navigator.clipboard.writeText(this.albumPublicUrl).then(() => {
      this.showSuccess('¡Enlace del álbum copiado al portapapeles!');
    }).catch(() => {
      this.showError('No se pudo copiar el enlace.');
    });
  }

  updateAlbumAsset(asset: AlbumAssetModel, status: 'approved' | 'rejected', event?: Event): void {
    if (event) event.stopPropagation();
    if (asset.status === status) return;
    const aId = (asset._id || asset.id)!;
    this.apiService.updateAlbumAsset(this.eventId, aId, status).subscribe({
      next: res => {
        asset.status = res.asset.status;
        this.showSuccess(`Foto marcada como ${status === 'approved' ? 'aprobada ✅' : 'rechazada ❌'}`);
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al actualizar estado de la foto');
      }
    });
  }

  openPreviewModal(asset: AlbumAssetModel): void {
    this.selectedAsset = asset;
  }

  closePreviewModal(): void {
    this.selectedAsset = undefined;
  }
}
