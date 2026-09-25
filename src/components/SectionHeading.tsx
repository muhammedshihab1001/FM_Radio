import React from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** Small animated dot next to the title, used for the live trending view. */
  live?: boolean;
}

/**
 * One heading pattern used by every view: title, mono subtitle (station
 * count etc.), a small accent line and an optional live dot. Keeps
 * Home/Country/Search/Trending/Favorites visually consistent instead of each
 * view improvising its own heading. (Wrapper classes are mirrored by the
 * static shell in index.html — change both together.)
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, live }) => (
  <div className="card-enter mb-7 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        {live && (
          <span className="relative flex w-2 h-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
          </span>
        )}
        <h1 className="text-[clamp(1.25rem,1rem+1.2vw,1.75rem)] font-semibold tracking-[-0.02em] text-primary truncate">
          {title}
        </h1>
      </div>
      <div className="h-[3px] w-10 rounded-full bg-gradient-to-r from-cyan to-magenta mt-2.5 mb-2" aria-hidden />
      {/* Line is always reserved so the grid doesn't jump when the count arrives. */}
      <p className="font-mono text-xs text-tertiary tabular min-h-[18px]" aria-hidden={!subtitle}>
        {subtitle}
      </p>
    </div>
  </div>
);
