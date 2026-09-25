import React from 'react';

interface BottomTabBarProps {
  mode: 'home' | 'search' | 'favorites' | 'trending' | 'admin';
  favCount: number;
  onHome: () => void;
  onTrending: () => void;
  onRandom: () => void;
  onFavorites: () => void;
  onSearch: () => void;
  cooldown: number;
}

/**
 * The app's only navigation on mobile (Header drops its action buttons below
 * md). Every handler reuses an existing App.tsx callback. Height comes from the
 * 56px buttons, with the safe-area inset added below them — a fixed height on
 * the nav itself would eat the inset out of the tabs (border-box sizing).
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  mode,
  favCount,
  onHome,
  onTrending,
  onRandom,
  onFavorites,
  onSearch,
  cooldown,
}) => {
  const tab = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-1 flex-1 h-14 transition-colors duration-micro ${
      active ? 'text-cyan' : 'text-tertiary active:text-primary'
    }`;
  const indicator = (active: boolean) =>
    active ? <span className="absolute top-0 inset-x-[30%] h-0.5 rounded-full bg-cyan" aria-hidden /> : null;
  const label = 'text-2xs font-medium leading-none';

  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 z-[100] flex items-stretch pb-[env(safe-area-inset-bottom)] bg-base/95 backdrop-blur-md border-t border-line/[0.08]"
    >
      <button
        type="button"
        onClick={onHome}
        className={tab(mode === 'home')}
        aria-current={mode === 'home' ? 'page' : undefined}
      >
        {indicator(mode === 'home')}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
        <span className={label}>Home</span>
      </button>

      <button
        type="button"
        onClick={onTrending}
        className={tab(mode === 'trending')}
        aria-current={mode === 'trending' ? 'page' : undefined}
      >
        {indicator(mode === 'trending')}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <span className={label}>Charts</span>
      </button>

      <button
        type="button"
        onClick={onRandom}
        disabled={cooldown > 0}
        className={`${tab(false)} disabled:opacity-40`}
        aria-label={cooldown > 0 ? `Shuffle available in ${cooldown}s` : 'Shuffle to a random country'}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m18 14 4 4-4 4" />
          <path d="m18 2 4 4-4 4" />
          <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
          <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
          <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
        </svg>
        <span className={`${label} tabular`}>{cooldown > 0 ? `${cooldown}s` : 'Shuffle'}</span>
      </button>

      <button
        type="button"
        onClick={onFavorites}
        className={tab(mode === 'favorites')}
        aria-current={mode === 'favorites' ? 'page' : undefined}
        aria-label={`Saved stations, ${favCount}`}
      >
        {indicator(mode === 'favorites')}
        <span className="relative">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={mode === 'favorites' ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          {favCount > 0 && (
            <span
              className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-magenta text-[10px] leading-4 text-center text-on-accent font-semibold tabular"
              aria-hidden
            >
              {favCount > 99 ? '99+' : favCount}
            </span>
          )}
        </span>
        <span className={label}>Saved</span>
      </button>

      <button
        type="button"
        onClick={onSearch}
        className={tab(mode === 'search')}
        aria-current={mode === 'search' ? 'page' : undefined}
      >
        {indicator(mode === 'search')}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className={label}>Search</span>
      </button>
    </nav>
  );
};
