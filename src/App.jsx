import React, { useState, useEffect, useCallback } from 'react';
import { useStations } from './hooks/useStations';
import { usePlayer } from './hooks/usePlayer';
import { useFavorites } from './hooks/useFavorites';
import { Header } from './components/Header';
import { CountryFilter } from './components/CountryFilter';
import { StationCard } from './components/StationCard';
import { MiniPlayer } from './components/MiniPlayer';
import { StationModal } from './components/StationModal';
import { Footer } from './components/Footer';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';

const API = import.meta.env.VITE_API_BASE_URL;

/* ─── Skeleton Grid ─── */
const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="skeleton h-[170px]" />
    ))}
  </div>
);

/* ─── Empty State ─── */
const EmptyState = ({ onReset, isFavs, isRandom }) => (
  <div className="flex flex-col items-center justify-center py-36 text-center animate-fade-in">
    <div className="w-28 h-28 rounded-full border border-white/5 bg-surface flex items-center justify-center mb-8 animate-float">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted/30">
        {isFavs
          ? <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          : <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>
        }
      </svg>
    </div>
    <h3 className="text-base font-bold uppercase tracking-[0.2em] text-primary mb-2">
      {isFavs ? 'No Saved Stations' : 'No Frequency Match'}
    </h3>
    <p className="text-sm text-muted max-w-xs mb-8">
      {isFavs
        ? 'Tap ♥ on any station to lock onto its frequency.'
        : isRandom
          ? 'Randomizer failed to lock a signal.'
          : 'Terminal scan returned zero results for this sector.'}
    </p>
    <button onClick={onReset} className="btn-amber h-10 px-6">
      {isFavs ? 'EXPLORE STATIONS' : 'RESET TERMINAL'}
    </button>
  </div>
);

/* ─── Aurora Background ─── */
const Background = () => {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none">
      {/* Mesh Gradient Orbs with Parallax */}
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
      {/* Texture Blur */}
      <div className="absolute inset-0 bg-[#050511]/40 backdrop-blur-[100px]" />
    </div>
  );
};

/* ─── Main App ─── */
export default function App() {
  const {
    stations, countries, stats, loading, error,
    query, country, total, hasMore,
    search, filterByCountry, fetchRandom, loadMore, reset,
  } = useStations();

  const { currentStation, isPlaying, status, volume, toggle, setVolume } = usePlayer();
  const { isFav, toggleFav, favCount, favList } = useFavorites();

  const [mode, setMode] = useState('home');   // home | favorites | admin
  const [adminKey, setAdminKeyState] = useState(() => {
    const sess = sessionStorage.getItem('ast_admin_session_v1');
    const time = sessionStorage.getItem('ast_admin_session_time');
    if (sess && time && (Date.now() - parseInt(time)) < 900000) { // 15 mins
      return sess;
    }
    return null;
  });
  const [adminUser, setAdminUser] = useState(() => sessionStorage.getItem('ast_admin_session_user'));
  const [isVerifying, setIsVerifying] = useState(false);
  const [infoStation, setInfoStation] = useState(null);
  const [scrollTop, setScrollTop] = useState(false);

  const setAdminKey = async (key, user) => {
    if (!key) {
      setAdminKeyState(null);
      setAdminUser(null);
      sessionStorage.removeItem('ast_admin_session_v1');
      sessionStorage.removeItem('ast_admin_session_time');
      sessionStorage.removeItem('ast_admin_session_user');
      return { success: true };
    }

    setIsVerifying(true);
    try {
      // 1. Validate Credentials against .env
      const envUser = import.meta.env.VITE_ADMIN_USER;
      const envPass = import.meta.env.VITE_ADMIN_PASS;

      if (user !== envUser || key !== envPass) {
        return { success: false, error: 'INVALID_CREDENTIALS' };
      }

      // 2. Perform Technical Handshake (Master Key)
      const masterKey = import.meta.env.VITE_ADMIN_KEY;
      const res = await fetch(`${API}/debug/list?key=${masterKey}`);
      
      if (res.status === 401 || res.status === 403) {
        throw new Error('ACCESS_DENIED');
      }

      setAdminKeyState(masterKey);
      setAdminUser(user);
      sessionStorage.setItem('ast_admin_session_v1', masterKey);
      sessionStorage.setItem('ast_admin_session_user', user);
      sessionStorage.setItem('ast_admin_session_time', Date.now().toString());
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Authorization Protocol Failed' };
    } finally {
      setIsVerifying(false);
    }
  };

  /* ─── Session Heartbeat (Auto-Expiring) ─── */
  useEffect(() => {
    if (!adminKey) return;
    const interval = setInterval(() => {
      const time = sessionStorage.getItem('ast_admin_session_time');
      if (time && (Date.now() - parseInt(time)) >= 900000) {
        setAdminKey(null);
        setMode('home');
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [adminKey]);

  /* ─── URL Routing for Single Station (/stations/:id) ─── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stationId = params.get('station_id');

    if (stationId) {
      fetch(`${API}/stations/${stationId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.url) {
            setInfoStation(data); // Opens modal automatically for the routed station
            window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
          }
        })
        .catch(err => {
          if (import.meta.env.DEV) console.warn('Failed to load deep-linked station', err);
        });
    }
  }, []); // Run once on boot

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handle = (e) => {
      const tag = document.activeElement?.tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

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

  const handleSearch = useCallback((q) => {
    setMode('home');
    search(q);
  }, [search]);

  const handleCountry = useCallback((c) => {
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

  const handleAdminClick = useCallback(() => {
    setMode(m => m === 'admin' ? 'home' : 'admin');
  }, []);

  const isRandom = !query && !country && stations.length > 0 && total === null;
  const displayMode = mode === 'favorites' ? 'favorites' : mode === 'admin' ? 'admin' : isRandom ? 'home' : (query || country ? 'search' : 'home');
  const list = mode === 'favorites' ? favList : stations;

  return (
    <div className="min-h-screen bg-[#050511] text-white font-sans selection:bg-cyan-500/30 selection:text-white pb-48 md:pb-32 relative overflow-x-hidden">
      <Background />

      <Header
        onSearch={handleSearch}
        searchQuery={query}
        onBack={handleBack}
        onFavToggle={handleFavToggle}
        onRandom={handleRandom}
        onAdminClick={handleAdminClick}
        favCount={favCount}
        mode={displayMode}
        isPlaying={isPlaying && status === 'playing'}
      />

      {/* ─── Floating Filter Bar ─── */}
      <div className="sticky top-24 z-[90] mt-10 mb-10 pb-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 p-2 pl-4 rounded-3xl bg-black/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-3">
            <CountryFilter
              countries={countries}
              selectedCountry={country}
              onSelect={handleCountry}
              total={total}
              query={query}
            />
          </div>

          <div className="hidden lg:flex items-center gap-6 px-4 text-[10px] font-mono font-bold text-white/30 tracking-[0.2em] uppercase">
            {isRandom && <span className="text-cyan-400 animate-pulse">Scanning Frequencies</span>}
            <div className="flex gap-4">
              <span>Space: Play</span>
              <span>/: Search</span>
              <span>Esc: Close</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-8">

        {mode === 'admin' ? (
          !adminKey ? (
            <AdminLogin onLogin={setAdminKey} isVerifying={isVerifying} />
          ) : (
            <AdminDashboard adminKey={adminKey} adminUser={adminUser} onLogout={() => { setAdminKey(null); setMode('home'); }} />
          )
        ) : (
          <>
            {/* Favorites header */}
            {mode === 'favorites' && (
              <div className="mb-10 animate-fade-in text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                  Saved Frequencies
                </h2>
                <div className="h-1 w-20 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full mx-auto md:mx-0 mb-4" />
                <p className="text-xs font-mono text-white/40 uppercase tracking-[0.3em]">
                  {favCount} station{favCount !== 1 ? 's' : ''} locked into sector
                </p>
              </div>
            )}

            {/* Error Banner */}
            {error && !loading && (
              <div className="mb-8 p-6 rounded-3xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-mono font-bold uppercase tracking-widest text-center animate-fade-in backdrop-blur-md">
                <div className="flex items-center justify-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && list.length === 0 && <SkeletonGrid />}

            {/* Empty State */}
            {!loading && list.length === 0 && !error && (
              <EmptyState onReset={handleBack} isFavs={mode === 'favorites'} isRandom={isRandom} />
            )}

            {/* Station Grid */}
            {list.length > 0 && (
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

                {/* Load More */}
                {hasMore && !loading && mode !== 'favorites' && (
                  <div className="mt-20 flex justify-center">
                    <button
                      onClick={loadMore}
                      className="px-12 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 text-xs font-bold uppercase tracking-[0.3em] transition-all duration-300 active:scale-95"
                    >
                      Sync Next Sector
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* ─── Mini Player (Floating above footer) ─── */}
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

      {/* ─── Station Modal ─── */}
      {infoStation && (
        <StationModal
          station={infoStation}
          onClose={() => setInfoStation(null)}
          onPlay={toggle}
          isPlaying={currentStation?.url === infoStation?.url && isPlaying}
        />
      )}

      {/* ─── Scroll to Top ─── */}
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

      <Footer stats={stats} countryCount={countries.length} />
    </div>
  );
}
