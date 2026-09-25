import React from 'react';

/**
 * Shared visual language for "this station is on air" / "this station is
 * busy", used by StationCard, MiniPlayer and StationModal so the same state
 * always looks the same everywhere. No randomness — bar heights are fixed
 * and staggered purely via CSS animation-delay, so nothing jitters on
 * unrelated re-renders (v3's MiniPlayer called Math.random() every render).
 */

const BAR_HEIGHTS = [0.5, 1, 0.65, 0.85, 0.4];

// Bars are sized as a % of the container, so it needs a real height (h-3.5 by default).
export function EqBars({ count = 3, className = 'h-3.5' }: { count?: number; className?: string }) {
  const bars = BAR_HEIGHTS.slice(0, count);
  return (
    <span className={`eq-bars ${className}`} aria-hidden>
      {bars.map((h, i) => (
        <i key={i} style={{ height: `${h * 100}%`, animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}

export function StatusDot({ tone, className = '' }: { tone: 'live' | 'busy' | 'error' | 'idle'; className?: string }) {
  const cls =
    tone === 'live'
      ? 'bg-cyan animate-pulse-dot shadow-[0_0_8px_rgb(var(--c-cyan)/.7)]'
      : tone === 'busy'
        ? 'bg-warn animate-pulse-dot'
        : tone === 'error'
          ? 'bg-danger'
          : 'bg-tertiary';
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls} ${className}`} aria-hidden />;
}
