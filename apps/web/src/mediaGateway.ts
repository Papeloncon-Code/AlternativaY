const BASE = (import.meta.env.VITE_MEDIA_GATEWAY_URL || 'https://todotube-media-gateway.papelon.workers.dev').replace(/\/$/, '');
export const gatewayUrl = (path: string) => BASE + (path.startsWith('/') ? path : '/' + path);
export const gatewayMediaUrl = (id: string) => gatewayUrl('/v1/media/' + encodeURIComponent(id));

export type GatewayHealth = {
  ok: boolean;
  service: string;
  originsConfigured: number;
  originsAvailable: number;
  degraded: boolean;
};

/** Read the Gateway's live origin count. HTTP 503 is still a valid health payload
 * when all configured origins are unavailable; callers need that detail. */
export async function fetchGatewayHealth(): Promise<GatewayHealth> {
  const response = await fetch(gatewayUrl('/health'), { cache: 'no-store' });
  const data = await response.json().catch(() => null) as Partial<GatewayHealth> | null;
  if (!data || typeof data.ok !== 'boolean' || typeof data.service !== 'string' ||
      !Number.isInteger(data.originsConfigured) || !Number.isInteger(data.originsAvailable) ||
      typeof data.degraded !== 'boolean') {
    throw new Error('El Gateway no devolvió un estado de almacenamiento válido.');
  }
  if (!response.ok && response.status !== 503) {
    throw new Error('No se pudo consultar el estado del Gateway (HTTP ' + response.status + ').');
  }
  return data as GatewayHealth;
}

export async function hasPublicGatewayVideo(id: string): Promise<boolean> {
  try {
    const response = await fetch(gatewayMediaUrl(id), { method: 'HEAD' });
    return response.ok && (response.headers.get('Content-Type') || '').toLowerCase().startsWith('video/');
  } catch {
    return false;
  }
}

export type GatewayUploadInput = {
  id: string;
  file: File;
  token: string;
  title: string;
  creator: string;
  license: 'owned' | 'licensed';
  licenseReference?: string;
  visibility: 'public' | 'private';
};

export type GatewayUploadResult = {
  ok: boolean;
  id: string;
  visibility: 'public' | 'private';
  replicas: { written: number; configured: number; degraded: boolean };
};

export async function uploadGatewayMedia(input: GatewayUploadInput): Promise<GatewayUploadResult> {
  const headers = new Headers({
    Authorization: 'Bearer ' + input.token.trim(),
    'Content-Type': input.file.type,
    'X-Media-Size': String(input.file.size),
    'X-Media-Title': input.title.trim(),
    'X-Media-Creator': input.creator.trim(),
    'X-Media-License': input.license,
    'X-Media-Visibility': input.visibility,
  });
  if (input.license === 'licensed' && input.licenseReference?.trim()) {
    headers.set('X-Media-License-Reference', input.licenseReference.trim());
  }
  const response = await fetch(gatewayUrl('/v1/admin/media/' + encodeURIComponent(input.id)), {
    method: 'PUT',
    headers,
    body: input.file,
  });
  const result = await response.json().catch(() => ({})) as Partial<GatewayUploadResult> & { error?: string };
  if (!response.ok) {
    const message = result.error || (
      response.status === 401 ? 'El token de carga es incorrecto o no está configurado en el Gateway.' :
      response.status === 409 ? 'Ya existe un medio con ese ID. Usa otro ID; no se sobrescriben archivos existentes.' :
      response.status === 413 ? 'El archivo supera el límite de 90 MiB.' :
      response.status === 415 ? 'Formato no admitido. Usa MP4, WebM u Ogg.' :
      'El Gateway respondió HTTP ' + response.status + '.'
    );
    throw new Error(message);
  }
  return result as GatewayUploadResult;
}
