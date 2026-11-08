// Interfaz de control del reproductor propio de TodoTube para atajos, siguiente automático y modo cine.
export type PlayerHandle = {
  togglePlay: () => void;
  seekBy: (sec: number) => void;
  seekToFraction: (f: number) => void;
  toggleMute: () => void;
  changeRate: (delta: number) => number;
  restart: () => void;
  getTime: () => number;
  seekTo: (sec: number) => void;
};

export type VideoDetails = { views?: number; description?: string; lengthSeconds?: number; author?: string };
