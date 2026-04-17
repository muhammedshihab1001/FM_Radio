import React, { useState, useRef, useEffect } from 'react';

export function CountryFilter({ countries, selectedCountry, onSelect, total, query }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* Close on Esc */
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const filtered = countries.filter(c =>
    (c.country ?? '').toLowerCase().includes(filter.toLowerCase())
  );

  const label = selectedCountry || 'Global Network';

  return (
    <div className="flex items-center gap-4">
      {/* ─── Dropdown Trigger ─── */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 h-10 px-4 rounded-2xl bg-black/90 border border-white/10 hover:bg-black hover:border-cyan-500/30 backdrop-blur-3xl transition-all duration-300 active:scale-95 group shadow-lg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">{label}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
            className={`text-white/40 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        {/* ─── Dropdown Menu ─── */}
        {open && (
          <div className="absolute top-[calc(100%+8px)] left-0 w-72 h-[400px] flex flex-col rounded-3xl bg-[#050511] border border-white/20 backdrop-blur-3xl shadow-2xl animate-fade-in z-[150] overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500/50 to-cyan-500/50" />
            
            {/* Search Input In-Drop */}
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="Scan regions..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="w-full h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
              <button
                onClick={() => { onSelect(null); setOpen(false); setFilter(''); }}
                className={`w-full px-6 py-3 text-left transition-all hover:bg-white/5 flex items-center justify-between group ${!selectedCountry ? 'bg-cyan-500/10' : ''}`}
              >
                <span className={`text-xs font-bold uppercase tracking-widest ${!selectedCountry ? 'text-cyan-400' : 'text-white/60'}`}>All Countries</span>
                {!selectedCountry && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
              </button>

              {filtered.map(c => (
                <button
                  key={c.country}
                  onClick={() => { onSelect(c.country); setOpen(false); setFilter(''); }}
                  className={`w-full px-6 py-3 text-left transition-all hover:bg-white/5 flex items-center justify-between group ${selectedCountry === c.country ? 'bg-cyan-500/10' : ''}`}
                >
                  <div className="min-w-0 pr-4">
                    <span className={`text-xs font-bold uppercase tracking-widest block truncate ${selectedCountry === c.country ? 'text-cyan-400' : 'text-white/60 group-hover:text-white'}`}>
                      {c.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold text-white/20">{c.count}</span>
                    {selectedCountry === c.country && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">No matching frequencies</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Results Stats ─── */}
      <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
      <div className="hidden sm:flex items-center gap-3">
        <p className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-[0.2em] whitespace-nowrap">
          {total !== null ? (
            <>
              <span className="text-white/60">{total}</span> Nodes Located
            </>
          ) : 'Deep Scanning Network'}
        </p>
      </div>
    </div>
  );
}
