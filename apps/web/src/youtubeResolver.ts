export type ResolvedYouTubeStream = {
  videoId: string;
  title: string;
  channel: string;
  streamUrl: string;
  mimeType: string;
  resolution: string;
  width: number;
  height: number;
  durationSeconds: number;
  provider: 'newpipe';
  resolvedAt: number;
  cacheSeconds: number;
};

export async function resolveYoutubeStream(
  id: string,
  signal?: AbortSignal,
): Promise<ResolvedYouTubeStream> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error('El ID del vídeo no es válido.');
  }

  const response = await fetch('/api/youtube/resolve/' + encodeURIComponent(id), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  const data = await response.json().catch(() => ({})) as Partial<ResolvedYouTubeStream> & {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || (
      response.status === 503
        ? 'El servicio NewPipe todavía no está conectado al servidor.'
        : 'No se pudo resolver el vídeo (HTTP ' + response.status + ').'
    ));
  }
  if (data.videoId !== id || typeof data.streamUrl !== 'string'
      || !data.streamUrl.startsWith('https://')
      || data.provider !== 'newpipe') {
    throw new Error('El resolvedor devolvió una fuente multimedia incompleta.');
  }
  return data as ResolvedYouTubeStream;
}
