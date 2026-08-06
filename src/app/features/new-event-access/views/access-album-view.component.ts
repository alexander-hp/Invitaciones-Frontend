import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AlbumAssetModel, EventAccessSession } from '../../../core/models';

@Component({
  selector: 'app-access-album-view',
  templateUrl: './access-album-view.component.html'
})
export class AccessAlbumViewComponent {
  @Input() session!: EventAccessSession;
  @Output() updateAlbumEvent = new EventEmitter<{ asset: AlbumAssetModel; status: AlbumAssetModel['status'] }>();

  updateAlbumStatus(asset: AlbumAssetModel, status: AlbumAssetModel['status']): void {
    this.updateAlbumEvent.emit({ asset, status });
  }
}
