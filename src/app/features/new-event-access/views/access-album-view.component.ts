import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AlbumAssetModel, EventAccessSession } from '../../../core/models';

@Component({
  selector: 'app-access-album-view',
  templateUrl: './access-album-view.component.html'
})
export class AccessAlbumViewComponent {
  @Input() session!: EventAccessSession;
  @Input() uploadAllowed = false;
  @Input() uploading = false;
  @Output() updateAlbumEvent = new EventEmitter<{ asset: AlbumAssetModel; status: AlbumAssetModel['status'] }>();
  @Output() uploadAlbumEvent = new EventEmitter<{ file: File; uploaderName?: string; uploaderEmail?: string; status?: 'pending' | 'approved' }>();

  uploadForm = {
    uploaderName: '',
    uploaderEmail: '',
    status: 'pending' as 'pending' | 'approved'
  };
  selectedFile?: File;

  updateAlbumStatus(asset: AlbumAssetModel, status: AlbumAssetModel['status']): void {
    this.updateAlbumEvent.emit({ asset, status });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || undefined;
  }

  uploadAlbum(): void {
    if (!this.selectedFile || this.uploading) return;
    this.uploadAlbumEvent.emit({
      file: this.selectedFile,
      uploaderName: this.uploadForm.uploaderName || undefined,
      uploaderEmail: this.uploadForm.uploaderEmail || undefined,
      status: this.uploadForm.status
    });
    this.selectedFile = undefined;
  }
}
