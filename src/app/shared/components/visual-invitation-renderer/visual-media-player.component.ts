import { Component, ElementRef, HostBinding, Input, OnChanges, ViewChild } from '@angular/core';
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
  @Input() showIcon = true;
  @Input() showLabel = true;
  @Input() icon: 'play' | 'note' = 'play';

  provider: VisualMediaProvider = 'empty';
  directUrl = '';
  embedUrl?: SafeResourceUrl;
  nativeError = false;
  playing = false;
  private audioElement?: HTMLAudioElement;

  @ViewChild('nativeAudio')
  set nativeAudioRef(ref: ElementRef<HTMLAudioElement> | undefined) {
    this.audioElement = ref?.nativeElement;
    this.configureAudio();
  }

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const media = resolveVisualMediaSource(this.url);
    this.nativeError = false;
    this.playing = false;
    this.provider = media.provider;
    this.directUrl = media.sourceUrl;
    this.embedUrl = media.embedUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(media.embedUrl)
      : undefined;
    this.configureAudio();
  }

  get customAudioControl(): boolean {
    return this.type === 'audio' && this.presentation === 'button' && this.provider === 'direct';
  }

  get audioIcon(): string {
    if (this.playing) return '❚❚';
    return this.icon === 'note' ? '♪' : '▶';
  }

  get audioActionLabel(): string {
    return this.playing ? 'Pausar música' : 'Reproducir música';
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
    return this.preserveAspectRatio && (this.type === 'video' || this.provider === 'youtube' || this.provider === 'vimeo');
  }

  @HostBinding('class.audio-player')
  get audioPlayer(): boolean {
    return this.type === 'audio';
  }

  @HostBinding('class.spotify-player')
  get spotifyPlayer(): boolean {
    return this.provider === 'spotify';
  }

  handleNativeError(): void {
    this.nativeError = true;
    this.playing = false;
  }

  private configureAudio(): void {
    if (!this.audioElement) return;
    this.audioElement.loop = this.loop;
    this.audioElement.volume = Math.max(0, Math.min(1, Number(this.volume ?? 1)));
    if (this.autoplay) {
      void this.audioElement.play().catch(() => {
        this.playing = false;
      });
    }
  }
}
