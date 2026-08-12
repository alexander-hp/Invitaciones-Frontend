import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { AlbumAssetModel, EventAccessSession } from '../../../core/models';

@Component({
  selector: 'app-access-album-view',
  templateUrl: './access-album-view.component.html'
})
export class AccessAlbumViewComponent implements OnInit, OnChanges {
  @Input() session!: EventAccessSession;
  @Output() updateAlbumEvent = new EventEmitter<{ asset: AlbumAssetModel; status: AlbumAssetModel['status'] }>();
  @Output() bulkUpdateAlbumEvent = new EventEmitter<{ assets: AlbumAssetModel[]; status: AlbumAssetModel['status'] }>();

  private _filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  get filterStatus(): 'all' | 'pending' | 'approved' | 'rejected' {
    return this._filterStatus;
  }
  set filterStatus(val: 'all' | 'pending' | 'approved' | 'rejected') {
    this._filterStatus = val;
    this.currentPage = 1;
  }

  private _searchQuery = '';
  get searchQuery(): string {
    return this._searchQuery;
  }
  set searchQuery(val: string) {
    this._searchQuery = val;
    this.currentPage = 1;
  }
  nameFilter = '';
  nameSearch = '';
  showNameDropdown = false;

  emailFilter = '';
  emailSearch = '';
  showEmailDropdown = false;

  selectName(name: string): void {
    this.nameFilter = name;
    this.showNameDropdown = false;
    this.currentPage = 1;
  }

  selectEmail(email: string): void {
    this.emailFilter = email;
    this.showEmailDropdown = false;
    this.currentPage = 1;
  }

  currentPage = 1;
  pageSize = 12;

  selectedAssetIds: Set<string> = new Set();
  selectedAsset?: AlbumAssetModel;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['session']) {
      this.currentPage = 1;
    }
  }

  get filteredAssets(): AlbumAssetModel[] {
    const list = this.session?.albumAssets || [];
    const query = this.searchQuery.toLowerCase().trim();

    return list.filter(asset => {
      // Filter by status
      if (this.filterStatus !== 'all' && asset.status !== this.filterStatus) {
        return false;
      }

      // Filter by uploader name
      if (this.nameFilter) {
        if ((asset.uploaderName || '').toLowerCase() !== this.nameFilter.toLowerCase()) {
          return false;
        }
      }

      // Filter by uploader email
      if (this.emailFilter) {
        if ((asset.uploaderEmail || '').toLowerCase() !== this.emailFilter.toLowerCase()) {
          return false;
        }
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

  get totalPages(): number {
    return Math.ceil(this.filteredAssets.length / this.pageSize) || 1;
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredAssets.length);
  }

  get paginatedAssets(): AlbumAssetModel[] {
    return this.filteredAssets.slice(this.startIndex, this.endIndex);
  }

  get uniqueNames(): string[] {
    const list = this.session?.albumAssets || [];
    const names = new Set<string>();
    list.forEach(a => {
      if (a.uploaderName) names.add(a.uploaderName.trim());
    });
    return Array.from(names).filter(Boolean).sort();
  }

  get uniqueEmails(): string[] {
    const list = this.session?.albumAssets || [];
    const emails = new Set<string>();
    list.forEach(a => {
      if (a.uploaderEmail && a.uploaderEmail.includes('@')) {
        emails.add(a.uploaderEmail.trim());
      }
    });
    return Array.from(emails).filter(Boolean).sort();
  }

  get filteredUniqueNames(): string[] {
    const query = this.nameSearch.toLowerCase().trim();
    const list = this.uniqueNames;
    if (!query) return list;
    return list.filter(n => n.toLowerCase().includes(query));
  }

  get filteredUniqueEmails(): string[] {
    const query = this.emailSearch.toLowerCase().trim();
    const list = this.uniqueEmails;
    if (!query) return list;
    return list.filter(e => e.toLowerCase().includes(query));
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
    this.nameFilter = '';
    this.nameSearch = '';
    this.showNameDropdown = false;
    this.emailFilter = '';
    this.emailSearch = '';
    this.showEmailDropdown = false;
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
