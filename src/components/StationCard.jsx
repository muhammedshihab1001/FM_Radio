import React from 'react';

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
      <path d="m7 4 12 8-12 8V4z"/>
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="transition-transform group-active:scale-95">
      <rect x="6"  y="4" width="4" height="16" rx="2"/>
      <rect x="14" y="4" width="4" height="16" rx="2"/>
    </svg>
  );
}

export function StationCard({ station, active, isPlaying, isFavorite, status, onPlay, onFavorite, onInfo, index = 0 }) {
  const isError    = status === 'error' && active;
  const isBuffering = (status === 'connecting' || status === 'buffering') && active;

  return (
    <div
      onClick={() => onPlay(station)}
      className={`group relative flex flex-col rounded-3xl cursor-pointer overflow-hidden transform-gpu transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20 active:scale-[0.98] animate-fade-in min-h-[180px]`}
      style={{ 
        animationFillMode: 'both',
        animationDelay: `${index * 50}ms`
      }}
      role="button"
      tabIndex={0}
      aria-label={`Play ${station.name}`}
      onKeyDown={e => e.key === 'Enter' && onPlay(station)}
    >
      {/* ─── Glass Background ─── */}
      <div className={`absolute inset-0 bg-white/5 border border-white/10 backdrop-blur-2xl transition-colors duration-300 group-hover:bg-white/10 ${active && !isError ? 'border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.2)]' : ''}`} />
      
      {/* ─── Aurora Glow (Visible on selection) ─── */}
      {active && !isError && (
        <div className="absolute -inset-20 bg-gradient-to-r from-pink-500/20 to-cyan-500/20 blur-[80px] animate-pulse pointer-events-none" />
      )}

      {/* ─── Favorite Trigger (Top Right) ─── */}
      <button
        onClick={e => { e.stopPropagation(); onFavorite(station); }}
        className={`absolute top-2 right-2 z-10 w-[44px] h-[44px] flex items-center justify-center rounded-2xl transition-all duration-300 ${
          isFavorite ? 'text-pink-500 bg-pink-500/10' : 'text-white/10 hover:text-pink-500 hover:bg-white/5'
        }`}
        aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
      </button>

      <div className="relative p-5 md:p-6 flex flex-col h-full gap-4">
        {/* ─── Top Row: Meta ─── */}
        <div className="flex flex-wrap gap-2 pr-10">
          {station.codec && (
            <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-mono font-bold tracking-widest text-white/50 uppercase">
              {station.codec}
            </span>
          )}
          {station.bitrate && (
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              {station.bitrate}K
            </span>
          )}
          {isError && (
            <span className="px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40 text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase">
              OFFLINE
            </span>
          )}
        </div>

        {/* ─── Middle: Content ─── */}
        <div className="flex-1">
          <h3 className={`text-base md:text-lg font-bold leading-tight line-clamp-2 transition-all duration-300 ${
            isPlaying && !isError ? 'text-white' : 'text-white/70'
          }`}>
            {station.name}
          </h3>
          <p className="text-[11px] md:text-xs font-mono text-white/40 mt-2 font-bold uppercase tracking-[0.2em] truncate">
            {station.country || 'Global'}{station.genre ? ` • ${station.genre}` : ''}
          </p>
        </div>

        {/* ─── Bottom: Controls ─── */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <div className={`w-[44px] h-[44px] rounded-xl flex items-center justify-center transition-all duration-500 ${
            active && !isError 
            ? 'bg-gradient-to-br from-pink-500 to-cyan-500 shadow-lg shadow-pink-500/20' 
            : 'bg-white/5 text-white/30 group-hover:bg-cyan-500/10 group-hover:text-cyan-400'
          }`}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </div>

          <div className="flex flex-col items-end gap-1.5 min-w-[60px]">
            {isPlaying && (
              <div className="flex items-end gap-[3px] h-3 mb-1">
                {[0.4, 0.7, 1.0, 0.6].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-cyan-400 animate-signal-bounce"
                    style={{ 
                      height: '100%', 
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: `${0.6 + i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); onInfo(station); }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-end text-[10px] md:text-xs font-mono font-bold text-white/40 hover:text-cyan-400 transition-colors uppercase tracking-[0.3em] touch-manipulation"
            >
              DETAILS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
