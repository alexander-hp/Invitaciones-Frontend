import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AlbumAssetModel, EventAccessSession } from '../../../core/models';

@Component({
  selector: 'app-access-photographer-view',
  templateUrl: './access-photographer-view.component.html'
})
export class AccessPhotographerViewComponent implements OnInit {
  @Input() session!: EventAccessSession;
  @Input() uploading = false;
  @Output() uploadBatchEvent = new EventEmitter<{ files: File[]; uploaderName?: string; uploaderEmail?: string }>();

  uploaderName = '';
  uploaderEmail = '';
  selectedFiles: File[] = [];
  filePreviews: Array<{ file: File; url: string; size: string; name: string }> = [];
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  searchQuery = '';
  isDragging = false;
  selectedAsset?: AlbumAssetModel;

  ngOnInit(): void {
    try {
      this.uploaderName = localStorage.getItem('nw_photographer_name') || '';
      this.uploaderEmail = localStorage.getItem('nw_photographer_email') || '';
      if (this.uploaderName === 'Fotógrafo Oficial') {
        this.uploaderName = '';
      }
    } catch {
      this.uploaderName = '';
      this.uploaderEmail = '';
    }
  }

  savePhotographerInfo(): void {
    try {
      if (this.uploaderName) localStorage.setItem('nw_photographer_name', this.uploaderName.trim());
      if (this.uploaderEmail) localStorage.setItem('nw_photographer_email', this.uploaderEmail.trim());
    } catch { }
  }

  get isAuthorInfoValid(): boolean {
    const name = this.uploaderName.trim();
    const contact = this.uploaderEmail.trim();

    if (!name) return false;
    if (!contact) return false;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const simplePhonePattern = /^[+0-9\s-]{7,15}$/;

    return emailPattern.test(contact) || simplePhonePattern.test(contact);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  private processFiles(files: File[]): void {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    const validFiles = files.filter(f => validImageTypes.includes(f.type) || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name));

    for (const file of validFiles) {
      if (!this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.filePreviews.push({
            file,
            url: (e.target?.result as string) || '',
            size: this.formatBytes(file.size),
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removePreview(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.filePreviews.splice(index, 1);
  }

  clearSelected(): void {
    this.selectedFiles = [];
    this.filePreviews = [];
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  uploadAll(): void {
    if (this.selectedFiles.length === 0 || this.uploading || !this.isAuthorInfoValid) return;
    this.savePhotographerInfo();

    this.uploadBatchEvent.emit({
      files: [...this.selectedFiles],
      uploaderName: this.uploaderName.trim(),
      uploaderEmail: this.uploaderEmail.trim()
    });

    this.clearSelected();
  }

  get myAssets(): AlbumAssetModel[] {
    const all = this.session?.albumAssets || [];
    const currentName = this.uploaderName.trim().toLowerCase();
    const currentEmail = this.uploaderEmail.trim().toLowerCase();

    if (!currentName && !currentEmail) {
      return [];
    }

    const filteredByAuthor = all.filter(asset => {
      const assetName = (asset.uploaderName || '').trim().toLowerCase();
      const assetEmail = (asset.uploaderEmail || '').trim().toLowerCase();

      const matchesName = currentName && assetName === currentName;
      const matchesEmail = currentEmail && assetEmail === currentEmail;
      return matchesName || matchesEmail;
    });

    const query = this.searchQuery.toLowerCase().trim();
    return filteredByAuthor.filter(asset => {
      if (this.filterStatus !== 'all' && asset.status !== this.filterStatus) {
        return false;
      }
      if (query) {
        const nameMatch = (asset.uploaderName || '').toLowerCase().includes(query);
        const emailMatch = (asset.uploaderEmail || '').toLowerCase().includes(query);
        return nameMatch || emailMatch;
      }
      return true;
    });
  }

  get totalCount(): number {
    return this.myAssets.length;
  }

  get pendingCount(): number {
    return this.myAssets.filter(a => a.status === 'pending').length;
  }

  get approvedCount(): number {
    return this.myAssets.filter(a => a.status === 'approved').length;
  }

  get rejectedCount(): number {
    return this.myAssets.filter(a => a.status === 'rejected').length;
  }

  openPreview(asset: AlbumAssetModel): void {
    this.selectedAsset = asset;
  }

  closePreview(): void {
    this.selectedAsset = undefined;
  }
}
