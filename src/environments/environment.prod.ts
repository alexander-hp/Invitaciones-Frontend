function resolveApiUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('velisse_api_url');
    if (customUrl) return customUrl;

    const isNative = Boolean(
      (window as any).Capacitor?.isNativePlatform?.() ||
      (window as any).Capacitor?.platform === 'android' ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && !window.location.port)
    );

    if (isNative) {
      return 'http://192.168.100.7:4000/api';
    }
  }
  return '/api';
}

export const environment = {
  production: true,
  get apiUrl(): string {
    return resolveApiUrl();
  }
};
