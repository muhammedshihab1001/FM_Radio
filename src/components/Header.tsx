import React, { useState, useRef, useEffect } from 'react';
import { InstallPrompt } from './InstallPrompt';

interface HeaderProps {
  onSearch: (q: string) => void;
  searchQuery: string;
  onBack: () => void;
  onFavToggle: () => void;
  onTrending: () => void;
  onAdminToggle: () => void;
  favCount: number;
  mode: 'home' | 'search' | 'favorites' | 'trending' | 'admin';
  isPlaying: boolean;
  onRandom: () => void;
  cooldown: number;
}

const MIN_QUERY = 3; // matches useStations' actual minimum (v3's header said 2, which was wrong)

/**
 * Logo, wide search (with a `/` shortcut hint), and Trending / Shuffle /
 * Favorites actions with a clear active state. Every control is at least
 * 44×44px. The logo also answers 5 quick taps with onAdminToggle, so admin
 * is reachable on mobile too — Footer's own 5-tap only exists on desktop.
 */
export const Header: React.FC<HeaderProps> = ({
  onSearch,
  searchQuery,
  onBack,
  onFavToggle,
  onTrending,
  onAdminToggle,
  favCount,
  mode,
  onRandom,
  cooldown,
}) => {
  const [val, setVal] = useState(searchQuery ?? '');
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tapState = useRef({ n: 0, t: 0 });
  const [inputFocused, setInputFocused] = useState(false);

  // Props → local state, adjusted during render (React's recommended pattern
  // instead of a setState-in-effect, which renders twice).
  const [prevQuery, setPrevQuery] = useState(searchQuery);
  if (searchQuery !== prevQuery) {
    setPrevQuery(searchQuery);
    setVal(searchQuery ?? '');
    if (searchQuery) setSearchOpen(true);
  }
  // Leaving search (e.g. via a bottom tab) collapses the mobile search bar,
  // unless the person is typing in it right now.
  const [prevMode, setPrevMode] = useState(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    if (mode !== 'search' && !inputFocused) setSearchOpen(false);
  }

  // Phones: an empty search closes as soon as the person moves on — a tap or scroll anywhere
  // outside it, or hiding the keyboard. (iOS keeps the field focused on taps/scrolls outside it,
  // and Android's "hide keyboard" doesn't blur it, so onBlur alone isn't enough.)
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!searchOpen || val.trim() || !window.matchMedia('(max-width: 767px)').matches) return;
    const close = () => {
      setSearchOpen(false);
      inputRef.current?.blur();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) close();
    };
    const vv = window.visualViewport;
    let lastHeight = vv?.height ?? 0;
    const onViewportResize = () => {
      if (vv && vv.height > lastHeight + 120) close(); // the on-screen keyboard went away
      lastHeight = vv?.height ?? lastHeight;
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    vv?.addEventListener('resize', onViewportResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      vv?.removeEventListener('resize', onViewportResize);
    };
  }, [searchOpen, val]);

  // Focus only when the person opens search; the input's onFocus opens the bar.
  // (Focusing on every open would also refocus after submit and re-raise the
  // mobile keyboard over the results.)
  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      inputRef.current?.blur();
    } else {
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(val);
    setSearchOpen(false);
    inputRef.current?.blur();
  };

  const onLogoClick = () => {
    const now = Date.now();
    tapState.current = now - tapState.current.t < 800 ? { n: tapState.current.n + 1, t: now } : { n: 1, t: now };
    if (tapState.current.n >= 5) {
      tapState.current = { n: 0, t: 0 };
      onAdminToggle();
      return;
    }
    onBack();
  };

  const tooShort = val.trim().length > 0 && val.trim().length < MIN_QUERY;

  const actionBtn = (active: boolean, activeTone: 'cyan' | 'magenta') =>
    `relative flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] px-2.5 md:px-3 rounded-button border transition-colors duration-standard ease-premium ${
      active
        ? activeTone === 'cyan'
          ? 'bg-cyan-dim border-cyan/40 text-cyan'
          : 'bg-magenta-dim border-magenta/40 text-magenta-ink'
        : 'bg-raised border-line/10 text-secondary hover:text-primary hover:border-line/20'
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-[100] px-3 pt-[max(12px,env(safe-area-inset-top))] md:px-6 pointer-events-none">
      <div className="max-w-[1600px] mx-auto flex h-14 md:h-16 items-center justify-between gap-2 pointer-events-auto rounded-card surface-raised px-3 md:px-5">
        {/* Logo (on mobile, an open search takes the whole bar) */}
        <button
          type="button"
          onClick={onLogoClick}
          className={`${searchOpen ? 'hidden md:flex' : 'flex'} items-center gap-2.5 min-w-[44px] min-h-[44px] rounded-button px-1.5 shrink-0`}
          aria-label="Nebula Cast FM — home"
        >
          <span
            className="grid place-items-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-cyan to-magenta shrink-0"
            aria-hidden
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#06060B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5v14M7 5v14M2 12h20" />
            </svg>
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="text-sm font-semibold tracking-[-0.01em] text-primary">Nebula Cast</span>{' '}
            <span className="text-2xs font-mono text-tertiary tracking-wide">FM</span>
          </span>
        </button>

        {/* Search */}
        <div
          className={`flex items-center ${searchOpen ? 'flex-1 md:justify-center' : 'flex-none md:flex-1 md:justify-center'}`}
        >
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className={`relative flex items-center ${searchOpen ? 'w-full md:max-w-md' : 'w-0 md:w-full md:max-w-md'}`}
          >
            {/* On mobile the bottom tab bar's Search tab opens search, so this
                button only shows there as the "close search" back arrow. */}
            <button
              type="button"
              onClick={toggleSearch}
              className={`items-center justify-center min-w-[44px] min-h-[44px] shrink-0 text-tertiary hover:text-primary transition-colors ${searchOpen ? 'flex md:pointer-events-none' : 'hidden md:flex'}`}
              aria-label={searchOpen ? 'Close search' : 'Search stations'}
            >
              {searchOpen ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  className="md:hidden"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              ) : null}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                className={searchOpen ? 'hidden md:block' : ''}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>

            <input
              id="searchInput"
              ref={inputRef}
              type="text"
              placeholder="Search stations…"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onFocus={() => {
                setInputFocused(true);
                setSearchOpen(true);
              }}
              onBlur={() => {
                setInputFocused(false);
                if (!val) setSearchOpen(false);
              }}
              className={`bg-base border border-line/10 rounded-button pl-2 pr-9 text-[16px] md:text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-cyan/40 transition-[width,opacity] duration-standard ease-premium ${
                searchOpen
                  ? 'flex-1 h-11 opacity-100'
                  : 'w-0 opacity-0 pointer-events-none md:w-full md:h-11 md:opacity-100 md:pointer-events-auto'
              }`}
            />

            {/* `/` shortcut hint, desktop only, hidden once typing or focused */}
            {!searchOpen && (
              <kbd className="hidden md:flex absolute right-3 items-center justify-center h-5 min-w-[20px] px-1.5 rounded border border-line/15 bg-overlay font-mono text-2xs text-tertiary pointer-events-none">
                /
              </kbd>
            )}

            {val && searchOpen && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setVal('');
                  onSearch('');
                  inputRef.current?.focus();
                }}
                className="absolute right-0 flex items-center justify-center w-11 h-11 text-tertiary hover:text-primary"
                aria-label="Clear search"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}

            {tooShort && (
              <p
                role="status"
                className="absolute top-[calc(100%+8px)] left-0 right-0 px-3 py-2 rounded-button surface-raised text-xs text-secondary text-center"
              >
                Type at least {MIN_QUERY} characters
              </p>
            )}
          </form>
        </div>

        {/* Actions */}
        <div className={`${searchOpen ? 'hidden md:flex' : 'flex'} items-center gap-1.5 md:gap-2 shrink-0`}>
          {/* First, so the Install button fading in (Chrome/Edge fire their install event a moment
              after load) never pushes the other actions sideways. */}
          <InstallPrompt />
          {/* A plain link rather than Buy Me a Coffee's script/widget: no third-party JS or
              tracking, nothing floating over the player. Inside, an endless reel of icons glides
              by under a soft breathing glow; pointing at it stops on the cup (CSS-only; a still cup
              under reduced motion). */}
          <a
            href="https://buymeacoffee.com/muhammedshihab1001"
            target="_blank"
            rel="noopener noreferrer"
            className="coffee-glow relative flex items-center justify-center min-w-[44px] min-h-[44px] px-2.5 md:px-3 rounded-button border bg-raised border-line/10 text-warn hover:border-warn/40 transition-colors duration-standard ease-premium"
            aria-label="Buy me a coffee (opens in a new tab)"
            title="Buy me a coffee"
          >
            {/* An endless reel of line icons: cup → smile → music → headphones → sparkles → cup.
                The last icon repeats the first, so the loop is seamless. */}
            <span className="coffee-reel" aria-hidden>
              <span className="coffee-reel-track">
                <svg
                  className="text-warn"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 2v2" />
                  <path d="M14 2v2" />
                  <path d="M6 2v2" />
                  <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
                </svg>
                <svg
                  className="text-warn"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <path d="M9 9.5h.01" />
                  <path d="M15 9.5h.01" />
                </svg>
                <svg
                  className="text-cyan"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <svg
                  className="text-magenta"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
                </svg>
                <svg
                  className="text-warn"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 3 12.9 8.1 18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9Z" />
                  <path d="M19 15v4" />
                  <path d="M17 17h4" />
                </svg>
                <svg
                  className="text-warn"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 2v2" />
                  <path d="M14 2v2" />
                  <path d="M6 2v2" />
                  <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
                </svg>
              </span>
            </span>
          </a>
          {/* Charts / Shuffle / Favorites live in BottomTabBar on mobile. */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={onTrending}
              className={actionBtn(mode === 'trending', 'cyan')}
              aria-pressed={mode === 'trending'}
              aria-label="Top charts"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span className="hidden lg:inline text-xs font-medium">Charts</span>
            </button>

            <button
              type="button"
              onClick={onRandom}
              disabled={cooldown > 0}
              className={`${actionBtn(false, 'cyan')} disabled:opacity-40 disabled:cursor-wait`}
              aria-label={cooldown > 0 ? `Shuffle available in ${cooldown}s` : 'Shuffle to a random country'}
            >
              {cooldown > 0 ? (
                <span className="font-mono text-xs tabular">{cooldown}s</span>
              ) : (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m18 14 4 4-4 4" />
                  <path d="m18 2 4 4-4 4" />
                  <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
                  <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
                  <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
                </svg>
              )}
              <span className="hidden lg:inline text-xs font-medium">Shuffle</span>
            </button>

            <button
              type="button"
              onClick={onFavToggle}
              className={actionBtn(mode === 'favorites', 'magenta')}
              aria-pressed={mode === 'favorites'}
              aria-label={`Favorites, ${favCount} saved`}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill={mode === 'favorites' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              {favCount > 0 && <span className="font-mono text-2xs tabular">{favCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
