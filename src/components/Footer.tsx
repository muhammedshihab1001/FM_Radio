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
    <footer className="fixed bottom-0 left-0 right-0 z-[50] h-12 px-4 md:px-6 flex items-center justify-center bg-black/60 backdrop-blur-2xl border-t border-white/5 pointer-events-none">
      <div className="flex items-center gap-4 md:gap-8 text-[9px] md:text-xs font-mono font-bold text-white/40 tracking-[0.2em] md:tracking-[0.3em] uppercase transition-all">
        <div
          onClick={handleBrandClick}
          className="flex items-center gap-2 text-left pointer-events-auto cursor-default active:scale-95 transition-transform shrink-0"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ring-4 ring-cyan-400/10" />
          <span className="hidden xs:inline">Nebula Cast</span>
          <span className="xs:hidden">NC</span>
          <span>FM</span>
        </div>
        <div className="flex items-center gap-3 md:gap-6 overflow-x-auto no-scrollbar pointer-events-auto">
          <div className="hidden sm:block h-3 w-[1px] bg-white/10 shrink-0" />
          <span className="whitespace-nowrap">{count.toLocaleString()} Stations</span>
          <div className="h-3 w-[1px] bg-white/10 shrink-0" />
          <span className="whitespace-nowrap">{countriesTotal.toLocaleString()} Regions</span>
          <div className="h-3 w-[1px] bg-white/10 shrink-0" />
          <button
            onClick={onAdminClick}
            className="hover:text-cyan-400 transition-colors uppercase whitespace-nowrap"
            aria-label="Administrative Access"
            title="Administrative Access"
          >
            Admin
          </button>
        </div>
      </div>
    </footer>
  );
}
