import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel, AssetFolder } from '../../../../core/models';

@Component({
  selector: 'app-editor-assets-tab',
  templateUrl: './editor-assets-tab.component.html'
})
export class EditorAssetsTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() activeTab = 'all';
  @Input() assetUploading = false;
  @Input() musicError = false;
  @Input() sectionMusicOptions: Array<{ key: string; label: string }> = [
    { key: 'story', label: '📖 Nuestra Historia' },
    { key: 'locations', label: '📍 Ubicaciones & Cómo Llegar' },
    { key: 'itinerary', label: '📅 Itinerario del Evento' },
    { key: 'dressCode', label: '👔 Código de Vestimenta (Dress Code)' },
    { key: 'rsvp', label: '💌 Confirmación de Asistencia (RSVP)' },
    { key: 'giftRegistry', label: '🎁 Mesa de Regalos' },
    { key: 'digitalEnvelope', label: '✉️ Sobre Digital & Transferencias' },
    { key: 'lodging', label: '🏨 Hospedaje Recomendado' },
    { key: 'gallery', label: '🖼️ Galería de Fotos' },
    { key: 'guestAlbum', label: '📸 Álbum Colectivo de Invitados' },
    { key: 'dedications', label: '💬 Muro de Dedicatorias & Libros de Deseos' },
    { key: 'songRequests', label: '🎵 Música & Peticiones al DJ' }
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

  activeUrlInputKey: string | null = null;
  tempInputUrl: string = '';

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'gallery') return settings.gallery !== false;
    return settings[key] !== false;
  }

  openUrlInput(target: string): void {
    this.activeUrlInputKey = target;
    if (target === 'global') {
      this.tempInputUrl = this.invitation.content.musicUrl || '';
    } else {
      this.tempInputUrl = this.invitation.content.sectionMusic?.[target] || '';
    }
  }

  saveUrlInput(): void {
    const val = this.tempInputUrl.trim();
    if (this.activeUrlInputKey === 'global') {
      this.invitation.content.musicUrl = val || undefined;
    } else if (this.activeUrlInputKey) {
      this.setSectionMusicUrl(this.activeUrlInputKey, val);
    }
    this.activeUrlInputKey = null;
    this.tempInputUrl = '';
  }

  cancelUrlInput(): void {
    this.activeUrlInputKey = null;
    this.tempInputUrl = '';
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

  isYouTubeUrl(url?: string): boolean {
    return Boolean(this.getYouTubeVideoId(url));
  }

  getYouTubeVideoId(url?: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  }

  getCleanSongName(url?: string): string {
    if (!url) return '';
    const ytId = this.getYouTubeVideoId(url);
    if (ytId) {
      return `YouTube: https://youtu.be/${ytId}`;
    }
    try {
      const clean = url.split('?')[0].split('#')[0];
      const parts = clean.split('/');
      let rawName = decodeURIComponent(parts[parts.length - 1] || '');
      rawName = rawName.replace(/^\d+[-_]/, '');
      rawName = rawName.replace(/---+/g, ' - ').replace(/--/g, ' ').replace(/-/g, ' ');
      rawName = rawName.replace(/\s+/g, ' ').trim();
      return rawName || url;
    } catch {
      return url;
    }
  }
}
