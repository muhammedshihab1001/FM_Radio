import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStations } from './hooks/useStations';
import { usePlayer } from './hooks/usePlayer';
import { useFavorites } from './hooks/useFavorites';
import { Header } from './components/Header';
import { CountryFilter } from './components/CountryFilter';
import { StationCard } from './components/StationCard';
import { MiniPlayer } from './components/MiniPlayer';
import { StationModal } from './components/StationModal';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { Station } from './types/terminal';

const API = import.meta.env.VITE_API_BASE_URL;

/* ─── Skeleton Grid ─── */
const SkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {[...Array(24)].map((_, i) => (
      <div 
        key={i} 
        className="relative h-[170px] rounded-3xl bg-white/[0.03] border border-white/5 overflow-hidden animate-pulse"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        <div className="p-5 space-y-4">
          <div className="h-4 w-2/3 bg-white/5 rounded-full" />
          <div className="h-3 w-1/2 bg-white/5 rounded-full" />
          <div className="mt-auto pt-4 flex justify-between items-center border-t border-white/5">
            <div className="w-10 h-10 rounded-xl bg-white/5" />
            <div className="w-20 h-4 bg-white/5 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ─── Empty State ─── */
interface EmptyStateProps {
  onReset: () => void;
  isFavs: boolean;
  isRandom: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onReset, isFavs, isRandom }) => (
  <div className="flex flex-col items-center justify-center py-36 text-center animate-fade-in">
    <div className="w-28 h-28 rounded-full border border-white/5 bg-transparent flex items-center justify-center mb-8 animate-float">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/30">
        {isFavs
          ? <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          : <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>
        }
      </svg>
    </div>
    <h3 className="text-base font-bold uppercase tracking-[0.2em] text-white mb-2">
      {isFavs ? 'No Saved Stations' : 'No Stations Found'}
    </h3>
    <p className="text-sm text-white/40 max-w-xs mb-8 uppercase tracking-widest leading-loose">
      {isFavs
        ? 'Tap the heart icon on any station to save it to your collection.'
        : isRandom
          ? 'Thermal Noise Detected: Failed to discover a new station pool.'
          : 'Our search through the global network returned zero results.'}
    </p>
    <button onClick={onReset} className="px-12 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all">
      {isFavs ? 'EXPLORE STATIONS' : 'RESET SIGNAL'}
    </button>
  </div>
);

/* ─── Aurora Background ─── */
const Background: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none">
      <div
        className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] animate-gradient shadow-2xl opacity-40 transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${scrollY * 0.1}px) rotate(${scrollY * 0.01}deg)`,
          background: `
            radial-gradient(circle at 20% 30%, rgba(236, 72, 153, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
          `
        }}
      />
      <div className="absolute inset-0 bg-[#050511]/40 backdrop-blur-[100px]" />
    </div>
  );
};

/* ─── Main App ─── */
export default function App() {
  const {
    stations, countries, stats, loading, error,
    query, country, isTrending, hasMore, cooldown,
    stationCount, countryCount,
    search, filterByCountry, toggleTrending, fetchRandom, loadMore, reset,
  } = useStations();

  const { currentStation, isPlaying, status, volume, toggle, setVolume } = usePlayer();
  const { isFav, toggleFav, favCount, favList } = useFavorites();

  const [mode, setMode] = useState<'home' | 'favorites' | 'admin'>('home');   
  const [infoStation, setInfoStation] = useState<Station | null>(null);
  const [scrollTop, setScrollTop] = useState<boolean>(false);
  const [configError] = useState<boolean>(!API);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      if (e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setMode(m => m === 'admin' ? 'home' : 'admin');
        return;
      }

      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        if (currentStation) toggle(currentStation);
        return;
      }
      if (e.key === 'Escape') {
        if (infoStation) { setInfoStation(null); return; }
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

  /* ─── Scroll to top visibility ─── */
  useEffect(() => {
    const handle = () => setScrollTop(window.scrollY > 380);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setMode('home');
    search(q);
  }, [search]);

  const handleCountry = useCallback((c: string | null) => {
    setMode('home');
    filterByCountry(c);
  }, [filterByCountry]);

  const handleRandom = useCallback(() => {
    setMode('home');
    fetchRandom();
  }, [fetchRandom]);

  const handleBack = useCallback(() => {
    setMode('home');
    reset();
  }, [reset]);

  const handleFavToggle = useCallback(() => {
    setMode(m => m === 'favorites' ? 'home' : 'favorites');
  }, []);

  const handleAdminToggle = useCallback(() => {
    setMode(m => m === 'admin' ? 'home' : 'admin');
  }, []);

  const isHomeDiscovery = !query && !country && !isTrending && mode === 'home';
  const displayMode = useMemo(() => {
    if (mode === 'admin') return 'admin';
    if (mode === 'favorites') return 'favorites';
    if (isTrending) return 'trending';
    return isHomeDiscovery ? 'home' : (query || country ? 'search' : 'home');
  }, [mode, isHomeDiscovery, query, country, isTrending]);

  const list = useMemo(() => {
    return mode === 'favorites' ? favList : stations;
  }, [mode, favList, stations]);

  if (configError) {
    return (
      <div className="min-h-screen bg-[#050511] flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
              <path d="M12 2v20M17 5v14M7 5v14M2 12h20M22 12c-2-2-3-3-5-5H7c-2 2-3 3-5 5M2 12c2 2 3 3 5 5h10c2-2 3-3 5-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">System Offline</h1>
          <p className="text-xs font-mono text-white/40 leading-relaxed uppercase tracking-widest">
            Handshake Error: Missing API endpoint [VITE_API_BASE_URL]. Check your environment configuration.
          </p>
          <div className="h-[1px] w-12 bg-white/10 mx-auto" />
          <p className="text-[10px] text-red-400/60 font-mono italic">Connection Protocol Failed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050511] text-white font-sans selection:bg-cyan-500/30 selection:text-white pb-48 md:pb-32 relative overflow-x-hidden">
      <Background />

      <Header
        onSearch={handleSearch}
        searchQuery={query}
        onBack={handleBack}
        onFavToggle={handleFavToggle}
        onTrending={toggleTrending}
        onAdminToggle={handleAdminToggle}
        onRandom={handleRandom}
        cooldown={cooldown}
        favCount={favCount}
        mode={displayMode as any}
        isPlaying={isPlaying && status === 'playing'}
      />

      {mode !== 'admin' && (
        <div className="sticky top-24 z-[90] mt-10 mb-10 pb-4 px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 p-2 pl-4 rounded-3xl bg-black/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center gap-3">
              <CountryFilter
                countries={countries}
                selectedCountry={country}
                onSelect={handleCountry}
                total={stationCount}
                query={query}
              />
            </div>

            <div className="hidden lg:flex items-center gap-6 px-4 text-[10px] font-mono font-bold text-white/40 tracking-[0.2em] uppercase">
              {isHomeDiscovery && <span className="text-cyan-400 animate-pulse">{stationCount > 0 ? stationCount.toLocaleString() : '30,000+'} GLOBAL BROADCASTS</span>}
              <div className="flex gap-4">
                <span>Space: Play</span>
                <span>/: Search</span>
                <span>Esc: Escape</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-8">
        <>
          {mode === 'admin' && <AdminPanel onClose={handleBack} />}

          {mode === 'favorites' && (
            <div className="mb-10 animate-fade-in text-center md:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                Favorite Stations
              </h2>
              <div className="h-1 w-20 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full mx-auto md:mx-0 mb-4" />
              <p className="text-xs font-mono text-white/40 uppercase tracking-[0.3em]">
                {favCount} station{favCount !== 1 ? 's' : ''} saved to your collection
              </p>
            </div>
          )}

          {mode !== 'admin' && error && !loading && (
            <div className="mb-8 p-6 rounded-3xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-mono font-bold uppercase tracking-widest text-center animate-fade-in backdrop-blur-md">
              <div className="flex items-center justify-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {mode !== 'admin' && loading && list.length === 0 && <SkeletonGrid />}

          {mode !== 'admin' && !loading && list.length === 0 && !error && (
            <EmptyState onReset={handleBack} isFavs={mode === 'favorites'} isRandom={isHomeDiscovery} />
          )}

          {mode !== 'admin' && list.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {list.map((station, index) => (
                  <StationCard
                    key={station.id ?? station.url ?? index}
                    station={station}
                    index={index}
                    active={currentStation?.url === station.url}
                    isPlaying={currentStation?.url === station.url && isPlaying}
                    isFavorite={isFav(station.url)}
                    status={currentStation?.url === station.url ? status : null}
                    onPlay={toggle}
                    onFavorite={toggleFav}
                    onInfo={setInfoStation}
                  />
                ))}
                {loading && [...Array(4)].map((_, i) => (
                  <div key={`sk-${i}`} className="w-full aspect-[4/3] rounded-3xl bg-white/5 animate-pulse" />
                ))}
              </div>

              {hasMore && !loading && mode !== 'favorites' && (
                <div className="mt-20 flex justify-center">
                  <button
                    onClick={loadMore}
                    className="px-12 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 text-xs font-bold uppercase tracking-[0.3em] transition-all duration-300 active:scale-95 text-cyan-400/80"
                  >
                    Load More Stations
                  </button>
                </div>
              )}
            </>
          )}
        </>
      </main>

      {currentStation && (
        <div className="fixed bottom-14 left-0 right-0 z-[110] px-4 pb-4 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <MiniPlayer
              station={currentStation}
              isPlaying={isPlaying}
              status={status}
              volume={volume}
              onToggle={() => toggle(currentStation)}
              onVolumeChange={setVolume}
              onFavorite={() => toggleFav(currentStation)}
              isFavorite={isFav(currentStation.url)}
            />
          </div>
        </div>
      )}

      {infoStation && (
        <StationModal
          station={infoStation}
          onClose={() => setInfoStation(null)}
          onPlay={toggle}
          isPlaying={currentStation?.url === infoStation?.url && isPlaying}
        />
      )}

      {scrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="fixed bottom-32 right-4 md:right-8 z-[110] w-14 h-14 rounded-2xl cursor-pointer
          bg-white/5 backdrop-blur-2xl border border-white/10 text-white/50 hover:text-cyan-400 hover:border-cyan-500/30
          flex items-center justify-center transition-all duration-300 shadow-2xl animate-fade-in group"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-y-1 transition-transform">
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      )}

      <Footer 
        stats={stats} 
        stationCount={stationCount}
        countryCount={countryCount} 
        onAdminClick={handleAdminToggle}
      />
    </div>
  );
}
