import React from 'react';
import type { Station, PlayerStatus } from '../types/terminal';
import { trackClick } from '../services/api';
import { artworkFor } from './artwork';
import { STATUS_LABEL } from './playerStatus';
import { EqBars } from './PlayerVisuals';

function PlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="m7 4 12 8-12 8V4z" />
    </svg>
  );
}
function PauseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1.5" />
      <rect x="14" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
function RetryIcon() {
  return (
    <svg
      width="18"
      height="18"
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
  );
}
function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      className="animate-spin"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

interface StationCardProps {
  station: Station;
  active: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  status: PlayerStatus | null;
  onPlay: (s: Station) => void;
  onFavorite: (s: Station) => void;
  onInfo: (s: Station) => void;
  index?: number;
}

export const StationCard: React.FC<StationCardProps> = React.memo(
  ({ station, active, isPlaying, isFavorite, status, onPlay, onFavorite, onInfo, index = 0 }) => {
    const art = React.useMemo(() => artworkFor(station.name), [station.name]);

    const live = active && status === 'playing' && isPlaying;
    const busy =
      active && (status === 'connecting' || status === 'buffering' || status === 'recovering' || status === 'stalled');
    const busyLabel = busy && status ? STATUS_LABEL[status] : undefined;
    const failed = active && (status === 'error' || status === 'mixed-content');
    const errorLabel = status ? STATUS_LABEL[status] : undefined;

    const meta = [station.codec, station.bitrate ? `${station.bitrate}K` : null, station.genre].filter(
      Boolean,
    ) as string[];

    // Card entrance is staggered for the first 12 cards only; later cards (or
    // appended "load more" pages) just appear, so the list never feels slow.
    const staggerMs = index < 12 ? index * 20 : 0;

    return (
      <article
        className={`card-enter group relative flex flex-col rounded-card surface-card overflow-hidden
        transition-[transform,box-shadow,border-color] duration-standard ease-premium
        hover:-translate-y-0.5 hover:border-line/10 active:scale-[0.98]
        ${live ? 'border-cyan/50 shadow-glow' : failed ? 'border-danger/25' : ''}`}
        style={{ ['--delay' as string]: `${staggerMs}ms` }}
        aria-label={station.name}
      >
        {/* The whole card plays: one real button stretched over it (a card with
          role="button" can't legally contain the heart/details buttons).
          Those two sit above it with z-10. */}
        <button
          type="button"
          onClick={() => {
            onPlay(station);
            void trackClick(station.id);
          }}
          className="absolute inset-0 z-[1] rounded-card cursor-pointer focus-visible:[outline-offset:-3px]"
          aria-label={`${failed ? 'Retry' : isPlaying && active ? 'Pause' : 'Play'} ${station.name}`}
        />
        {/* Artwork */}
        <div className="relative aspect-square w-full overflow-hidden [container-type:inline-size]">
          <div
            className="absolute inset-0 transition-transform duration-standard ease-premium group-hover:scale-[1.03]"
            style={{ background: art.gradient }}
          />
          <span
            className="absolute inset-0 grid place-items-center font-sans font-bold select-none pointer-events-none text-[13cqw]"
            style={{ color: art.tint }}
            aria-hidden
          >
            {art.monogram}
          </span>
          {/* subtle top scrim so the status row always reads */}
          <div
            className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent pointer-events-none"
            aria-hidden
          />

          {/* Favorite */}
          <button
            type="button"
            onClick={() => onFavorite(station)}
            className={`absolute top-2 right-2 z-10 grid place-items-center w-11 h-11 rounded-button backdrop-blur-md transition-colors duration-micro
            ${isFavorite ? 'text-magenta bg-magenta/15' : 'text-white/70 bg-black/25 hover:text-magenta hover:bg-black/40'}`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
          >
            <HeartIcon filled={isFavorite} />
          </button>

          {/* Play control: a solid button in the artwork's corner, always visible
              on touch and mouse alike, so it never sits on top of the monogram.
              The whole card is the hit area (the stretched button above); this is
              the visual affordance, and it reflects play / pause / tuning / retry. */}
          <span
            aria-hidden
            className={`absolute bottom-2.5 right-2.5 z-[2] grid place-items-center w-11 h-11 rounded-full shadow-raised pointer-events-none
              transition-transform duration-micro ease-premium group-hover:scale-105 group-active:scale-95
              ${live ? 'bg-cyan text-on-accent' : failed ? 'bg-danger text-on-accent' : 'bg-white text-on-accent'}`}
          >
            {busy ? (
              <Spinner />
            ) : failed ? (
              <RetryIcon />
            ) : isPlaying && active ? (
              <PauseIcon size={18} />
            ) : (
              <PlayIcon size={18} />
            )}
          </span>

          {/* Status row: LIVE badge, buffering/recovering, or error */}
          {(live || busyLabel || failed) && (
            <div className="absolute left-2 top-2 flex items-center gap-1.5">
              {live && (
                <span className="flex items-center gap-1 rounded-chip bg-cyan text-on-accent text-2xs font-bold uppercase tracking-[0.08em] px-2 py-1">
                  <EqBars count={3} className="h-2.5" />
                  Live
                </span>
              )}
              {busyLabel && (
                <span className="flex items-center gap-1.5 rounded-chip bg-black/45 backdrop-blur-md text-2xs font-medium text-white px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse-dot" />
                  {busyLabel}
                </span>
              )}
              {failed && (
                <span className="flex items-center gap-1.5 rounded-chip bg-black/45 backdrop-blur-md text-2xs font-medium text-danger px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                  {errorLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5 flex-1">
          <h2
            dir="auto"
            className={`text-sm font-semibold leading-tight truncate ${live ? 'text-cyan' : 'text-primary'}`}
          >
            {station.name}
          </h2>
          <p dir="auto" className="text-xs text-tertiary truncate">
            {[station.city, station.country || 'Global'].filter(Boolean).join(', ')}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-2 border-t border-line/[0.06]">
            {meta.slice(0, 3).map((m) => (
              <span
                key={m}
                dir="auto"
                className="font-mono text-2xs text-secondary bg-raised px-1.5 py-0.5 rounded max-w-[7rem] truncate"
              >
                {m}
              </span>
            ))}
            <button
              type="button"
              onClick={() => onInfo(station)}
              className="relative z-10 ml-auto grid place-items-center min-w-[44px] min-h-[44px] -mr-2.5 -my-2 rounded text-tertiary hover:text-primary hover:bg-raised transition-colors duration-micro"
              aria-label={`Details for ${station.name}`}
            >
              <InfoIcon />
            </button>
          </div>
        </div>
      </article>
    );
  },
);
