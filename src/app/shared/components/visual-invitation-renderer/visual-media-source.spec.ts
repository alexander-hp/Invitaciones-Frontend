import { resolveVisualMediaSource } from './visual-media-source';

describe('resolveVisualMediaSource', () => {
  it('converts a YouTube watch URL into a privacy enhanced embed', () => {
    const media = resolveVisualMediaSource('https://www.youtube.com/watch?v=wC7IH002Ypk');
    expect(media.provider).toBe('youtube');
    expect(media.embedUrl).toContain('youtube-nocookie.com/embed/wC7IH002Ypk');
  });

  it('supports shortened and shorts YouTube URLs', () => {
    expect(resolveVisualMediaSource('https://youtu.be/wC7IH002Ypk').provider).toBe('youtube');
    expect(resolveVisualMediaSource('https://youtube.com/shorts/wC7IH002Ypk').provider).toBe('youtube');
  });

  it('converts Spotify tracks into embeds', () => {
    const media = resolveVisualMediaSource('https://open.spotify.com/track/1234567890ABCDEF');
    expect(media.provider).toBe('spotify');
    expect(media.embedUrl).toBe('https://open.spotify.com/embed/track/1234567890ABCDEF');
  });

  it('supports regional Spotify links and Spotify URIs', () => {
    const regional = resolveVisualMediaSource('https://open.spotify.com/intl-es/track/1234567890ABCDEF?si=test');
    const uri = resolveVisualMediaSource('spotify:track:1234567890ABCDEF');
    expect(regional.embedUrl).toBe('https://open.spotify.com/embed/track/1234567890ABCDEF');
    expect(uri.embedUrl).toBe('https://open.spotify.com/embed/track/1234567890ABCDEF');
  });

  it('supports YouTube Music links as embedded media', () => {
    const media = resolveVisualMediaSource('https://music.youtube.com/watch?v=wC7IH002Ypk');
    expect(media.provider).toBe('youtube');
    expect(media.embedUrl).toContain('youtube-nocookie.com/embed/wC7IH002Ypk');
  });

  it('keeps uploaded and direct files as native media URLs', () => {
    const media = resolveVisualMediaSource('https://cdn.example.com/event/video.mp4');
    expect(media.provider).toBe('direct');
    expect(media.embedUrl).toBeUndefined();
  });
});
