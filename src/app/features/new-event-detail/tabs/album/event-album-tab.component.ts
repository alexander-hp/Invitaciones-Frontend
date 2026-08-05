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

  albumQrUrl = '';
  albumPublicUrl = '';

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

  loadAlbum(): void {
    this.loadingAlbum = true;
    this.apiService.listAlbum(this.eventId).subscribe({
      next: res => {
        this.albumAssets = res.assets || [];
        this.loadingAlbum = false;
        this.generateQrUrl();
      },
      error: err => {
        this.albumError = err?.error?.message || 'Error al cargar fotos del álbum';
        this.loadingAlbum = false;
      }
    });
  }

  get pendingAlbumAssets(): number {
    return this.albumAssets.filter(a => a.status === 'pending').length;
  }

  generateQrUrl(): void {
    this.albumPublicUrl = `${window.location.origin}/new/e/${this.eventId}`;
    this.albumQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.albumPublicUrl)}`;
  }

  updateAlbumAsset(asset: AlbumAssetModel, status: 'approved' | 'rejected'): void {
    const aId = (asset._id || asset.id)!;
    this.apiService.updateAlbumAsset(this.eventId, aId, status).subscribe({
      next: res => {
        asset.status = res.asset.status;
        this.albumMessage = `Foto marcada como ${status === 'approved' ? 'aprobada ✅' : 'rechazada ❌'}`;
      },
      error: err => {
        this.albumError = err?.error?.message || 'Error al actualizar estado de la foto';
      }
    });
  }
}
