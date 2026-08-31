import { Component, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { AlbumAssetModel, EventModel, EventAccessLinkModel, EventAccessRole } from '../../../../core/models';

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

  // Accesos Externos y QR del Álbum
  albumAccessLinks: EventAccessLinkModel[] = [];
  loadingAccessLinks = false;
  creatingAccessLink = false;
  isAccessLinksCollapsed = true;
  selectedQrLink?: EventAccessLinkModel;

  // Filtros de Estado y Etiquetas
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  selectedTagFilter: string = 'all';
  selectedAsset?: AlbumAssetModel;

  // Paginación Local
  currentPage = 1;
  pageSize = 12;
  pageSizeOptions = [12, 24, 48, 96];

  // Tags Presets
  readonly TAG_SUPER_ENCANTA = TAG_SUPER_ENCANTA;
  readonly TAG_ME_ENCANTA = TAG_ME_ENCANTA;

  get publicAlbumAccessUrl(): string {
    const albumViewLink = this.albumAccessLinks.find(l => l.role === 'album_view') || this.albumAccessLinks[0];
    if (albumViewLink) {
      return this.getAccessLinkFullUrl(albumViewLink);
    }
    const targetEventId = this.eventId || this.event?._id || this.event?.id;
    if (targetEventId) {
      return `${window.location.origin}/new/external-access/${targetEventId}`;
    }
    return window.location.href;
  }

  private async convertUrlToPngBlob(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al convertir la imagen.'));
            }
          }, 'image/png');
        } else {
          reject(new Error('Error al obtener contexto de Canvas.'));
        }
      };
      img.onerror = () => {
        fetch(url)
          .then(res => res.blob())
          .then(blob => resolve(blob))
          .catch(err => reject(err));
      };
      img.src = url;
    });
  }

  async sharePhotoAsset(asset: AlbumAssetModel, e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    if (!asset || !asset.url) return;

    const albumUrl = this.publicAlbumAccessUrl;
    const title = `${this.event?.title || 'Evento'} - Fotografía`;

    try {
      this.showSuccess('Preparando imagen para compartir...');
      const pngBlob = await this.convertUrlToPngBlob(asset.url);
      const file = new File([pngBlob], 'fotografia-evento.png', { type: pngBlob.type || 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: `📸 Fotografía del Evento.\n\n📲 Ver Álbum Completo: ${albumUrl}`,
          files: [file]
        });
        this.showSuccess('¡Fotografía compartida como elemento!');
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }

    await this.copyPhotoBlobToClipboard(asset.url, albumUrl);
  }

  // Descarga directa de la fotografía en alta calidad
  async downloadPhotoAsset(asset?: AlbumAssetModel, e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    const targetAsset = asset || this.selectedAsset;
    if (!targetAsset || !targetAsset.url) {
      this.showError('No hay fotografía para descargar.');
      return;
    }

    try {
      this.showSuccess('Iniciando descarga de la fotografía...');
      const response = await fetch(targetAsset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = targetAsset.url.split('.').pop()?.split('?')[0] || 'jpg';
      a.download = `fotografia-evento-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.showSuccess('¡Fotografía descargada con éxito!');
    } catch (err) {
      window.open(targetAsset.url, '_blank');
      this.showSuccess('Fotografía abierta en pestaña nueva para guardar.');
    }
  }

  // Compartir enlace público del Álbum (Galería de Fotos)
  sharePublicAlbumUrl(e?: Event): void {
    if (e) e.stopPropagation();
    const albumUrl = this.publicAlbumAccessUrl;
    const title = `${this.event?.title || 'Evento'} - Galería de Fotos del Evento`;
    const text = `📸 Galería de Fotos del Evento:\n${albumUrl}`;

    if (navigator.share) {
      navigator.share({ title, text, url: albumUrl }).then(() => {
        this.showSuccess('¡Enlace del álbum compartido!');
      }).catch(() => {
        this.copyAlbumAccessUrl();
      });
    } else {
      this.copyAlbumAccessUrl();
    }
  }

  copyAlbumAccessUrl(): void {
    const albumUrl = this.publicAlbumAccessUrl;
    navigator.clipboard.writeText(albumUrl).then(() => {
      this.showSuccess('¡Enlace público del álbum copiado al portapapeles!');
    }).catch(() => {
      this.showError('No se pudo copiar el enlace.');
    });
  }

  async copyPhotoBlobToClipboard(photoUrl: string, albumUrl: string): Promise<void> {
    try {
      this.showSuccess('Copiando imagen al portapapeles...');
      const pngBlob = await this.convertUrlToPngBlob(photoUrl);

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const itemType = pngBlob.type.includes('png') ? 'image/png' : pngBlob.type;
        await navigator.clipboard.write([
          new ClipboardItem({
            [itemType]: pngBlob
          })
        ]);
        this.showSuccess('¡Imagen copiada al portapapeles! Ya puedes pegarla (Ctrl+V) como foto en tu chat.');
        return;
      }
    } catch (err) {
      console.warn('Fallo al copiar Blob de imagen:', err);
    }

    try {
      await navigator.clipboard.writeText(`📲 Álbum del Evento: ${albumUrl}`);
      this.showSuccess('¡Enlace público del álbum copiado al portapapeles!');
    } catch (e) {
      this.showError('No se pudo copiar la imagen al portapapeles.');
    }
  }

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

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.eventId || this.event) {
      this.loadAlbum();
      this.loadAlbumAccessLinks();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const id = this.eventId || this.event?._id || this.event?.id;
    if (id) {
      this.loadAlbum();
      this.loadAlbumAccessLinks();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (this.quickReviewOpen) {
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
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al cargar fotos del álbum');
        this.loadingAlbum = false;
      }
    });
  }

  // --- ESCANEO DE ACCESOS EXTERNOS VIGENTES DEL ÁLBUM ---

  loadAlbumAccessLinks(): void {
    const targetEventId = this.eventId || this.event?._id || this.event?.id;
    if (!targetEventId) return;

    this.loadingAccessLinks = true;
    this.apiService.listEventAccessLinks(targetEventId).subscribe({
      next: res => {
        const albumRoles: EventAccessRole[] = ['album_view', 'photographer', 'album_review'];
        const now = Date.now();
        this.albumAccessLinks = (res.links || []).filter(link => {
          const isAlbumRole = albumRoles.includes(link.role);
          const isNotRevoked = !link.revokedAt;
          const isNotExpired = !link.expiresAt || new Date(link.expiresAt).getTime() > now;
          return isAlbumRole && isNotRevoked && isNotExpired;
        });
        this.loadingAccessLinks = false;
      },
      error: () => {
        this.loadingAccessLinks = false;
      }
    });
  }

  getAccessLinkFullUrl(link: EventAccessLinkModel): string {
    if (!link) return '';
    let url = link.url || `/new/external-access/${link._id || link.id}`;
    if (url.includes('/external-access/') && !url.includes('/new/external-access/')) {
      url = url.replace('/external-access/', '/new/external-access/');
    }
    if (url.startsWith('/')) {
      url = `${window.location.origin}${url}`;
    }
    return url;
  }

  toggleAccessLinks(): void {
    this.isAccessLinksCollapsed = !this.isAccessLinksCollapsed;
  }

  openQrModal(link: EventAccessLinkModel, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedQrLink = link;
  }

  closeQrModal(): void {
    this.selectedQrLink = undefined;
  }

  getAccessLinkQrUrl(link: EventAccessLinkModel, size: string = '250x250'): string {
    const fullUrl = this.getAccessLinkFullUrl(link);
    return `https://api.qrserver.com/v1/create-qr-code/?size=&data=${encodeURIComponent(fullUrl)}`;
  }

  copyAccessLinkUrl(link: EventAccessLinkModel): void {
    const url = this.getAccessLinkFullUrl(link);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.showSuccess('¡Enlace copiado al portapapeles!');
    }).catch(() => {
      this.showError('No se pudo copiar el enlace.');
    });
  }

  createQuickAlbumLink(role: 'album_view' | 'photographer'): void {
    const targetEventId = this.eventId || this.event?._id || this.event?.id;
    if (!targetEventId) return;

    const label = role === 'album_view' ? 'Ver Álbum Oficial' : 'Subir Fotos del Evento';
    this.creatingAccessLink = true;
    this.apiService.createEventAccessLink(targetEventId, { role, label, days: 30 }).subscribe({
      next: () => {
        this.creatingAccessLink = false;
        this.showSuccess(`✨ ¡Acceso para ${role === 'album_view' ? 'Ver Álbum' : 'Subir Fotos'} generado con éxito!`);
        this.loadAlbumAccessLinks();
      },
      error: err => {
        this.creatingAccessLink = false;
        this.showError(err?.error?.message || 'No se pudo generar el enlace de acceso.');
      }
    });
  }

  getRoleTitle(role: EventAccessRole): string {
    switch (role) {
      case 'album_view': return '🖼️ Ver Álbum (Galería de Fotos)';
      case 'photographer': return '📸 Subir Fotos (Fotógrafo / Invitados)';
      case 'album_review': return '⚡ Revisión Rápida Externa';
      default: return '🔗 Acceso al Álbum';
    }
  }

  getRoleDescription(role: EventAccessRole): string {
    switch (role) {
      case 'album_view': return 'Permite a los invitados o pantallas gigantes ver la galería de fotografías aprobadas en tiempo real.';
      case 'photographer': return 'Permite a los invitados o fotógrafos subir fotografías directamente al álbum sin inicio de sesión.';
      case 'album_review': return 'Permite a moderadores externos revisar y aprobar fotos desde un panel simplificado.';
      default: return 'Enlace externo para interactuar con las fotos del evento.';
    }
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

  // --- PAGINACIÓN LOCAL ---

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAlbumAssets.length / this.pageSize));
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredAlbumAssets.length);
  }

  get paginatedAlbumAssets(): AlbumAssetModel[] {
    const total = this.filteredAlbumAssets.length;
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
    return this.filteredAlbumAssets.slice(this.startIndex, this.endIndex);
  }

  get pagesList(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.add(i);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changePageSize(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
  }

  setFilterStatus(status: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.filterStatus = status;
    this.currentPage = 1;
  }

  setSelectedTag(tag: string): void {
    this.selectedTagFilter = tag;
    this.currentPage = 1;
  }

  trackByAssetId(index: number, item: AlbumAssetModel): string {
    return (item._id || item.id || String(index));
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
