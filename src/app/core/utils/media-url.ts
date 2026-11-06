import { environment } from '../../../environments/environment';

/**
 * Utility to normalize media URLs (MinIO / S3 / local uploads).
 * Proxies port 9000 media through the Backend so that mobile phones
 * and local network clients can load all assets without port 9000 firewall blocks.
 */
export function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const minioMatch = trimmed.match(/^https?:\/\/[^/]+:9000\/(.+)$/i);
  if (minioMatch) {
    const mediaPath = minioMatch[1];
    return `${environment.apiUrl}/media/${mediaPath}`;
  }

  return trimmed;
}

/**
 * Deep recursive normalizer for objects / arrays returned by backend APIs.
 * Automatically rewrites all :9000 URLs in API responses to backend proxy.
 */
export function normalizeMediaUrlsDeep<T>(value: T): T {
  if (!value) return value;

  const regex = /https?:\/\/[^/]+:9000\/([^"'\\)\s]+)/gi;

  const process = (item: any): any => {
    if (typeof item === 'string') {
      return item.replace(regex, (_match, path) => {
        return `${environment.apiUrl}/media/${path}`;
      });
    }
    if (Array.isArray(item)) {
      return item.map(process);
    }
    if (item !== null && typeof item === 'object') {
      if (item instanceof Blob || item instanceof Date || item instanceof RegExp) {
        return item;
      }
      const copy: Record<string, any> = {};
      for (const key of Object.keys(item)) {
        copy[key] = process(item[key]);
      }
      return copy;
    }
    return item;
  };

  return process(value);
}
