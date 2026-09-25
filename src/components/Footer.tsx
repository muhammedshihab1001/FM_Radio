import React from 'react';
import type { Statistics } from '../types/terminal';

interface FooterProps {
  stats: Statistics | null;
  stationCount: number;
  countryCount: number;
  onAdminClick: () => void;
}

/**
 * Quiet status bar. Desktop-only — on mobile the bottom tab bar (Part 3)
 * takes the bottom edge, and admin is reachable there via 5 taps on the
 * Header logo instead, so nothing is lost.
 */
export const Footer: React.FC<FooterProps> = ({ stationCount, countryCount, onAdminClick }) => {
  return (
    <footer className="hidden md:flex fixed bottom-0 inset-x-0 z-40 h-11 px-6 items-center justify-center bg-base/90 backdrop-blur-md border-t border-line/[0.06] pointer-events-none">
      <div className="flex items-center gap-5 font-mono text-2xs text-tertiary tabular">
        <span className="flex items-center gap-2 select-none shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan" aria-hidden />
          Nebula Cast FM
        </span>
        <span className="w-px h-3 bg-line/15" aria-hidden />
        <span>{stationCount.toLocaleString()} stations</span>
        <span className="w-px h-3 bg-line/15" aria-hidden />
        <span>{countryCount.toLocaleString()} regions</span>
        <span className="w-px h-3 bg-line/15" aria-hidden />
        <button
          type="button"
          onClick={onAdminClick}
          className="pointer-events-auto hover:text-cyan transition-colors min-h-[44px] -my-3"
          aria-label="Admin"
        >
          Admin
        </button>
      </div>
    </footer>
  );
};
