export const environment = {
  production: false,
  apiUrl: typeof window !== 'undefined' && window.location && window.location.hostname
    ? `http://${window.location.hostname}:4000/api`
    : 'http://localhost:4000/api'
};
