export type PlaybackStallSnapshot = {
  now: number;
  lastProgressAt: number;
  currentTime: number;
  lastCurrentTime: number;
  bufferedAhead: number;
  paused: boolean;
  seeking: boolean;
  ended: boolean;
  visible: boolean;
  online: boolean;
};

export const PLAYBACK_STALL_TIMEOUT_MS = 2_000;
export const PLAYBACK_STALL_TIME_EPSILON_SECONDS = 0.05;
export const PLAYBACK_STALL_BUFFER_EPSILON_SECONDS = 0.25;

/**
 * Detects a real playback stall, not a user pause, manual seek, background tab,
 * offline browser, or normal playback with buffered media still available.
 */
export function shouldRecoverPlaybackStall(
  state: PlaybackStallSnapshot,
  timeoutMs = PLAYBACK_STALL_TIMEOUT_MS,
): boolean {
  if (
    state.paused ||
    state.seeking ||
    state.ended ||
    !state.visible ||
    !state.online
  ) {
    return false;
  }

  const timeAdvanced = Math.abs(state.currentTime - state.lastCurrentTime) >
    PLAYBACK_STALL_TIME_EPSILON_SECONDS;
  if (timeAdvanced) return false;

  if (state.bufferedAhead > PLAYBACK_STALL_BUFFER_EPSILON_SECONDS) {
    return false;
  }

  return state.now - state.lastProgressAt >= timeoutMs;
}
