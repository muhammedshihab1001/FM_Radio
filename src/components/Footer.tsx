import React from 'react';
import { Statistics } from '../types/terminal';

interface FooterProps {
  stats: Statistics | null;
  countryCount: number;
  onAdminClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ stats, countryCount, onAdminClick }) => {
  const [clickCount, setClickCount] = React.useState(0);
  const count = stats?.total ?? stats?.total_stations ?? stats?.stations ?? 0;
  const countriesTotal = countryCount || stats?.total_countries || stats?.countries || 0;

  const handleBrandClick = () => {
    const next = clickCount + 1;
    if (next >= 5) {
      onAdminClick();
      setClickCount(0);
    } else {
      setClickCount(next);
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[50] h-12 px-6 flex items-center justify-center bg-black/40 backdrop-blur-xl border-t border-white/5 pointer-events-none">
      <div className="flex items-center gap-6 text-[10px] md:text-xs font-mono font-bold text-white/40 tracking-[0.3em] uppercase transition-all">
        <div
          onClick={handleBrandClick}
          className="flex items-center gap-2 text-left pointer-events-auto cursor-default active:scale-95 transition-transform"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ring-4 ring-cyan-400/10" />
          <span>Nebula Cast FM</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar pointer-events-auto pr-4">
          <div className="hidden xs:block h-3 w-[1px] bg-white/10 shrink-0" />
          <span className="whitespace-nowrap">{count.toLocaleString()} Stations</span>
          <div className="h-3 w-[1px] bg-white/10 shrink-0" />
          <span className="whitespace-nowrap">{countriesTotal.toLocaleString()} Nodes</span>
          <div className="h-3 w-[1px] bg-white/10 shrink-0" />
          <button
            onClick={onAdminClick}
            className="hover:text-amber-500 transition-colors uppercase whitespace-nowrap"
            aria-label="Administrative Console"
            title="Administrative Console"
          >
            Terminal
          </button>
        </div>
      </div>
    </footer>
  );
}
