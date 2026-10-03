import { Component, ElementRef, EventEmitter, HostBinding, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { resolveVisualMediaSource, VisualMediaProvider } from './visual-media-source';

@Component({
  selector: 'app-visual-media-player',
  templateUrl: './visual-media-player.component.html',
  styleUrls: ['./visual-media-player.component.css']
})
export class VisualMediaPlayerComponent implements OnChanges {
  @Input() type = 'video';
  @Input() url = '';
  @Input() label = '';
  @Input() preserveAspectRatio = true;
  @Input() showPlaceholder = false;
  @Input() presentation: 'native' | 'button' = 'native';
  @Input() autoplay = false;
  @Input() loop = false;
  @Input() volume = 1;
  @Input() startSeconds = 0;
  @Input() endSeconds?: number;
  @Input() showIcon = true;
  @Input() showLabel = true;
  @Input() icon: 'play' | 'note' = 'play';
  @Input() externalControl = false;
  @Input() externalReady = true;
  @Input() externalPlaying = false;
  @Output() toggleRequested = new EventEmitter<void>();

  provider: VisualMediaProvider = 'empty';
  directUrl = '';
  embedUrl?: SafeResourceUrl;
  providerPlaybackUrl?: SafeResourceUrl;
  nativeError = false;
  playing = false;
  providerOpen = false;
  private audioElement?: HTMLAudioElement;
  private suppressNextPointerClick = false;
  private suppressNextPointerClickTimer?: ReturnType<typeof setTimeout>;

  @ViewChild('nativeAudio')
  set nativeAudioRef(ref: ElementRef<HTMLAudioElement> | undefined) {
    this.audioElement = ref?.nativeElement;
    this.configureAudio();
  }

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const media = resolveVisualMediaSource(this.url, this.startSeconds, this.endSeconds);
    this.nativeError = false;
    this.playing = false;
    this.provider = media.provider;
    this.directUrl = media.sourceUrl;
    this.embedUrl = media.embedUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(media.embedUrl)
      : undefined;
    this.providerPlaybackUrl = media.embedUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.withPlaybackRequest(media.embedUrl, media.provider))
      : undefined;
    this.providerOpen = false;
    this.configureAudio();
  }

  get customAudioControl(): boolean {
    return this.type === 'audio' && this.presentation === 'button' && this.provider === 'direct';
  }

  get providerButtonControl(): boolean {
    return this.type === 'audio' && this.presentation === 'button' && (this.provider === 'youtube' || this.provider === 'spotify');
  }

  get audioIcon(): string {
    if (this.displayPlaying) return '❚❚';
    return this.icon === 'note' ? '♪' : '▶';
  }

  get audioActionLabel(): string {
    if (this.externalControl && !this.externalReady) return 'Preparando música';
    return this.displayPlaying ? 'Pausar música' : 'Reproducir música';
  }

  get displayPlaying(): boolean {
    return this.externalControl ? this.externalPlaying : this.playing;
  }

  activateAudio(): void {
    if (this.externalControl) {
      this.toggleRequested.emit();
      return;
    }
    void this.toggleAudio();
  }

  activateAudioOnPointerDown(event: PointerEvent): void {
    if (!this.externalControl || event.button !== 0) return;
    event.stopPropagation();
    this.armPointerClickSuppression();
    this.toggleRequested.emit();
  }

  activateAudioOnClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.consumeSuppressedPointerClick(event)) return;
    this.activateAudio();
  }

  async toggleAudio(): Promise<void> {
    if (!this.audioElement) return;
    if (!this.audioElement.paused) {
      this.audioElement.pause();
      return;
    }
    try {
      await this.audioElement.play();
    } catch {
      this.playing = false;
    }
  }

  toggleProvider(event?: Event): void {
    event?.stopPropagation();
    if (this.externalControl) {
      this.toggleRequested.emit();
      return;
    }
    this.providerOpen = !this.providerOpen;
    this.playing = this.providerOpen;
  }

  activateProviderOnPointerDown(event: PointerEvent): void {
    if (!this.externalControl || event.button !== 0) return;
    event.stopPropagation();
    this.armPointerClickSuppression();
    this.toggleRequested.emit();
  }

  activateProviderOnClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.consumeSuppressedPointerClick(event)) return;
    this.toggleProvider(event);
  }

  updatePlaying(): void {
    this.playing = Boolean(this.audioElement && !this.audioElement.paused);
  }

  get providerLabel(): string {
    return this.provider === 'youtube' ? 'YouTube'
      : this.provider === 'spotify' ? 'Spotify'
        : this.provider === 'vimeo' ? 'Vimeo'
          : this.type === 'video' ? 'video' : 'audio';
  }

  @HostBinding('class.preserve-visual-aspect')
  get preserveVisualAspect(): boolean {
    return !this.providerButtonControl && this.preserveAspectRatio && (this.type === 'video' || this.provider === 'youtube' || this.provider === 'vimeo');
  }

  @HostBinding('class.audio-player')
  get audioPlayer(): boolean {
    return this.type === 'audio';
  }

  @HostBinding('class.spotify-player')
  get spotifyPlayer(): boolean {
    return this.provider === 'spotify';
  }

  @HostBinding('class.provider-button')
  get providerButton(): boolean {
    return this.providerButtonControl;
  }

  handleNativeError(): void {
    this.nativeError = true;
    this.playing = false;
  }

  private armPointerClickSuppression(): void {
    this.suppressNextPointerClick = true;
    if (this.suppressNextPointerClickTimer) clearTimeout(this.suppressNextPointerClickTimer);
    this.suppressNextPointerClickTimer = setTimeout(() => {
      this.suppressNextPointerClick = false;
      this.suppressNextPointerClickTimer = undefined;
    }, 750);
  }

  private consumeSuppressedPointerClick(event: MouseEvent): boolean {
    if (event.detail <= 0 || !this.suppressNextPointerClick) return false;
    this.suppressNextPointerClick = false;
    if (this.suppressNextPointerClickTimer) {
      clearTimeout(this.suppressNextPointerClickTimer);
      this.suppressNextPointerClickTimer = undefined;
    }
    return true;
  }

  private configureAudio(): void {
    if (!this.audioElement) return;
    this.audioElement.loop = this.loop;
    this.audioElement.volume = Math.max(0, Math.min(1, Number(this.volume ?? 1)));
    const start = Math.max(0, Number(this.startSeconds || 0));
    const end = this.endSeconds === undefined || this.endSeconds === null ? undefined : Number(this.endSeconds);
    const seekToStart = () => {
      if (!this.audioElement) return;
      try { this.audioElement.currentTime = start; } catch { }
    };
    if (this.audioElement.readyState >= 1) seekToStart();
    else this.audioElement.onloadedmetadata = seekToStart;
    this.audioElement.ontimeupdate = () => {
      if (!this.audioElement || !Number.isFinite(end) || Number(end) <= start || this.audioElement.currentTime < Number(end)) return;
      if (this.loop) {
        this.audioElement.currentTime = start;
        void this.audioElement.play();
      } else {
        this.audioElement.pause();
      }
    };
    if (this.autoplay) {
      void this.audioElement.play().catch(() => {
        this.playing = false;
      });
    }
  }

  private withPlaybackRequest(embedUrl: string, provider: VisualMediaProvider): string {
    if (provider !== 'youtube') return embedUrl;
    return `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`;
  }
}
