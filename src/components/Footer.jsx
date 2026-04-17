import React from 'react';

export function Footer({ stats, countryCount }) {
  const count = stats?.total_stations || stats?.stations || 0;
  const countriesTotal = countryCount || stats?.total_countries || stats?.countries || 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[50] h-12 px-6 flex items-center justify-center bg-black/40 backdrop-blur-xl border-t border-white/5 pointer-events-none">
      <div className="flex items-center gap-6 text-[10px] md:text-xs font-mono font-bold text-white/40 tracking-[0.3em] uppercase">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ring-4 ring-cyan-400/10" />
          <span>Nebula Cast FM</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="h-3 w-[1px] bg-white/10" />
          <span>{count.toLocaleString()} Stations Active</span>
          <div className="h-3 w-[1px] bg-white/10" />
          <span>{countriesTotal.toLocaleString()} Regional Nodes</span>
        </div>
      </div>
    </footer>
  );
}
