import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { AlbumAssetModel } from '../../../../core/models';

@Component({
  selector: 'app-event-album-tab',
  templateUrl: './event-album-tab.component.html'
})
export class EventAlbumTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;

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

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.eventId) {
      this.loadAlbum();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadAlbum();
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
    this.loadingAlbum = true;
    this.apiService.listAlbum(this.eventId).subscribe({
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
