import React, { useState } from 'react';
import type { Station, PlayerStatus } from '../types/terminal';
import { artworkFor } from './artwork';
import { STATUS_LABEL, isRecoverable, toneOf } from './playerStatus';
import { EqBars, StatusDot } from './PlayerVisuals';

interface MiniPlayerProps {
  station: Station;
  isPlaying: boolean;
  status: PlayerStatus;
  volume: number;
  onToggle: () => void;
  /** Restart a failed stream from scratch (a plain toggle can't re-fetch an errored source). */
  onRetry: () => void;
  onVolumeChange: (v: number) => void;
  onFavorite: () => void;
  isFavorite: boolean;
}

/**
 * Docked player. Shares the exact artwork, status-label and equalizer
 * language as StationCard, so "this station is on air" looks identical
 * everywhere. Every status (idle/connecting/buffering/recovering/playing/
 * stalled/error/mixed-content) gets a distinct, correct visual — v3 only
 * really distinguished "playing" from everything else.
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = React.memo(
  ({ station, isPlaying, status, volume, onToggle, onRetry, onVolumeChange, onFavorite, isFavorite }) => {
    const [volOpen, setVolOpen] = useState(false);
    if (!station) return null;

    const art = artworkFor(station.name);
    const tone = toneOf(status, isPlaying);
    const live = tone === 'live';
    const label = STATUS_LABEL[status] ?? 'Ready';
    const showRetry = isRecoverable(status);

    return (
      <div role="region" aria-label="Now playing" className="relative w-full animate-slide-up">
        <div
          className={`relative flex items-center gap-2.5 md:gap-4 h-16 md:h-[4.5rem] pl-2.5 pr-2.5 md:pl-3 md:pr-4 rounded-card surface-raised overflow-hidden ${live ? 'ring-1 ring-cyan/40 shadow-glow' : ''}`}
        >
          {/* Artwork + status */}
          <div className="relative shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-button overflow-hidden [container-type:inline-size]">
            <div className="absolute inset-0" style={{ background: art.gradient }} aria-hidden />
            <span
              className="absolute inset-0 grid place-items-center font-sans font-bold text-2xs"
              style={{ color: art.tint }}
              aria-hidden
            >
              {live ? <EqBars count={3} /> : art.monogram}
            </span>
          </div>

          {/* Name + status */}
          <div className="min-w-0 flex-1">
            <p
              dir="auto"
              className={`text-sm font-semibold truncate leading-tight ${live ? 'text-cyan' : 'text-primary'}`}
            >
              {station.name}
            </p>
            <p className="flex items-center gap-1.5 mt-0.5 font-mono text-2xs text-tertiary tracking-wide truncate">
              <StatusDot tone={tone} />
              <span className="truncate">
                {label} · {station.country || 'Global'}
              </span>
            </p>
          </div>

          {/* Retry, only when recoverable */}
          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Try again"
              className="flex shrink-0 items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-button border border-line/15 bg-base text-xs font-medium text-secondary hover:text-primary hover:border-line/25 transition-colors"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
              <span className="hidden sm:inline">Try again</span>
            </button>
          )}

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              className="text-tertiary"
              aria-hidden
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {volume > 0 && <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 md:w-24 h-1.5 rounded-full appearance-none bg-line/15 accent-cyan cursor-pointer"
              aria-label="Volume"
              aria-valuetext={`${Math.round(volume * 100)}%`}
            />
          </div>
          <button
            type="button"
            onClick={() => setVolOpen((v) => !v)}
            className="sm:hidden grid place-items-center min-w-[44px] min-h-[44px] text-tertiary hover:text-primary shrink-0"
            aria-label="Volume"
            aria-expanded={volOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {volume > 0 && <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
            </svg>
          </button>

          <button
            type="button"
            onClick={onFavorite}
            className={`grid place-items-center min-w-[44px] min-h-[44px] rounded-button transition-colors shrink-0 ${isFavorite ? 'text-magenta' : 'text-tertiary hover:text-magenta'}`}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="grid place-items-center min-w-[44px] min-h-[44px] w-11 h-11 md:w-12 md:h-12 rounded-button bg-cyan text-on-accent shrink-0 transition-transform active:scale-95"
            aria-label={isPlaying ? `Pause ${station.name}` : `Play ${station.name}`}
          >
            {isPlaying && status !== 'error' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                <path d="m7 4 12 8-12 8V4z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile volume flyout */}
        {volOpen && (
          <div className="sm:hidden absolute bottom-[calc(100%+8px)] right-2 flex items-center gap-2 px-3 py-2.5 rounded-button surface-raised">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-28 h-1.5 rounded-full appearance-none bg-line/15 accent-cyan cursor-pointer"
              aria-label="Volume"
              aria-valuetext={`${Math.round(volume * 100)}%`}
            />
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">{`${label}: ${station.name}`}</p>
      </div>
    );
  },
);
