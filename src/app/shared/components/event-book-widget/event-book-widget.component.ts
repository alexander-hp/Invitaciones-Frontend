import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, HostListener } from '@angular/core';
import { AlbumAssetModel } from '../../../core/models';
import html2canvas from 'html2canvas';

export const TAG_SUPER_ENCANTA = 'Me super encanta';
export const TAG_ME_ENCANTA = 'Me encanta';

@Component({
  selector: 'app-event-book-widget',
  templateUrl: './event-book-widget.component.html'
})
export class EventBookWidgetComponent implements OnDestroy {
  @Input() assets: AlbumAssetModel[] = [];
  @Input() eventTitle: string = 'Nuestro Evento Especial';
  @Input() publicAccessUrl?: string;
  @Input() qrCodeUrl?: string;

  // Constantes de Tags
  readonly TAG_SUPER_ENCANTA = TAG_SUPER_ENCANTA;
  readonly TAG_ME_ENCANTA = TAG_ME_ENCANTA;

  // Estado del widget
  bookPageIndex = 0;
  isExportingBookPage = false;

  // Notificaciones internas del widget
  widgetMessage = '';
  widgetError = '';
  private messageTimeout?: any;
  private errorTimeout?: any;

  // Modal de Historias (9:16)
  storyModalOpen = false;
  storyAsset?: AlbumAssetModel;
  storyPageTitle = '';

  // Modal Presentación Slideshow Pantalla Completa
  fullscreenBookOpen = false;
  fullscreenIndex = 0;
  isPlayingSlideshow = false;
  slideshowSpeed = 4000;
  private slideshowInterval?: any;
  fullscreenFilter: string = 'all';

  // Modal Hoja Completa en Pantalla Completa
  fullscreenBookPageOpen = false;

  ngOnDestroy(): void {
    this.clearSlideshowInterval();
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
  }

  showSuccess(msg: string): void {
    this.widgetMessage = msg;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.widgetMessage = '';
    }, 3500);
  }

  showError(msg: string): void {
    this.widgetError = msg;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => {
      this.widgetError = '';
    }, 4000);
  }

  get availableAssets(): AlbumAssetModel[] {
    const list = this.assets || [];
    const filtered = list.filter(a => a.status === 'approved' || a.status === 'pending');
    return filtered.length > 0 ? filtered : list;
  }

  get availableTags(): string[] {
    const tagSet = new Set<string>();
    for (const asset of this.availableAssets) {
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
    return this.availableAssets.filter(a => Array.isArray(a.tags) && a.tags.includes(tag)).length;
  }

  hasTag(asset: AlbumAssetModel, tag: string): boolean {
    return Array.isArray(asset.tags) && asset.tags.includes(tag);
  }

  get bookPages(): Array<{ title: string; icon: string; tag: string; assets: AlbumAssetModel[] }> {
    const assetsList = this.availableAssets;

    const pages = [
      {
        title: 'Me encanta',
        icon: '❤️',
        tag: this.TAG_ME_ENCANTA,
        assets: assetsList.filter(a => Array.isArray(a.tags) && a.tags.includes(this.TAG_ME_ENCANTA))
      },
      {
        title: 'Me super encanta',
        icon: '⭐',
        tag: this.TAG_SUPER_ENCANTA,
        assets: assetsList.filter(a => Array.isArray(a.tags) && a.tags.includes(this.TAG_SUPER_ENCANTA))
      }
    ];

    const customTags = this.availableTags.filter(t => t !== this.TAG_ME_ENCANTA && t !== this.TAG_SUPER_ENCANTA);
    for (const tag of customTags) {
      pages.push({
        title: tag,
        icon: '🏷️',
        tag: tag,
        assets: assetsList.filter(a => Array.isArray(a.tags) && a.tags.includes(tag))
      });
    }

    return pages;
  }

  get currentBookPage() {
    const pages = this.bookPages;
    if (this.bookPageIndex >= pages.length) {
      this.bookPageIndex = 0;
    }
    return pages[this.bookPageIndex] || pages[0];
  }

  nextBookPage(): void {
    if (this.bookPageIndex < this.bookPages.length - 1) {
      this.bookPageIndex++;
    } else {
      this.bookPageIndex = 0;
    }
  }

  prevBookPage(): void {
    if (this.bookPageIndex > 0) {
      this.bookPageIndex--;
    } else {
      this.bookPageIndex = Math.max(0, this.bookPages.length - 1);
    }
  }

  goToBookPage(index: number): void {
    if (index >= 0 && index < this.bookPages.length) {
      this.bookPageIndex = index;
    }
  }

  getBookCollageClass(asset: AlbumAssetModel, index: number): string {
    const totalAssets = this.currentBookPage?.assets?.length || 0;
    if (totalAssets === 1) return 'book-single-hero';
    if (this.hasTag(asset, this.TAG_SUPER_ENCANTA)) return 'book-size-large';
    const pattern = index % 4;
    if (pattern === 0) return 'book-size-large';
    if (pattern === 1) return 'book-size-medium';
    if (pattern === 2) return 'book-size-compact';
    return 'book-size-medium';
  }

  getPolaroidRotation(index: number): string {
    const angles = [-2.2, 1.8, -1.2, 2.5, -1.8, 1.2, -2.8, 2.0];
    return `rotate(${angles[index % angles.length]}deg)`;
  }

  get effectivePublicUrl(): string {
    return this.publicAccessUrl || window.location.href;
  }

  get effectiveQrUrl(): string {
    if (this.qrCodeUrl) return this.qrCodeUrl;
    const url = this.effectivePublicUrl;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  }

  // --- MODAL DE HISTORIAS ---
  openStoryModal(asset?: AlbumAssetModel, pageTitle?: string): void {
    this.storyAsset = asset || (this.currentBookPage?.assets[0]);
    this.storyPageTitle = pageTitle || this.currentBookPage?.title || 'Recuerdos del Evento';
    this.storyModalOpen = true;
  }

  closeStoryModal(): void {
    this.storyModalOpen = false;
    this.storyAsset = undefined;
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

    const albumUrl = this.effectivePublicUrl;
    const title = `${this.eventTitle} - Fotografía`;

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
        this.showSuccess('¡Fotografía compartida con éxito!');
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }

    await this.copyPhotoBlobToClipboard(asset.url, albumUrl);
  }

  async downloadPhotoAsset(asset?: AlbumAssetModel, e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    const targetAsset = asset || this.storyAsset || this.currentBookPage?.assets?.[0];
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

  sharePublicAlbumUrl(e?: Event): void {
    if (e) e.stopPropagation();
    const albumUrl = this.effectivePublicUrl;
    const title = `${this.eventTitle} - Galería de Fotos del Evento`;
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
    const albumUrl = this.effectivePublicUrl;
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
        this.showSuccess('¡Imagen copiada al portapapeles! Ya puedes pegarla (Ctrl+V).');
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

  // --- EXPORTAR HOJA DEL LIBRO A IMAGEN PNG COMPLETA ---
  async downloadBookPageImage(elementId: string = 'widgetBookPageToExport'): Promise<void> {
    const element = document.getElementById(elementId) || (document.querySelector('.book-page-container') as HTMLElement);
    if (!element) {
      this.showError('No se encontró la hoja del libro para exportar.');
      return;
    }

    this.isExportingBookPage = true;
    this.showSuccess(`Generando imagen completa de la hoja "${this.currentBookPage.title}"...`);

    const originalMaxHeight = element.style.maxHeight;
    const originalOverflowY = element.style.overflowY;
    const originalHeight = element.style.height;

    try {
      element.style.maxHeight = 'none';
      element.style.overflowY = 'visible';
      element.style.height = 'auto';

      const fullScrollHeight = element.scrollHeight;
      const fullScrollWidth = element.scrollWidth;

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        height: fullScrollHeight,
        width: fullScrollWidth,
        windowHeight: fullScrollHeight,
        windowWidth: fullScrollWidth,
        scrollY: 0,
        scrollX: 0
      });

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const cleanTitle = (this.currentBookPage.title || 'hoja-libro').toLowerCase().replace(/\s+/g, '-');
      a.download = `libro-recuerdos-${cleanTitle}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      this.showSuccess(`¡Hoja "${this.currentBookPage.title}" descargada completa!`);
    } catch (err) {
      console.error('Error al exportar la hoja del libro:', err);
      this.showError('No se pudo generar la imagen completa de la hoja del libro.');
    } finally {
      element.style.maxHeight = originalMaxHeight;
      element.style.overflowY = originalOverflowY;
      element.style.height = originalHeight;
      this.isExportingBookPage = false;
    }
  }

  // --- PRESENTACIÓN SLIDESHOW PANTALLA COMPLETA ---
  get fullscreenAssets(): AlbumAssetModel[] {
    let list = this.availableAssets;
    if (this.fullscreenFilter !== 'all') {
      list = list.filter(a => Array.isArray(a.tags) && a.tags.includes(this.fullscreenFilter));
    }
    return list.length > 0 ? list : this.availableAssets;
  }

  get currentFullscreenAsset(): AlbumAssetModel | undefined {
    const list = this.fullscreenAssets;
    if (this.fullscreenIndex >= list.length) {
      this.fullscreenIndex = 0;
    }
    return list[this.fullscreenIndex];
  }

  openFullscreenBook(index = 0): void {
    this.fullscreenIndex = index;
    this.fullscreenBookOpen = true;
    this.startSlideshow();

    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen && !document.fullscreenElement) {
        elem.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  }

  closeFullscreenBook(): void {
    this.fullscreenBookOpen = false;
    this.pauseSlideshow();

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  }

  toggleSlideshow(): void {
    if (this.isPlayingSlideshow) {
      this.pauseSlideshow();
    } else {
      this.startSlideshow();
    }
  }

  startSlideshow(): void {
    this.isPlayingSlideshow = true;
    this.clearSlideshowInterval();
    this.slideshowInterval = setInterval(() => {
      this.nextFullscreenSlide();
    }, this.slideshowSpeed);
  }

  pauseSlideshow(): void {
    this.isPlayingSlideshow = false;
    this.clearSlideshowInterval();
  }

  private clearSlideshowInterval(): void {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
      this.slideshowInterval = undefined;
    }
  }

  nextFullscreenSlide(): void {
    const list = this.fullscreenAssets;
    if (list.length === 0) return;
    this.fullscreenIndex = (this.fullscreenIndex + 1) % list.length;
  }

  prevFullscreenSlide(): void {
    const list = this.fullscreenAssets;
    if (list.length === 0) return;
    this.fullscreenIndex = (this.fullscreenIndex - 1 + list.length) % list.length;
  }

  setFullscreenFilter(filter: string): void {
    this.fullscreenFilter = filter;
    this.fullscreenIndex = 0;
  }

  // --- HOJA COMPLETA EN PANTALLA COMPLETA ---
  openFullscreenBookPage(): void {
    this.fullscreenBookPageOpen = true;
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen && !document.fullscreenElement) {
        elem.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  }

  closeFullscreenBookPage(): void {
    this.fullscreenBookPageOpen = false;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (this.fullscreenBookPageOpen) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prevBookPage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.nextBookPage();
      } else if (event.key === 'Escape') {
        this.closeFullscreenBookPage();
      }
      return;
    }

    if (this.fullscreenBookOpen) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prevFullscreenSlide();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.nextFullscreenSlide();
      } else if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        this.toggleSlideshow();
      } else if (event.key === 'Escape') {
        this.closeFullscreenBook();
      }
      return;
    }

    if (this.storyModalOpen && event.key === 'Escape') {
      this.closeStoryModal();
    }
  }
}
