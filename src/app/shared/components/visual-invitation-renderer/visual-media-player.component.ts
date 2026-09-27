import { Component, HostBinding, Input, OnChanges } from '@angular/core';
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

  provider: VisualMediaProvider = 'empty';
  directUrl = '';
  embedUrl?: SafeResourceUrl;
  nativeError = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const media = resolveVisualMediaSource(this.url);
    this.nativeError = false;
    this.provider = media.provider;
    this.directUrl = media.sourceUrl;
    this.embedUrl = media.embedUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(media.embedUrl)
      : undefined;
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
  }
}
