import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel, AssetFolder } from '../../../../core/models';

@Component({
  selector: 'app-editor-assets-tab',
  templateUrl: './editor-assets-tab.component.html'
})
export class EditorAssetsTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() assetUploading = false;
  @Input() musicError = false;
  @Input() sectionMusicOptions: Array<{ key: string; label: string }> = [
    { key: 'hero', label: 'Portada / Bienvenida (Hero)' },
    { key: 'itinerary', label: 'Itinerario de eventos' },
    { key: 'locations', label: 'Ubicaciones y mapa' },
    { key: 'gifts', label: 'Mesa de regalos' },
    { key: 'gallery', label: 'Galería de fotos' }
  ];

  @Output() selectAsset = new EventEmitter<{ event: Event; folder: AssetFolder }>();
  @Output() removeCover = new EventEmitter<void>();
  @Output() removeMusic = new EventEmitter<void>();
  @Output() removeGalleryImage = new EventEmitter<number>();
  @Output() uploadSectionMusic = new EventEmitter<{ event: Event; sectionKey: string }>();
  @Output() removeSectionMusic = new EventEmitter<string>();
  @Output() musicPlaybackError = new EventEmitter<void>();
  @Output() addLodgingItem = new EventEmitter<void>();
  @Output() removeLodgingItem = new EventEmitter<number>();
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'gallery') return settings.gallery !== false;
    return settings[key] !== false;
  }

  setSectionMusicUrl(sectionKey: string, url: string): void {
    if (!this.invitation.content.sectionMusic) {
      this.invitation.content.sectionMusic = {};
    }
    if (url) {
      this.invitation.content.sectionMusic[sectionKey] = url;
    } else {
      delete this.invitation.content.sectionMusic[sectionKey];
    }
  }
}
