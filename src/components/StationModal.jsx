import React, { useEffect } from 'react';

const safeUrl = (url) => {
  if (typeof url !== 'string') return '';
  const t = url.trim();
  return /^https?:\/\//i.test(t) ? t : '';
};

export function StationModal({ station, onClose, onPlay, isPlaying }) {
  /* Backdrop click / Esc */
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!station) return null;

  const url      = safeUrl(station.url);
  const protocol = url.startsWith('https') ? 'HTTPS Protected' : url ? 'HTTP Standard' : 'Unknown Protocol';

  const copyUrl = (e) => {
    e.stopPropagation();
    if (!url) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: url });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    
    /* Toast feedback */
    const t = Object.assign(document.createElement('div'), {
      className: 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl text-[10px] font-bold text-cyan-400 border border-cyan-500/30 bg-black/90 backdrop-blur-xl shadow-2xl animate-fade-in pointer-events-none uppercase tracking-[0.2em]',
      innerText: '✓ Data Stream URL Copied',
    });
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.5s ease'; setTimeout(() => t.remove(), 500); }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center animate-fade-in overflow-hidden"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm sm:backdrop-blur-md" />
      
      <div
        className="relative w-full h-[85dvh] sm:h-auto sm:max-w-lg overflow-hidden animate-modal-up shadow-2xl flex flex-col rounded-t-[32px] sm:rounded-[32px] sm:border border-white/10"
        style={{
          background: '#050511',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-pink-500 via-cyan-500 to-pink-500 bg-[length:200%_auto] animate-gradient" />
        
        {/* Close Button Float (Always Reachable) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Mobile Drag Indicator */}
        <div className="flex justify-center pt-8 pb-2 sm:hidden shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        {/* Scrollable Area (Deep bottom padding for mobile clearance) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 pb-48 sm:pb-8">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-[9px] font-mono font-bold text-white/30 tracking-[0.2em] uppercase">Frequency Details</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight mb-1">
              {station.name}
            </h2>
            <p className="text-[10px] font-mono text-cyan-400 mt-1 uppercase tracking-[0.2em] font-bold">
              {station.country || 'Global Sector'} • {station.city || 'Orbital Station'}
            </p>
          </div>

          {/* Visualization Placeholder / Artwork */}
          <div className="w-full aspect-video rounded-2xl bg-white/5 border border-white/5 mb-6 overflow-hidden relative flex items-center justify-center group/visual">
               <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-cyan-500/5" />
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10 group-hover/visual:scale-110 transition-transform duration-700">
                  <path d="M12 2v20M17 5v14M7 5v14M2 12h20"/>
               </svg>
               {/* Wave Animation (Only when playing) */}
               {isPlaying && (
                 <div className="absolute bottom-4 left-6 right-6 flex items-end gap-[1px] h-6">
                    {[...Array(32)].map((_, i) => (
                      <div key={i} className="flex-1 bg-cyan-400/40 animate-wave-pulse" style={{ height: `${20+Math.random()*80}%`, animationDelay: `${i*0.05}s` }} />
                    ))}
                 </div>
               )}
          </div>

          {/* Technical Grid (Responsive columns) */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Bitrate', value: station.bitrate ? `${station.bitrate} kbps` : 'Unknown' },
              { label: 'Codec',   value: station.codec || 'Auto' },
              { label: 'Protocol', value: url.split(':')[0].toUpperCase() || 'DATA' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-0.5">
                <span className="text-[8px] font-mono font-bold text-white/20 tracking-widest uppercase">{label}</span>
                <span className="text-[11px] font-bold text-white truncate">{value}</span>
              </div>
            ))}
          </div>

          {/* Stream Link Card */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-6 group/url">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-mono font-bold text-white/20 tracking-widest uppercase">Encryption / Security</span>
              <span className={`text-[9px] font-mono font-bold uppercase ${url.startsWith('https') ? 'text-cyan-400' : 'text-amber-500'}`}>
                {url.startsWith('https') ? '✓ SSL' : '⚠ INSECURE'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-[10px] font-mono text-white/40 truncate bg-black/40 p-2.5 rounded-xl border border-white/10 select-all">
                {url || 'Access Restricted'}
              </div>
              <button
                onClick={copyUrl}
                disabled={!url}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 transition-all active:scale-90 flex items-center justify-center shrink-0"
                title="Copy Command"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Fixed Footer Actions (Mobile) */}
        <div className="p-6 pt-2 pb-[calc(24px+env(safe-area-inset-bottom))] sm:pb-10 bg-[#050511] border-t border-white/10 sm:border-t-0 sm:bg-transparent shrink-0">
          <div className="flex gap-4 max-w-lg mx-auto">
            <button
              onClick={() => { onPlay(station); onClose(); }}
              className="flex-1 h-14 md:h-16 rounded-2xl bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold text-[10px] md:text-xs tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg shadow-pink-500/20 active:scale-[0.98] transition-all"
            >
              {isPlaying ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  LOCK FREQUENCY
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="m7 4 12 8-12 8V4z"/></svg>
                  INITIATE FEED
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
