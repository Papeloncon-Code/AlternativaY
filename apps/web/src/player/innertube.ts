// Sesión única de YouTube.js en el navegador (a través del Puente). La usan el reproductor, el buscador y las fotos de canal.
import { Innertube, UniversalCache } from 'youtubei.js/web';
import { fetchFunction } from './bridgeFetch';

let innertubePromise: Promise<Innertube> | null = null;
export function getInnertube(): Promise<Innertube> {
  if (!innertubePromise) {
    innertubePromise = Innertube.create({ cache: new UniversalCache(true), fetch: fetchFunction });
    innertubePromise.catch(() => { innertubePromise = null; });
  }
  return innertubePromise;
}
