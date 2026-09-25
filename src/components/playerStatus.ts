import type { PlayerStatus } from '../types/terminal';

/**
 * One canonical set of status labels, shared by StationCard, MiniPlayer and
 * StationModal so the same status never reads differently in three places.
 */
export const STATUS_LABEL: Record<PlayerStatus, string> = {
  idle: 'Ready',
  connecting: 'Tuning…',
  playing: 'On air',
  buffering: 'Buffering…',
  recovering: 'Reconnecting…',
  stalled: 'Weak signal',
  error: 'Station offline',
  'mixed-content': 'Blocked · HTTP only',
};

/** Statuses where a retry makes sense (a fresh connection might succeed). */
export const isRecoverable = (status: PlayerStatus) => status === 'error' || status === 'stalled';

/** Tone used to colour the status dot/chip consistently everywhere. */
export type StatusTone = 'live' | 'busy' | 'error' | 'idle';

export function toneOf(status: PlayerStatus | null, isPlaying: boolean): StatusTone {
  if (!status) return 'idle';
  if (status === 'playing' && isPlaying) return 'live';
  if (status === 'error' || status === 'mixed-content') return 'error';
  if (status === 'connecting' || status === 'buffering' || status === 'recovering' || status === 'stalled')
    return 'busy';
  return 'idle';
}
