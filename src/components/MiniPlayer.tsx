import React, { useState } from 'react';
import { Station, PlayerStatus } from '../types/terminal';

const STATUS_LABEL: Record<string, string> = {
  idle:       'Ready',
  connecting: 'Locking…',
  playing:    'Live Transmission',
  buffering:  'Buffering…',
  error:      'Offline',
};

interface MiniPlayerProps {
  station: Station;
  isPlaying: boolean;
  status: PlayerStatus;
  volume: number;
  onToggle: () => void;
  onVolumeChange: (v: number) => void;
  onFavorite: () => void;
  isFavorite: boolean;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = React.memo(({ 
  station, isPlaying, status, volume, onToggle, onVolumeChange, onFavorite, isFavorite 
}) => {
  const [volOpen, setVolOpen] = useState(false);
  
  if (!station) return null;

  const label    = STATUS_LABEL[status] ?? 'Ready';
  const isLive   = status === 'playing' && isPlaying;
  const isErr    = status === 'error';

  return (
    <div className="relative group/player animate-slide-up pointer-events-auto w-full">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/30 via-cyan-500/30 to-purple-500/30 rounded-[2.5rem] blur-xl opacity-30 group-hover/player:opacity-60 transition duration-1000" />
      
      <div className="relative h-16 md:h-20 px-4 md:px-6 rounded-[1.5rem] md:rounded-[2rem] bg-black/60 border border-white/10 backdrop-blur-3xl flex items-center justify-between shadow-2xl overflow-hidden group/dock mb-[env(safe-area-inset-bottom)]">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative group/logo">
              {isPlaying && !isErr ? (
                <div className="flex items-end gap-[2px] h-4 md:h-5">
                  {[0.4, 0.8, 0.5, 1.0].map((h, i) => (
                    <div 
                      key={i} 
                      className="w-1 rounded-full bg-cyan-400 animate-signal-bounce"
                      style={{ 
                        height: `${h * 100}%`, 
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.6 + i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
             ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/20">
                  <path d="M12 2v20M17 5v14M7 5v14M2 12h20"/>
                </svg>
             )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs md:text-sm font-bold text-white truncate leading-tight pr-2">
              {station.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
              <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isErr ? 'bg-red-500' : isLive ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-white/20'}`} />
              <p className="text-[8px] md:text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.1em] md:tracking-[0.2em] truncate">
                {label} • {station.country || 'Global'}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 items-center gap-1 mx-8 h-8 max-w-sm">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 min-w-[2px] rounded-full transition-all duration-500 ${isLive ? 'bg-cyan-400/30 animate-wave-pulse' : 'bg-white/5'}`}
              style={{ 
                height: isLive ? `${30 + Math.random() * 70}%` : '20%',
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${0.4 + (i % 5) * 0.1}s`
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="flex items-center">
            <div className={`overflow-hidden transition-all duration-300 flex items-center bg-white/5 md:bg-transparent rounded-full ${volOpen ? 'w-24 px-3 mr-2 border border-white/10 md:border-0' : 'w-0 md:w-auto'}`}>
              <input
                type="range"
                min="0" max="1" step="0.01"
                value={volume}
                onChange={e => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 md:w-24 h-1 cursor-pointer appearance-none rounded-full bg-white/20 md:bg-white/10 accent-cyan-400"
                aria-label="Volume"
              />
            </div>
            <button 
              onClick={() => setVolOpen(!volOpen)}
              className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-cyan-400 transition-colors md:hidden"
              aria-label="Toggle Volume"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>}
              </svg>
            </button>
            <div className="hidden md:flex w-8 h-8 items-center justify-center text-white/20">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              </svg>
            </div>
          </div>

          <button
            onClick={onFavorite}
            className={`hidden sm:flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl border transition-all duration-300 ${
              isFavorite 
              ? 'bg-pink-500/20 border-pink-500/50 text-pink-500' 
              : 'bg-white/5 border-white/10 text-white/40 hover:text-pink-500'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="3">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>

          <button
            onClick={onToggle}
            className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-pink-500 to-cyan-500 p-[1px] group/play active:scale-95 transition-all shadow-lg shadow-pink-500/10"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <div className="w-full h-full rounded-xl md:rounded-2xl bg-black/40 flex items-center justify-center text-white backdrop-blur-sm group-hover/play:bg-transparent transition-colors">
              {isPlaying && !isErr ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] md:w-[20px] md:h-[20px]">
                  <rect x="6"  y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] ml-0.5">
                  <path d="m7 4 12 8-12 8V4z"/>
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});
