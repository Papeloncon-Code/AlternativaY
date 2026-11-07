// fetch a través de TodoTube Puente para YouTube.js (sin cargar el reproductor). Derivado de googlevideo/examples (MIT, © LuanRT).
import { bridgeApi } from '../bridge';

export async function fetchFunction(input: string | Request | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const requestInit = { ...init, headers };
  if (url.pathname.includes('v1/player')) {
    url.searchParams.set('$fields', 'playerConfig,storyboards,captions,playabilityStatus,streamingData,responseContext.mainAppWebResponseContext.datasyncId,videoDetails.isLive,videoDetails.isLiveContent,videoDetails.title,videoDetails.author,videoDetails.thumbnail');
  }
  const b = bridgeApi();
  if (!b?.installed) throw new Error('TodoTube Puente no está instalado.');
  if (url.pathname.includes('initplayback')) return fetch(url, requestInit);
  return b.fetch(url.toString(), requestInit);
}
