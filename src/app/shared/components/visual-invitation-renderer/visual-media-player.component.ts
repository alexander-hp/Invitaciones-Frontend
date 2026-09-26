import { Component, Input, OnChanges } from '@angular/core';
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
  @Input() showPlaceholder = false;

  provider: VisualMediaProvider = 'empty';
  directUrl = '';
  embedUrl?: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const media = resolveVisualMediaSource(this.url);
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
}
