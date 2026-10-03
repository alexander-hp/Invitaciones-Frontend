import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { InvitationModel, AssetFolder, MusicCueSettings, MusicPlaybackSettings, PlaceSearchResult } from '../../../../core/models';

@Component({
  selector: 'app-editor-assets-tab',
  templateUrl: './editor-assets-tab.component.html'
})
export class EditorAssetsTabComponent implements OnChanges {
  @Input() invitation!: InvitationModel;
  @Input() activeTab = 'all';
  @Input() assetUploading = false;
  @Input() musicError = false;
  @Input() lodgingSearchResults: Record<number, PlaceSearchResult[]> = {};
  @Input() lodgingSearchLoading: Record<number, boolean> = {};
  @Input() lodgingExtractLoading: Record<number, boolean> = {};
  @Input() sectionMusicOptions: Array<{ key: string; label: string }> = [
    { key: 'story', label: '📖 Nuestra Historia' },
    { key: 'locations', label: '📍 Ubicaciones & Cómo Llegar' },
    { key: 'itinerary', label: '📅 Itinerario del Evento' },
    { key: 'dressCode', label: '👔 Código de Vestimenta (Dress Code)' },
    { key: 'rsvp', label: '💌 Respuesta a tu Evento / Confirmación' },
    { key: 'giftRegistry', label: '🎁 Mesa de Regalos' },
    { key: 'digitalEnvelope', label: '✉️ Sobre Digital & Transferencias' },
    { key: 'lodging', label: '🏨 Hospedaje Recomendado' },
    { key: 'gallery', label: '🖼️ Galería de Fotos' },
    { key: 'guestAlbum', label: '📸 Álbum Colectivo de Invitados' },
    { key: 'dedications', label: '💬 Muro de Dedicatorias & Libros de Deseos' },
    { key: 'songRequests', label: '🎵 Música & Peticiones al DJ' }
  ];

  @Output() selectAsset = new EventEmitter<{ event?: Event; file?: File; files?: File[]; folder: AssetFolder }>();
  @Output() removeCover = new EventEmitter<void>();
  @Output() removeMusic = new EventEmitter<void>();
  @Output() removeGalleryImage = new EventEmitter<number>();
  @Output() uploadSectionMusic = new EventEmitter<{ event: Event; sectionKey: string }>();
  @Output() removeSectionMusic = new EventEmitter<string>();
  @Output() musicPlaybackError = new EventEmitter<void>();
  @Output() addLodgingItem = new EventEmitter<void>();
  @Output() removeLodgingItem = new EventEmitter<number>();
  @Output() searchLodging = new EventEmitter<{ index: number; query: string }>();
  @Output() selectLodgingResult = new EventEmitter<{ index: number; result: PlaceSearchResult }>();
  @Output() extractLodgingMapInfo = new EventEmitter<number>();
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

  ngOnChanges(): void {
    this.ensureMusicConfiguration();
  }

  get musicSettings(): MusicPlaybackSettings {
    this.ensureMusicConfiguration();
    return this.invitation.content.musicSettings!;
  }

  sectionCue(sectionKey: string): MusicCueSettings {
    this.ensureMusicConfiguration();
    return this.invitation.content.sectionMusicCues?.[sectionKey] || {};
  }

  setSectionCueNumber(sectionKey: string, field: 'startSeconds' | 'endSeconds' | 'volume', value: string | number | null): void {
    this.ensureMusicConfiguration();
    const cue = { ...(this.invitation.content.sectionMusicCues?.[sectionKey] || {}) };
    const parsed = value === '' || value === null ? undefined : Number(value);
    if (parsed === undefined || !Number.isFinite(parsed)) delete cue[field];
    else cue[field] = field === 'volume' ? Math.min(1, Math.max(0, parsed)) : Math.max(0, parsed);
    this.invitation.content.sectionMusicCues![sectionKey] = cue;
  }

  setSectionCueLoop(sectionKey: string, value: boolean): void {
    this.ensureMusicConfiguration();
    this.invitation.content.sectionMusicCues![sectionKey] = {
      ...(this.invitation.content.sectionMusicCues?.[sectionKey] || {}),
      loop: value
    };
  }

  private ensureMusicConfiguration(): void {
    if (!this.invitation?.content) return;
    this.invitation.content.musicSettings = {
      playbackMode: 'first_interaction', sectionChangeMode: 'automatic', loop: true,
      volume: 0.7, startSeconds: 0, ...(this.invitation.content.musicSettings || {})
    };
    this.invitation.content.sectionMusicCues = this.invitation.content.sectionMusicCues || {};
  }

  onCoverFilesSelected(files: File[]): void {
    if (!files || !files.length) return;
    this.selectAsset.emit({ files, folder: 'covers' });
  }

  onGalleryFilesSelected(files: File[]): void {
    if (!files || !files.length) return;
    this.selectAsset.emit({ files, folder: 'gallery' });
  }

  activeUrlInputKey: string | null = null;
  tempInputUrl: string = '';

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'gallery') return settings.gallery !== false;
    if (key === 'backgroundMusic') return settings.backgroundMusic !== false;
    return settings[key] !== false;
  }

  addLodgingService(index: number): void {
    const item = this.invitation.content.lodging?.[index];
    if (!item) return;
    item.services = [...(item.services || []), ''];
  }

  updateLodgingService(index: number, serviceIndex: number, value: string): void {
    const item = this.invitation.content.lodging?.[index];
    if (!item) return;
    item.services = [...(item.services || [])];
    item.services[serviceIndex] = value;
  }

  removeLodgingService(index: number, serviceIndex: number): void {
    const item = this.invitation.content.lodging?.[index];
    if (!item?.services) return;
    item.services.splice(serviceIndex, 1);
  }

  addLodgingSchedule(index: number): void {
    const item = this.invitation.content.lodging?.[index];
    if (!item) return;
    item.schedule = [...(item.schedule || []), ''];
  }

  updateLodgingSchedule(index: number, scheduleIndex: number, value: string): void {
    const item = this.invitation.content.lodging?.[index];
    if (!item) return;
    item.schedule = [...(item.schedule || [])];
    item.schedule[scheduleIndex] = value;
  }

  removeLodgingSchedule(index: number, scheduleIndex: number): void {
    const item = this.invitation.content.lodging?.[index];
    if (!item?.schedule) return;
    item.schedule.splice(scheduleIndex, 1);
  }

  moveListItem(values: string[] | undefined, index: number, direction: number): void {
    if (!values) return;
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    [values[index], values[target]] = [values[target], values[index]];
  }

  trackByIndex(index: number): number {
    return index;
  }

  moveLodgingItem(index: number, direction: number): void {
    const items = this.invitation.content.lodging || [];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    items.forEach((item, priority) => { item.priority = priority; });
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

  isSpotifyUrl(url?: string): boolean {
    if (!url) return false;
    return /^(spotify:|https?:\/\/(?:open\.)?spotify\.com\/)/i.test(url.trim());
  }

  musicProviderLabel(url?: string): string {
    if (this.isYouTubeUrl(url)) return 'YouTube';
    if (this.isSpotifyUrl(url)) return 'Spotify';
    return 'Archivo de audio';
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
