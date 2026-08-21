import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AlbumAssetModel, EventAccessSession } from '../../../core/models';

@Component({
  selector: 'app-access-album-gallery-view',
  templateUrl: './access-album-gallery-view.component.html'
})
export class AccessAlbumGalleryViewComponent implements OnInit, OnDestroy {
  @Input() session!: EventAccessSession;

  viewMode: 'carousel' | 'grid' | 'list' = 'carousel';
  searchQuery = '';
  carouselIndex = 0;
  isPlaying = false;
  isFullscreenPresentation = false;
  showPresentationControls = true;
  private controlsTimer?: ReturnType<typeof setTimeout>;
  private timer?: ReturnType<typeof setInterval>;
  autoplayIntervalMs = 4000;

  selectedAsset?: AlbumAssetModel;
  lightboxIndex = 0;

  selectedTagFilter: string = 'all';
  readonly TAG_SUPER_ENCANTA = 'Me super encanta';
  readonly TAG_ME_ENCANTA = 'Me encanta';

  ngOnInit(): void {
    if (this.approvedAssets.length > 0) {
      this.carouselIndex = 0;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    if (this.controlsTimer) clearTimeout(this.controlsTimer);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.isFullscreenPresentation) {
      if (event.key === 'Escape') {
        this.exitFullscreenPresentation();
      } else if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        this.toggleAutoplay();
      } else if (event.key === 'ArrowRight') {
        this.nextSlide();
        this.onPresentationMouseMove();
      } else if (event.key === 'ArrowLeft') {
        this.prevSlide();
        this.onPresentationMouseMove();
      }
    } else if (this.selectedAsset) {
      if (event.key === 'Escape') {
        this.closeLightbox();
      } else if (event.key === 'ArrowRight') {
        this.nextLightbox();
      } else if (event.key === 'ArrowLeft') {
        this.prevLightbox();
      }
    }
  }

  get allApprovedAssets(): AlbumAssetModel[] {
    return (this.session?.albumAssets || []).filter(a => a.status === 'approved');
  }

  get availableTags(): string[] {
    const tagSet = new Set<string>();
    for (const asset of this.allApprovedAssets) {
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
    return this.allApprovedAssets.filter(a => Array.isArray(a.tags) && a.tags.includes(tag)).length;
  }

  setTagFilter(tag: string): void {
    this.selectedTagFilter = tag;
    this.carouselIndex = 0;
  }

  get approvedAssets(): AlbumAssetModel[] {
    const list = this.allApprovedAssets;
    const query = this.searchQuery.toLowerCase().trim();

    return list.filter(asset => {
      if (this.selectedTagFilter !== 'all') {
        if (!Array.isArray(asset.tags) || !asset.tags.includes(this.selectedTagFilter)) {
          return false;
        }
      }
      if (query) {
        const nameMatch = (asset.uploaderName || '').toLowerCase().includes(query);
        const emailMatch = (asset.uploaderEmail || '').toLowerCase().includes(query);
        const tagMatch = Array.isArray(asset.tags) && asset.tags.some(t => t.toLowerCase().includes(query));
        return nameMatch || emailMatch || tagMatch;
      }
      return true;
    });
  }

  get totalApprovedCount(): number {
    return this.allApprovedAssets.length;
  }

  get safeCarouselIndex(): number {
    const list = this.approvedAssets;
    if (list.length === 0) return 0;
    if (this.carouselIndex < 0) return 0;
    if (this.carouselIndex >= list.length) return 0;
    return this.carouselIndex;
  }

  get currentCarouselAsset(): AlbumAssetModel | undefined {
    const list = this.approvedAssets;
    if (list.length === 0) return undefined;
    return list[this.safeCarouselIndex];
  }

  setViewMode(mode: 'carousel' | 'grid' | 'list'): void {
    this.viewMode = mode;
    if (mode !== 'carousel') {
      this.stopAutoplay();
    } else {
      this.scrollToActiveThumb();
    }
  }

  // Carousel Controls
  nextSlide(): void {
    const list = this.approvedAssets;
    if (list.length === 0) return;
    this.carouselIndex = (this.safeCarouselIndex + 1) % list.length;
    this.scrollToActiveThumb();
  }

  prevSlide(): void {
    const list = this.approvedAssets;
    if (list.length === 0) return;
    this.carouselIndex = (this.safeCarouselIndex - 1 + list.length) % list.length;
    this.scrollToActiveThumb();
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.approvedAssets.length) {
      this.carouselIndex = index;
      this.scrollToActiveThumb();
    }
  }

  // Fullscreen Presentation Mode
  startFullscreenPresentation(): void {
    if (this.approvedAssets.length === 0) return;
    this.isFullscreenPresentation = true;
    this.showPresentationControls = true;
    this.startAutoplay();
    this.resetControlsTimeout();

    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (_) {}
  }

  exitFullscreenPresentation(): void {
    this.isFullscreenPresentation = false;
    this.stopAutoplay();
    if (this.controlsTimer) clearTimeout(this.controlsTimer);

    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (_) {}
  }

  onPresentationMouseMove(): void {
    this.showPresentationControls = true;
    this.resetControlsTimeout();
  }

  private resetControlsTimeout(): void {
    if (this.controlsTimer) clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => {
      if (this.isFullscreenPresentation && this.isPlaying) {
        this.showPresentationControls = false;
      }
    }, 2800);
  }

  toggleAutoplay(): void {
    if (this.isPlaying) {
      this.stopAutoplay();
      this.showPresentationControls = true;
    } else {
      this.startAutoplay();
      this.resetControlsTimeout();
    }
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.isPlaying = true;
    this.timer = setInterval(() => {
      this.nextSlide();
    }, this.autoplayIntervalMs);
  }

  stopAutoplay(): void {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  scrollToActiveThumb(): void {
    setTimeout(() => {
      const el = document.getElementById('nw-thumb-' + this.safeCarouselIndex);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 60);
  }

  // Lightbox Modal
  openLightbox(asset?: AlbumAssetModel): void {
    if (!asset) return;
    this.stopAutoplay();
    this.selectedAsset = asset;
    const index = this.approvedAssets.findIndex(a => (a._id || a.id) === (asset._id || asset.id));
    this.lightboxIndex = index >= 0 ? index : 0;
  }

  closeLightbox(): void {
    this.selectedAsset = undefined;
  }

  nextLightbox(): void {
    const list = this.approvedAssets;
    if (list.length === 0) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % list.length;
    this.selectedAsset = list[this.lightboxIndex];
  }

  prevLightbox(): void {
    const list = this.approvedAssets;
    if (list.length === 0) return;
    this.lightboxIndex = (this.lightboxIndex - 1 + list.length) % list.length;
    this.selectedAsset = list[this.lightboxIndex];
  }

  downloadPhoto(asset?: AlbumAssetModel, event?: Event): void {
    if (event) event.stopPropagation();
    if (!asset || !asset.url) return;
    window.open(asset.url, '_blank');
  }
}
