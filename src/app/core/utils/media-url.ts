import { environment } from '../../../environments/environment';

/**
 * Utility to normalize media URLs (MinIO / S3 / local uploads).
 * Proxies port 9000 media through the Backend so that mobile phones
 * and local network clients can load all assets without port 9000 firewall blocks.
 * Also prefixes relative /api/media URLs with backend host when running in native mobile apps.
 */
export function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const apiUrl = environment.apiUrl || '/api';
  const isAbsoluteApi = apiUrl.startsWith('http://') || apiUrl.startsWith('https://');
  const apiBase = isAbsoluteApi ? apiUrl.replace(/\/api\/?$/, '') : '';

  // 1. MinIO on port 9000 (localhost:9000 or any-ip:9000)
  const minioMatch = trimmed.match(/^https?:\/\/[^/]+:9000\/(.+)$/i);
  if (minioMatch) {
    const mediaPath = minioMatch[1];
    return `${apiUrl}/media/${mediaPath}`;
  }

  // 2. Relative /api/media/... when running on mobile app (needs backend host)
  if (trimmed.startsWith('/api/media/')) {
    if (isAbsoluteApi) {
      return `${apiBase}${trimmed}`;
    }
    return trimmed;
  }

  // 3. Relative /media/...
  if (trimmed.startsWith('/media/')) {
    if (isAbsoluteApi) {
      return `${apiUrl}${trimmed}`;
    }
    return `/api${trimmed}`;
  }

  return trimmed;
}

/**
 * Deep recursive normalizer for objects / arrays returned by backend APIs.
 * Automatically rewrites all :9000 URLs in API responses to backend proxy
 * and ensures full URLs on mobile apps.
 */
export function normalizeMediaUrlsDeep<T>(value: T): T {
  if (!value) return value;

  const minioRegex = /https?:\/\/[^/]+:9000\/([^"'\\)\s]+)/gi;
  const apiUrl = environment.apiUrl || '/api';
  const isAbsoluteApi = apiUrl.startsWith('http://') || apiUrl.startsWith('https://');
  const apiBase = isAbsoluteApi ? apiUrl.replace(/\/api\/?$/, '') : '';

  const process = (item: any): any => {
    if (typeof item === 'string') {
      let str = item.replace(minioRegex, (_match, path) => {
        return `${apiUrl}/media/${path}`;
      });
      if (isAbsoluteApi && str.startsWith('/api/media/')) {
        str = `${apiBase}${str}`;
      } else if (isAbsoluteApi && str.startsWith('/media/')) {
        str = `${apiUrl}${str}`;
      }
      return str;
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
