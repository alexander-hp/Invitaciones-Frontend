import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
  private timer?: ReturnType<typeof setInterval>;

  selectedAsset?: AlbumAssetModel;
  lightboxIndex = 0;

  ngOnInit(): void {
    if (this.approvedAssets.length > 0) {
      this.carouselIndex = 0;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  get approvedAssets(): AlbumAssetModel[] {
    const list = this.session?.albumAssets || [];
    const query = this.searchQuery.toLowerCase().trim();

    return list.filter(asset => {
      if (asset.status !== 'approved') return false;
      if (query) {
        const nameMatch = (asset.uploaderName || '').toLowerCase().includes(query);
        const emailMatch = (asset.uploaderEmail || '').toLowerCase().includes(query);
        return nameMatch || emailMatch;
      }
      return true;
    });
  }

  get totalApprovedCount(): number {
    return (this.session?.albumAssets || []).filter(a => a.status === 'approved').length;
  }

  setViewMode(mode: 'carousel' | 'grid' | 'list'): void {
    this.viewMode = mode;
    if (mode !== 'carousel') {
      this.stopAutoplay();
    }
  }

  // Carousel Controls
  nextSlide(): void {
    const list = this.approvedAssets;
    if (list.length === 0) return;
    this.carouselIndex = (this.carouselIndex + 1) % list.length;
  }

  prevSlide(): void {
    const list = this.approvedAssets;
    if (list.length === 0) return;
    this.carouselIndex = (this.carouselIndex - 1 + list.length) % list.length;
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.approvedAssets.length) {
      this.carouselIndex = index;
    }
  }

  toggleAutoplay(): void {
    if (this.isPlaying) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
  }

  startAutoplay(): void {
    this.isPlaying = true;
    this.stopAutoplay();
    this.timer = setInterval(() => {
      this.nextSlide();
    }, 4500);
  }

  stopAutoplay(): void {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  // Lightbox Modal
  openLightbox(asset: AlbumAssetModel): void {
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

  downloadPhoto(asset: AlbumAssetModel, event?: Event): void {
    if (event) event.stopPropagation();
    if (!asset.url) return;
    window.open(asset.url, '_blank');
  }
}
