import React from 'react';
import { Station, PlayerStatus } from '../types/terminal';
import { trackClick } from '../services/api';
import { artworkFor } from './artwork';

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
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

/** 3-bar equalizer replacing the play icon on the actively playing card. */
function EqBars() {
  return (
    <span className="eq-bars h-3.5" aria-hidden>
      <i style={{ height: '55%', animationDelay: '0ms' }} />
      <i style={{ height: '100%', animationDelay: '120ms' }} />
      <i style={{ height: '70%', animationDelay: '240ms' }} />
    </span>
  );
}

const BUSY_LABEL: Partial<Record<PlayerStatus, string>> = {
  connecting: 'Tuning…',
  buffering: 'Buffering…',
  recovering: 'Recovering…',
  stalled: 'Weak signal',
};

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

export const StationCard: React.FC<StationCardProps> = React.memo(({
  station, active, isPlaying, isFavorite, status, onPlay, onFavorite, onInfo, index = 0,
}) => {
  const art = React.useMemo(() => artworkFor(station.name), [station.name]);

  const live = active && status === 'playing' && isPlaying;
  const busyLabel = active && status ? BUSY_LABEL[status] : undefined;
  const failed = active && (status === 'error' || status === 'mixed-content');
  const errorLabel = status === 'mixed-content' ? 'Blocked · HTTP only' : 'Station offline';

  const meta = [station.codec, station.bitrate ? `${station.bitrate}K` : null, station.genre]
    .filter(Boolean) as string[];

  // Card entrance is staggered for the first 12 cards only; later cards (or
  // appended "load more" pages) just appear, so the list never feels slow.
  const staggerMs = index < 12 ? index * 20 : 0;

  return (
    <article
      className={`card-enter group relative flex flex-col rounded-card surface-card overflow-hidden cursor-pointer will-change-transform
        transition-[transform,box-shadow,border-color] duration-standard ease-premium
        hover:-translate-y-0.5 hover:border-line/10 active:scale-[0.98]
        ${live ? 'border-cyan/50 animate-glow-breathe' : failed ? 'border-danger/25' : ''}`}
      style={{ ['--delay' as string]: `${staggerMs}ms` }}
      onClick={() => { onPlay(station); trackClick(station.id); }}
      role="button"
      tabIndex={0}
      aria-label={`${live ? 'Pause' : 'Play'} ${station.name}`}
      aria-pressed={live}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay(station); } }}
    >
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
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" aria-hidden />

        {/* Favorite */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFavorite(station); }}
          className={`absolute top-2 right-2 z-10 grid place-items-center w-9 h-9 rounded-button backdrop-blur-md transition-colors duration-micro
            ${isFavorite ? 'text-magenta bg-magenta/15' : 'text-white/70 bg-black/25 hover:text-magenta hover:bg-black/40'}`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
        >
          <HeartIcon filled={isFavorite} />
        </button>

        {/* Play / pause overlay: visible on hover (desktop) or always (touch) */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-micro
            sm:group-hover:bg-black/30 ${live ? '' : 'sm:opacity-0 sm:group-hover:opacity-100'}`}
        >
          <span
            className={`grid place-items-center w-12 h-12 rounded-full transition-transform duration-micro ease-premium
              ${live ? 'bg-cyan text-black shadow-glow' : 'bg-white/95 text-black sm:scale-90 sm:group-hover:scale-100'}`}
          >
            {live ? <EqBars /> : isPlaying && active ? <PauseIcon /> : <PlayIcon />}
          </span>
        </div>

        {/* Status row: LIVE badge, buffering/recovering, or error */}
        {(live || busyLabel || failed) && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            {live && (
              <span className="flex items-center gap-1 rounded-chip bg-cyan text-black text-2xs font-bold uppercase tracking-[0.08em] px-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-black" />
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
        <h3 className={`text-sm font-semibold leading-tight truncate ${live ? 'text-cyan' : 'text-primary'}`}>
          {station.name}
        </h3>
        <p className="text-xs text-tertiary truncate">
          {[station.city, station.country || 'Global'].filter(Boolean).join(', ')}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-2 border-t border-line/[0.06]">
          {meta.slice(0, 3).map((m) => (
            <span key={m} className="font-mono text-[11px] text-secondary bg-raised px-1.5 py-0.5 rounded">
              {m}
            </span>
          ))}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onInfo(station); }}
            className="ml-auto grid place-items-center w-7 h-7 -mr-1 rounded text-tertiary hover:text-primary hover:bg-raised transition-colors duration-micro"
            aria-label={`Details for ${station.name}`}
          >
            <InfoIcon />
          </button>
        </div>
      </div>
    </article>
  );
});
