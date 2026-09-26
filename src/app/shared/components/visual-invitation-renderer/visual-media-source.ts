export type VisualMediaProvider = 'youtube' | 'spotify' | 'vimeo' | 'direct' | 'empty';

export interface VisualMediaSource {
  provider: VisualMediaProvider;
  sourceUrl: string;
  embedUrl?: string;
}

export function resolveVisualMediaSource(value?: string): VisualMediaSource {
  const sourceUrl = String(value || '').trim();
  if (!sourceUrl) return { provider: 'empty', sourceUrl: '' };

  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const videoId = host === 'youtu.be'
        ? parsed.pathname.split('/').filter(Boolean)[0]
        : parsed.searchParams.get('v') || youtubePathId(parsed.pathname);
      if (isSafeProviderId(videoId)) {
        return {
          provider: 'youtube',
          sourceUrl,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`
        };
      }
    }

    if (host === 'open.spotify.com') {
      const [kind, id] = parsed.pathname.split('/').filter(Boolean);
      if (['track', 'album', 'playlist', 'episode', 'show'].includes(kind) && isSafeProviderId(id)) {
        return { provider: 'spotify', sourceUrl, embedUrl: `https://open.spotify.com/embed/${kind}/${id}` };
      }
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part));
      if (id) return { provider: 'vimeo', sourceUrl, embedUrl: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    return { provider: 'direct', sourceUrl };
  }

  return { provider: 'direct', sourceUrl };
}

function youtubePathId(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] || '' : '';
}

function isSafeProviderId(value?: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{6,64}$/.test(value));
}
