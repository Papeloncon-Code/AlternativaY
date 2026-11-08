const BASE = (import.meta.env.VITE_MEDIA_GATEWAY_URL || 'https://todotube-media-gateway.papelon.workers.dev').replace(/\/$/, '');
export const gatewayUrl = (path: string) => BASE + (path.startsWith('/') ? path : '/' + path);
export const gatewayMediaUrl = (id: string) => gatewayUrl('/v1/media/' + encodeURIComponent(id));
