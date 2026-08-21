import { Component, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { AlbumAssetModel, EventModel, InvitationModel } from '../../../../core/models';

export const TAG_SUPER_ENCANTA = 'Me super encanta';
export const TAG_ME_ENCANTA = 'Me encanta';

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
  selectedTagFilter: string = 'all';
  selectedAsset?: AlbumAssetModel;

  // Tags Presets
  readonly TAG_SUPER_ENCANTA = TAG_SUPER_ENCANTA;
  readonly TAG_ME_ENCANTA = TAG_ME_ENCANTA;

  // Revisión Rápida (Swipe / Modal Deck)
  quickReviewOpen = false;
  quickReviewIndex = 0;
  swipeCardAnimation: 'none' | 'swipe-left' | 'swipe-right' = 'none';

  // Gestos de Arrastre (Drag / Swipe)
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  dragCurrentX = 0;
  dragCurrentY = 0;
  dragOffsetX = 0;
  dragOffsetY = 0;
  readonly dragThreshold = 90; // Pixels to trigger approve/reject

  // Input de tags en revisión rápida y modal
  quickReviewCustomTag = '';
  lightboxCustomTag = '';

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

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (!this.quickReviewOpen) return;
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return; // No interceptar cuando se escribe en un input
    }

    const currentAsset = this.currentReviewAsset;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (currentAsset) this.triggerQuickAction(currentAsset, 'rejected');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (currentAsset) this.triggerQuickAction(currentAsset, 'approved');
    } else if (event.key === '1' && currentAsset) {
      event.preventDefault();
      this.toggleTag(currentAsset, this.TAG_SUPER_ENCANTA);
    } else if (event.key === '2' && currentAsset) {
      event.preventDefault();
      this.toggleTag(currentAsset, this.TAG_ME_ENCANTA);
    } else if (event.key === 'Escape') {
      this.closeQuickReview();
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
        this.albumAssets = (res.assets || []).map(asset => ({
          ...asset,
          tags: Array.isArray(asset.tags) ? asset.tags : []
        }));
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
      delete (updatedContent as any).template;
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

  // --- GETTERS DE CONTADORES Y FILTROS ---

  get pendingAssetsList(): AlbumAssetModel[] {
    return this.albumAssets.filter(a => a.status === 'pending');
  }

  get pendingAlbumAssets(): number {
    return this.pendingAssetsList.length;
  }

  get approvedCount(): number {
    return this.albumAssets.filter(a => a.status === 'approved').length;
  }

  get rejectedCount(): number {
    return this.albumAssets.filter(a => a.status === 'rejected').length;
  }

  get currentReviewAsset(): AlbumAssetModel | undefined {
    const list = this.pendingAssetsList;
    if (this.quickReviewIndex >= list.length) {
      this.quickReviewIndex = Math.max(0, list.length - 1);
    }
    return list[this.quickReviewIndex];
  }

  get nextReviewAsset(): AlbumAssetModel | undefined {
    const list = this.pendingAssetsList;
    if (this.quickReviewIndex + 1 < list.length) {
      return list[this.quickReviewIndex + 1];
    }
    return undefined;
  }

  get availableTags(): string[] {
    const tagSet = new Set<string>();
    for (const asset of this.albumAssets) {
      if (asset.tags && Array.isArray(asset.tags)) {
        for (const t of asset.tags) {
          if (t && t.trim()) tagSet.add(t.trim());
        }
      }
    }
    const tags = Array.from(tagSet);
    // Ordenar de modo que 'Me super encanta' y 'Me encanta' aparezcan primero si existen
    return tags.sort((a, b) => {
      if (a === this.TAG_SUPER_ENCANTA) return -1;
      if (b === this.TAG_SUPER_ENCANTA) return 1;
      if (a === this.TAG_ME_ENCANTA) return -1;
      if (b === this.TAG_ME_ENCANTA) return 1;
      return a.localeCompare(b);
    });
  }

  getTagCount(tag: string): number {
    return this.albumAssets.filter(a => Array.isArray(a.tags) && a.tags.includes(tag)).length;
  }

  get filteredAlbumAssets(): AlbumAssetModel[] {
    let result = this.albumAssets;
    if (this.filterStatus !== 'all') {
      result = result.filter(a => a.status === this.filterStatus);
    }
    if (this.selectedTagFilter !== 'all') {
      result = result.filter(a => Array.isArray(a.tags) && a.tags.includes(this.selectedTagFilter));
    }
    return result;
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

  // --- REVISIÓN RÁPIDA (SWIPE & BUTTONS) ---

  openQuickReview(): void {
    this.quickReviewIndex = 0;
    this.quickReviewOpen = true;
    this.resetDrag();
  }

  closeQuickReview(): void {
    this.quickReviewOpen = false;
    this.resetDrag();
  }

  triggerQuickAction(asset: AlbumAssetModel, status: 'approved' | 'rejected'): void {
    if (this.swipeCardAnimation !== 'none') return;
    this.swipeCardAnimation = status === 'approved' ? 'swipe-right' : 'swipe-left';

    setTimeout(() => {
      this.updateAlbumAsset(asset, status);
      this.swipeCardAnimation = 'none';
      this.resetDrag();
    }, 280);
  }

  // Gestos táctiles y mouse drag para deslizar tarjetas
  onDragStart(event: MouseEvent | TouchEvent): void {
    if (this.swipeCardAnimation !== 'none') return;
    const touch = 'touches' in event ? event.touches[0] : (event as MouseEvent);
    this.isDragging = true;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    const touch = 'touches' in event ? event.touches[0] : (event as MouseEvent);
    this.dragCurrentX = touch.clientX;
    this.dragCurrentY = touch.clientY;
    this.dragOffsetX = this.dragCurrentX - this.dragStartX;
    this.dragOffsetY = (this.dragCurrentY - this.dragStartY) * 0.4;
  }

  onDragEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const currentAsset = this.currentReviewAsset;
    if (this.dragOffsetX > this.dragThreshold && currentAsset) {
      this.triggerQuickAction(currentAsset, 'approved');
    } else if (this.dragOffsetX < -this.dragThreshold && currentAsset) {
      this.triggerQuickAction(currentAsset, 'rejected');
    } else {
      this.resetDrag();
    }
  }

  resetDrag(): void {
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  get cardTransformStyle(): string {
    if (this.swipeCardAnimation === 'swipe-right') {
      return 'translateX(120%) rotate(25deg) scale(0.9)';
    }
    if (this.swipeCardAnimation === 'swipe-left') {
      return 'translateX(-120%) rotate(-25deg) scale(0.9)';
    }
    if (this.dragOffsetX !== 0 || this.dragOffsetY !== 0) {
      const rotate = (this.dragOffsetX / 15);
      return `translate3d(${this.dragOffsetX}px, ${this.dragOffsetY}px, 0) rotate(${rotate}deg)`;
    }
    return 'none';
  }

  get approveOpacity(): number {
    if (this.swipeCardAnimation === 'swipe-right') return 1;
    if (this.dragOffsetX > 20) {
      return Math.min(1, this.dragOffsetX / this.dragThreshold);
    }
    return 0;
  }

  get rejectOpacity(): number {
    if (this.swipeCardAnimation === 'swipe-left') return 1;
    if (this.dragOffsetX < -20) {
      return Math.min(1, Math.abs(this.dragOffsetX) / this.dragThreshold);
    }
    return 0;
  }

  // --- GESTIÓN DE TAGS ---

  hasTag(asset: AlbumAssetModel, tag: string): boolean {
    return Array.isArray(asset.tags) && asset.tags.includes(tag);
  }

  toggleTag(asset: AlbumAssetModel, tag: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!Array.isArray(asset.tags)) asset.tags = [];

    if (asset.tags.includes(tag)) {
      asset.tags = asset.tags.filter(t => t !== tag);
    } else {
      asset.tags.push(tag);
    }
    this.saveTags(asset);
  }

  addCustomTagFromQuickReview(asset: AlbumAssetModel): void {
    const val = (this.quickReviewCustomTag || '').trim();
    if (!val) return;
    if (!Array.isArray(asset.tags)) asset.tags = [];
    if (!asset.tags.includes(val)) {
      asset.tags.push(val);
      this.saveTags(asset);
    }
    this.quickReviewCustomTag = '';
  }

  addCustomTagFromLightbox(asset: AlbumAssetModel): void {
    const val = (this.lightboxCustomTag || '').trim();
    if (!val) return;
    if (!Array.isArray(asset.tags)) asset.tags = [];
    if (!asset.tags.includes(val)) {
      asset.tags.push(val);
      this.saveTags(asset);
    }
    this.lightboxCustomTag = '';
  }

  removeTag(asset: AlbumAssetModel, tag: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!Array.isArray(asset.tags)) return;
    asset.tags = asset.tags.filter(t => t !== tag);
    this.saveTags(asset);
  }

  private saveTags(asset: AlbumAssetModel): void {
    const targetEventId = this.eventId || this.event?._id || this.event?.id;
    const aId = (asset._id || asset.id)!;
    if (!targetEventId || !aId) return;

    this.apiService.updateAlbumAsset(targetEventId, aId, { tags: asset.tags }).subscribe({
      next: res => {
        if (res.asset && Array.isArray(res.asset.tags)) {
          asset.tags = res.asset.tags;
        }
      },
      error: () => {
        this.showError('No se pudieron guardar las etiquetas en el servidor.');
      }
    });
  }

  // --- ACTUALIZACIÓN DE ESTADO NORMAL ---

  updateAlbumAsset(asset: AlbumAssetModel, status: 'approved' | 'rejected', event?: Event): void {
    if (event) event.stopPropagation();
    const targetEventId = this.eventId || this.event?._id || this.event?.id;
    const aId = (asset._id || asset.id)!;
    if (!targetEventId || !aId) return;

    this.apiService.updateAlbumAsset(targetEventId, aId, { status, tags: asset.tags }).subscribe({
      next: res => {
        asset.status = res.asset.status;
        if (res.asset.tags) asset.tags = res.asset.tags;
        this.showSuccess(`Foto marcada como ${status === 'approved' ? 'aprobada ✅' : 'rechazada ❌'}`);
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al actualizar estado de la foto');
      }
    });
  }

  openPreviewModal(asset: AlbumAssetModel): void {
    this.selectedAsset = asset;
    this.lightboxCustomTag = '';
  }

  closePreviewModal(): void {
    this.selectedAsset = undefined;
    this.lightboxCustomTag = '';
  }
}

