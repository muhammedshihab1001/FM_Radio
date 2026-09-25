// deploy: 2026-05-12 v8 — Global Top Charts heading for trending page
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useStations } from './hooks/useStations';
import { usePlayer } from './hooks/usePlayer';
import { useFavorites } from './hooks/useFavorites';
import { Header } from './components/Header';
import { CountryFilter } from './components/CountryFilter';
import { StationCard } from './components/StationCard';
import { MiniPlayer } from './components/MiniPlayer';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SectionHeading } from './components/SectionHeading';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomTabBar } from './components/BottomTabBar';
import { UpdateToast } from './components/UpdateToast';
import type { Station } from './types/terminal';

const API = import.meta.env.VITE_API_BASE_URL;

/* ─── Skeleton Grid: mirrors StationCard's real layout exactly, so there's zero CLS ─── */
const SkeletonCard: React.FC<{ index: number }> = ({ index }) => (
  <div
    className="card-enter rounded-card surface-card overflow-hidden"
    style={{ ['--delay' as string]: `${Math.min(index, 11) * 20}ms` }}
    aria-hidden
  >
    <div className="aspect-square w-full shimmer" />
    <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5">
      <div className="h-4 w-3/5 rounded bg-raised" />
      <div className="h-3 w-2/5 rounded bg-raised" />
      <div className="flex items-center gap-1.5 mt-1.5 pt-2 border-t border-line/[0.06]">
        <div className="h-5 w-10 rounded bg-raised" />
        <div className="h-5 w-8 rounded bg-raised" />
        <div className="ml-auto w-7 h-7 rounded bg-raised" />
      </div>
    </div>
  </div>
);

// Rarely-opened parts load on demand, keeping them out of the initial bundle.
const AdminPanel = lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const StationModal = lazy(() => import('./components/StationModal').then((m) => ({ default: m.StationModal })));

const PanelSpinner = () => (
  <div className="flex justify-center py-24" role="status" aria-label="Loading">
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin text-tertiary"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  </div>
);

/* Grid columns: 2 on phones, 3 on tablet, 4 on laptop, 5 on desktop, 6 on large desktop. */
const GRID_CLASS = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4';

const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 24 }) => (
  <div className={GRID_CLASS} role="status" aria-label="Loading stations">
    <span className="sr-only">Loading stations…</span>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} index={i} />
    ))}
  </div>
);

/* ─── Empty State: line-art SVG, one plain sentence, one action ─── */
interface EmptyStateProps {
  onReset: () => void;
  isFavs: boolean;
  isRandom: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onReset, isFavs, isRandom }) => (
  <div className="card-enter flex flex-col items-center justify-center py-24 sm:py-32 text-center">
    <div className="grid place-items-center w-20 h-20 rounded-full surface-raised mb-6" aria-hidden>
      {isFavs ? (
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-tertiary"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      ) : (
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-tertiary"
        >
          <path d="M4 15a6 6 0 0 1 0-6M8 17.5a10 10 0 0 1 0-11M16 6.5a10 10 0 0 1 0 11M20 9a6 6 0 0 1 0 6" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      )}
    </div>
    <h2 className="text-base font-semibold text-primary mb-1.5">
      {isFavs ? 'Nothing saved yet' : 'No stations found'}
    </h2>
    <p className="text-sm text-tertiary max-w-xs mb-6 leading-relaxed">
      {isFavs
        ? 'Tap the heart on any station to save it here.'
        : isRandom
          ? "Couldn't reach the discovery feed. Try another shuffle."
          : 'That search or country turned up nothing. Try a different one.'}
    </p>
    <button
      type="button"
      onClick={onReset}
      className="min-h-[44px] px-6 rounded-button bg-cyan text-on-accent text-sm font-medium transition-transform active:scale-[0.98]"
    >
      {isFavs ? 'Browse stations' : 'Back to Estonia'}
    </button>
  </div>
);

/* ─── Ambient backdrop: one static, low-opacity glow behind the header. No
   state, no scroll listener (v3's Background re-rendered on every scroll
   event and stacked three moving aurora blobs under a 100px blur). ─── */
const Backdrop: React.FC = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden>
    <div
      className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[140%] max-w-[1400px] aspect-[2/1] opacity-[0.14]"
      style={{
        background: 'radial-gradient(closest-side, rgb(var(--c-cyan)) 0%, transparent 70%)',
        filter: 'blur(120px)',
      }}
    />
  </div>
);

/* ─── Errors from the API layer are technical ("Failed to fetch", "Signal
   Timeout — Network Hub Unreachable"); show people what happened in plain words. ─── */
function friendlyError(raw: string): string {
  if (/timeout/i.test(raw)) return 'The station directory is taking too long to answer.';
  if (/failed to fetch|networkerror|load failed|offline|unreachable/i.test(raw))
    return "Can't reach the station directory. Check your connection.";
  if (/non-json|invalid signal format/i.test(raw)) return "The station directory sent a response we couldn't read.";
  if (/quota/i.test(raw)) return 'The station directory is busy right now.';
  if (/rate limited|\b429\b|too many requests/i.test(raw))
    return 'Too many requests right now. Wait a few seconds, then try again.';
  return raw;
}

/* ─── A callback with a permanent identity that always runs the latest closure.
   The station grid is memoised; handing it callbacks that change on every player
   status or favorite change would re-render every card each time. ─── */
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

/* ─── Missing configuration: shown instead of the app, before any data hook runs ─── */
const ConfigError = () => (
  <div className="min-h-dvh bg-base flex items-center justify-center p-6 text-center">
    <div className="max-w-sm space-y-5 animate-fade-in">
      <div className="grid place-items-center w-16 h-16 rounded-full surface-raised mx-auto">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="text-danger"
        >
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-primary">Can't reach the station directory</h1>
      <p className="text-sm text-tertiary leading-relaxed">
        No API endpoint is configured (<code className="font-mono text-xs">VITE_API_BASE_URL</code>). Check the
        environment and rebuild.
      </p>
    </div>
  </div>
);

export default function App() {
  return API ? <RadioApp /> : <ConfigError />;
}

/* ─── Main App ─── */
function RadioApp() {
  const {
    stations,
    countries,
    stats,
    loading,
    error,
    warning,
    query,
    country,
    isTrending,
    hasMore,
    cooldown,
    stationCount,
    countryCount,
    search,
    filterByCountry,
    toggleTrending,
    fetchRandom,
    loadMore,
    reset,
  } = useStations();

  const { currentStation, isPlaying, status, volume, play, toggle, setVolume } = usePlayer();
  const { isFav, toggleFav, favCount, favList } = useFavorites();

  const [mode, setMode] = useState<'home' | 'favorites' | 'admin'>('home');
  const [infoStation, setInfoStation] = useState<Station | null>(null);
  const [scrollTop, setScrollTop] = useState<boolean>(false);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName ?? '';
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || !!el?.isContentEditable;
      // Space on a focused button/link must activate *that* control, not the player.
      const isControl = isInput || tag === 'BUTTON' || tag === 'A' || !!el?.closest('[role="option"],[role="dialog"]');

      if (e.shiftKey && e.key === 'A' && !isInput) {
        e.preventDefault();
        setMode((m) => (m === 'admin' ? 'home' : 'admin'));
        return;
      }

      if (e.code === 'Space' && !isControl) {
        e.preventDefault();
        if (currentStation) toggle(currentStation);
        return;
      }
      if (e.key === 'Escape') {
        if (infoStation) {
          setInfoStation(null);
          return;
        }
        return;
      }
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [currentStation, toggle, infoStation]);

  // First commit done: the HTML shell has been replaced without re-animating,
  // so later content (station cards, panels) may use its entrance animation again.
  useEffect(() => {
    const id = requestAnimationFrame(() => document.documentElement.classList.remove('no-enter'));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ─── Scroll to top visibility: an observer on a 380px sentinel, not a scroll listener ─── */
  const topSentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = topSentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setScrollTop(!!entry && !entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      setMode('home');
      search(q);
    },
    [search],
  );

  const handleCountry = useCallback(
    (c: string | null) => {
      setMode('home');
      filterByCountry(c);
    },
    [filterByCountry],
  );

  const handleRandom = useCallback(() => {
    setMode('home');
    fetchRandom();
  }, [fetchRandom]);

  const handleBack = useCallback(() => {
    setMode('home');
    reset();
  }, [reset]);

  const handleFavToggle = useCallback(() => {
    setMode((m) => (m === 'favorites' ? 'home' : 'favorites'));
  }, []);

  const handleAdminToggle = useCallback(() => {
    setMode((m) => (m === 'admin' ? 'home' : 'admin'));
  }, []);

  // toggle() on a station that just failed only calls play() on the errored
  // <audio>, which browsers don't re-fetch (STANDARDS_REPORT BUG-13), so a
  // failed station is restarted with a fresh play() instead.
  const failed = status === 'error' || status === 'stalled';
  const handlePlay = useCallback(
    (s: Station) => {
      if (failed && currentStation?.url === s.url) void play(s);
      else toggle(s);
    },
    [failed, currentStation, play, toggle],
  );
  const stablePlay = useStableCallback(handlePlay);
  const stableFav = useStableCallback(toggleFav);
  const retry = useCallback(() => {
    if (currentStation) void play(currentStation);
  }, [currentStation, play]);

  const handleTrending = useCallback(() => {
    setMode('home');
    toggleTrending();
  }, [toggleTrending]);

  const isHomeDiscovery = !query && !country && !isTrending && mode === 'home';
  const displayMode = useMemo(() => {
    if (mode === 'admin') return 'admin';
    if (mode === 'favorites') return 'favorites';
    if (isTrending) return 'trending';
    return isHomeDiscovery ? 'home' : query || country ? 'search' : 'home';
  }, [mode, isHomeDiscovery, query, country, isTrending]);

  // The bottom tab bar only highlights Search while a query is active; the
  // default Estonia view (a country selection) is Home.
  const tabMode = mode === 'favorites' ? 'favorites' : isTrending ? 'trending' : query ? 'search' : 'home';

  const list = useMemo(() => {
    return mode === 'favorites' ? favList : stations;
  }, [mode, favList, stations]);

  // One heading pattern for every view, driven entirely by existing state — no new hooks.
  // Shuffle lives only in the header (desktop) and the bottom tab bar (phones), not in the heading.
  const countryStationCount = country ? countries.find((c) => c.country === country)?.count : undefined;
  const heading = (() => {
    if (mode === 'favorites') {
      return { title: 'Your stations', subtitle: `${favCount} station${favCount !== 1 ? 's' : ''} saved` };
    }
    if (isTrending) {
      return { title: 'Global Top Charts', subtitle: 'Most played across the network', live: true };
    }
    if (query) {
      return {
        title: `Results for "${query}"`,
        subtitle: `${stations.length} station${stations.length !== 1 ? 's' : ''} found`,
      };
    }
    const title = country || 'Global mix';
    const count = countryStationCount ?? (country ? stations.length : stationCount);
    return {
      title,
      subtitle: count ? `${count.toLocaleString()} stations` : undefined,
    };
  })();

  return (
    // Bottom padding mirrors the real fixed stack. Mobile: BottomTabBar (3.5rem +
    // safe-area inset) + MiniPlayer (4rem + its wrapper's 8px) + a 32px buffer.
    // Desktop: Footer (2.75rem) + 12px gap + MiniPlayer (4.5rem) + buffer = 10rem.
    <div className="min-h-dvh bg-base text-primary font-sans relative overflow-x-hidden pb-[calc(3.5rem+4rem+40px+env(safe-area-inset-bottom))] md:pb-40">
      <Backdrop />
      <div ref={topSentinel} className="absolute top-0 left-0 w-px h-[380px] pointer-events-none" aria-hidden />
      <OfflineBanner />
      <UpdateToast />

      <Header
        onSearch={handleSearch}
        searchQuery={query}
        onBack={handleBack}
        onFavToggle={handleFavToggle}
        onTrending={handleTrending}
        onAdminToggle={handleAdminToggle}
        onRandom={handleRandom}
        cooldown={cooldown}
        favCount={favCount}
        mode={displayMode}
        isPlaying={isPlaying && status === 'playing'}
      />

      {/* Clears the fixed Header (h-14 mobile / h-16 desktop + its own safe-area
          padding), plus an extra 10px so the sticky CountryFilter below always
          has real breathing room instead of sitting flush against the header's
          bottom edge — a zero-gap boundary reads as "clipped" even when it
          technically isn't, and leaves no margin for measurement drift on
          real devices. Spacer and sticky top offset must stay in sync. */}
      <div
        className="h-[calc(3.5rem+max(12px,env(safe-area-inset-top))+10px)] md:h-[calc(4rem+max(12px,env(safe-area-inset-top))+10px)]"
        aria-hidden
      />

      {mode !== 'admin' && (
        <section
          aria-label="Country filter"
          className="sticky top-[calc(3.5rem+max(12px,env(safe-area-inset-top))+10px)] md:top-[calc(4rem+max(12px,env(safe-area-inset-top))+10px)] z-[90] px-3 md:px-6 pt-1 pb-2"
        >
          <div className="max-w-[1600px] mx-auto">
            <CountryFilter
              countries={countries}
              selectedCountry={country}
              onSelect={handleCountry}
              total={stationCount}
              query={query}
            />
          </div>
        </section>
      )}

      <main className="max-w-[1600px] mx-auto px-3 md:px-6 pt-8 md:pt-10 pb-6">
        {mode === 'admin' && (
          <ErrorBoundary variant="inline" onReset={handleBack}>
            <Suspense fallback={<PanelSpinner />}>
              <AdminPanel onClose={handleBack} />
            </Suspense>
          </ErrorBoundary>
        )}

        {mode !== 'admin' && <SectionHeading title={heading.title} subtitle={heading.subtitle} live={heading.live} />}

        {mode !== 'admin' && error && !loading && (
          <div
            role="alert"
            className="card-enter mb-6 flex items-center gap-3 p-4 rounded-card bg-danger/10 border border-danger/20 text-danger text-sm"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              className="shrink-0"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="flex-1">{friendlyError(error)}</span>
            <button
              type="button"
              onClick={handleBack}
              className="shrink-0 min-h-[44px] px-3.5 -my-2 -mr-1.5 rounded-button text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              {country === 'Estonia' && !query ? 'Try again' : 'Back to Estonia'}
            </button>
          </div>
        )}

        {mode !== 'admin' && warning && !loading && (
          <div
            role="status"
            className="card-enter mb-6 flex items-center gap-3 p-4 rounded-card bg-warn/10 border border-warn/20 text-warn text-sm"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              className="shrink-0"
              aria-hidden
            >
              <path d="m11 17 2 2 5-5" />
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <path d="M13 2v7h7" />
            </svg>
            {warning}
          </div>
        )}

        {mode !== 'admin' && loading && list.length === 0 && <SkeletonGrid />}

        {mode !== 'admin' && !loading && list.length === 0 && !error && (
          <EmptyState onReset={handleBack} isFavs={mode === 'favorites'} isRandom={isHomeDiscovery} />
        )}

        {mode !== 'admin' && list.length > 0 && (
          <>
            <div className={GRID_CLASS}>
              {list.map((station, index) => (
                <StationCard
                  key={station.id ?? station.url ?? index}
                  station={station}
                  index={index}
                  active={currentStation?.url === station.url}
                  isPlaying={currentStation?.url === station.url && isPlaying}
                  isFavorite={isFav(station.url)}
                  status={currentStation?.url === station.url ? status : null}
                  onPlay={stablePlay}
                  onFavorite={stableFav}
                  onInfo={setInfoStation}
                />
              ))}
              {loading && Array.from({ length: 4 }, (_, i) => <SkeletonCard key={`sk-${i}`} index={12} />)}
            </div>

            {hasMore && mode !== 'favorites' && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2.5 min-h-[44px] px-7 rounded-button surface-raised text-sm font-medium text-secondary hover:text-primary disabled:opacity-60 transition-colors"
                >
                  {loading && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="animate-spin"
                      aria-hidden
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  {loading ? 'Loading…' : 'Load more stations'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {currentStation && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-[calc(2.75rem+12px)] inset-x-0 z-[110] px-3 pb-2 md:pb-0 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <MiniPlayer
              station={currentStation}
              isPlaying={isPlaying}
              status={status}
              volume={volume}
              onToggle={() => toggle(currentStation)}
              onRetry={retry}
              onVolumeChange={setVolume}
              onFavorite={() => toggleFav(currentStation)}
              isFavorite={isFav(currentStation.url)}
            />
          </div>
        </div>
      )}

      {infoStation && (
        <ErrorBoundary variant="inline" onReset={() => setInfoStation(null)}>
          <Suspense fallback={null}>
            <StationModal
              station={infoStation}
              onClose={() => setInfoStation(null)}
              onPlay={handlePlay}
              isPlaying={currentStation?.url === infoStation?.url && isPlaying}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {scrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className={`card-enter fixed ${currentStation ? 'bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:bottom-[calc(2.75rem+12px+4.5rem+12px)]' : 'bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-14'} right-3 md:right-6 z-[105] grid place-items-center w-11 h-11 rounded-button surface-raised text-tertiary hover:text-cyan transition-colors`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      )}

      <Footer stats={stats} stationCount={stationCount} countryCount={countryCount} onAdminClick={handleAdminToggle} />

      {mode !== 'admin' && (
        <BottomTabBar
          mode={tabMode}
          favCount={favCount}
          onHome={handleBack}
          onTrending={handleTrending}
          onRandom={handleRandom}
          onFavorites={handleFavToggle}
          onSearch={() => document.getElementById('searchInput')?.focus()}
          cooldown={cooldown}
        />
      )}
    </div>
  );
}
