import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AlbumAssetModel, EventAccessSession } from '../../../core/models';

@Component({
  selector: 'app-access-album-view',
  templateUrl: './access-album-view.component.html'
})
export class AccessAlbumViewComponent implements OnInit {
  @Input() session!: EventAccessSession;
  @Output() updateAlbumEvent = new EventEmitter<{ asset: AlbumAssetModel; status: AlbumAssetModel['status'] }>();
  @Output() bulkUpdateAlbumEvent = new EventEmitter<{ assets: AlbumAssetModel[]; status: AlbumAssetModel['status'] }>();

  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  searchQuery = '';
  uploaderFilter = '';
  roleFilter: 'all' | 'photographer' | 'guest' = 'all';

  selectedAssetIds: Set<string> = new Set();
  selectedAsset?: AlbumAssetModel;

  ngOnInit(): void {}

  get filteredAssets(): AlbumAssetModel[] {
    const list = this.session?.albumAssets || [];
    const query = this.searchQuery.toLowerCase().trim();

    return list.filter(asset => {
      // Filter by status
      if (this.filterStatus !== 'all' && asset.status !== this.filterStatus) {
        return false;
      }

      // Filter by uploader
      if (this.uploaderFilter) {
        const uploader = (asset.uploaderName || asset.uploaderEmail || '').toLowerCase();
        if (uploader !== this.uploaderFilter.toLowerCase()) return false;
      }

      // Filter by inferred role
      if (this.roleFilter !== 'all') {
        const name = (asset.uploaderName || '').toLowerCase();
        const isPhoto = name.includes('foto') || name.includes('estudio') || name.includes('camara') || name.includes('pro');
        if (this.roleFilter === 'photographer' && !isPhoto) return false;
        if (this.roleFilter === 'guest' && isPhoto) return false;
      }

      // Filter by search query
      if (query) {
        const nameMatch = (asset.uploaderName || '').toLowerCase().includes(query);
        const emailMatch = (asset.uploaderEmail || '').toLowerCase().includes(query);
        return nameMatch || emailMatch;
      }

      return true;
    });
  }

  get uniqueUploaders(): string[] {
    const list = this.session?.albumAssets || [];
    const names = new Set<string>();
    list.forEach(a => {
      if (a.uploaderName) names.add(a.uploaderName.trim());
      else if (a.uploaderEmail) names.add(a.uploaderEmail.trim());
    });
    return Array.from(names).filter(Boolean).sort();
  }

  get totalCount(): number {
    return (this.session?.albumAssets || []).length;
  }

  get pendingCount(): number {
    return (this.session?.albumAssets || []).filter(a => a.status === 'pending').length;
  }

  get approvedCount(): number {
    return (this.session?.albumAssets || []).filter(a => a.status === 'approved').length;
  }

  get rejectedCount(): number {
    return (this.session?.albumAssets || []).filter(a => a.status === 'rejected').length;
  }

  getAssetId(asset: AlbumAssetModel): string {
    return asset._id || asset.id || '';
  }

  // Single asset update
  updateStatus(asset: AlbumAssetModel, status: AlbumAssetModel['status'], event?: Event): void {
    if (event) event.stopPropagation();
    this.updateAlbumEvent.emit({ asset, status });
  }

  // Multi-select helpers
  isSelected(asset: AlbumAssetModel): boolean {
    const id = this.getAssetId(asset);
    return id ? this.selectedAssetIds.has(id) : false;
  }

  toggleSelect(asset: AlbumAssetModel, event?: Event): void {
    if (event) event.stopPropagation();
    const id = this.getAssetId(asset);
    if (!id) return;

    if (this.selectedAssetIds.has(id)) {
      this.selectedAssetIds.delete(id);
    } else {
      this.selectedAssetIds.add(id);
    }
  }

  isAllSelected(): boolean {
    const current = this.filteredAssets;
    if (current.length === 0) return false;
    return current.every(a => this.selectedAssetIds.has(this.getAssetId(a)));
  }

  toggleSelectAll(): void {
    const current = this.filteredAssets;
    if (this.isAllSelected()) {
      current.forEach(a => this.selectedAssetIds.delete(this.getAssetId(a)));
    } else {
      current.forEach(a => this.selectedAssetIds.add(this.getAssetId(a)));
    }
  }

  clearSelection(): void {
    this.selectedAssetIds.clear();
  }

  getSelectedAssets(): AlbumAssetModel[] {
    const list = this.session?.albumAssets || [];
    return list.filter(a => this.selectedAssetIds.has(this.getAssetId(a)));
  }

  // Bulk actions
  approveSelected(): void {
    const selected = this.getSelectedAssets();
    if (selected.length === 0) return;
    this.bulkUpdateAlbumEvent.emit({ assets: selected, status: 'approved' });
    this.clearSelection();
  }

  rejectSelected(): void {
    const selected = this.getSelectedAssets();
    if (selected.length === 0) return;
    this.bulkUpdateAlbumEvent.emit({ assets: selected, status: 'rejected' });
    this.clearSelection();
  }

  approveAllPending(): void {
    const pending = (this.session?.albumAssets || []).filter(a => a.status === 'pending');
    if (pending.length === 0) return;
    this.bulkUpdateAlbumEvent.emit({ assets: pending, status: 'approved' });
    this.clearSelection();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.uploaderFilter = '';
    this.roleFilter = 'all';
    this.filterStatus = 'all';
  }

  // Lightbox preview
  openLightbox(asset: AlbumAssetModel): void {
    this.selectedAsset = asset;
  }

  closeLightbox(): void {
    this.selectedAsset = undefined;
  }

  navigateLightbox(direction: -1 | 1): void {
    if (!this.selectedAsset) return;
    const currentList = this.filteredAssets;
    const currentId = this.getAssetId(this.selectedAsset);
    const currentIndex = currentList.findIndex(a => this.getAssetId(a) === currentId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = currentList.length - 1;
    if (nextIndex >= currentList.length) nextIndex = 0;

    this.selectedAsset = currentList[nextIndex];
  }
}
