export type VisualMediaProvider = 'youtube' | 'spotify' | 'vimeo' | 'direct' | 'empty';

export interface VisualMediaSource {
  provider: VisualMediaProvider;
  sourceUrl: string;
  embedUrl?: string;
}

export function resolveVisualMediaSource(value?: string, startSeconds?: number, endSeconds?: number): VisualMediaSource {
  const sourceUrl = String(value || '').trim();
  if (!sourceUrl) return { provider: 'empty', sourceUrl: '' };

  const spotifyUri = sourceUrl.match(/^spotify:(track|album|playlist|episode|show):([A-Za-z0-9_-]{6,64})$/i);
  if (spotifyUri) {
    const kind = spotifyUri[1].toLowerCase();
    const id = spotifyUri[2];
    return { provider: 'spotify', sourceUrl, embedUrl: `https://open.spotify.com/embed/${kind}/${id}` };
  }

  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const videoId = host === 'youtu.be'
        ? parsed.pathname.split('/').filter(Boolean)[0]
        : parsed.searchParams.get('v') || youtubePathId(parsed.pathname);
      if (isSafeProviderId(videoId)) {
        const start = normalizedSeconds(startSeconds) ?? youtubeTimeSeconds(parsed.searchParams.get('start') || parsed.searchParams.get('t'));
        const end = normalizedSeconds(endSeconds) ?? normalizedSeconds(parsed.searchParams.get('end'));
        const params = new URLSearchParams({ rel: '0', playsinline: '1' });
        if (start !== undefined) params.set('start', String(start));
        if (end !== undefined && (start === undefined || end > start)) params.set('end', String(end));
        return {
          provider: 'youtube',
          sourceUrl,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
        };
      }
    }

    if (host === 'open.spotify.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const kindIndex = parts.findIndex((part) => ['track', 'album', 'playlist', 'episode', 'show'].includes(part.toLowerCase()));
      const kind = kindIndex >= 0 ? parts[kindIndex].toLowerCase() : '';
      const id = kindIndex >= 0 ? parts[kindIndex + 1] : '';
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

function normalizedSeconds(value?: number | string | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function youtubeTimeSeconds(value?: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return undefined;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function youtubePathId(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] || '' : '';
}

function isSafeProviderId(value?: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{6,64}$/.test(value));
}
