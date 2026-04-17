import React, { useState, useRef, useEffect } from 'react';

const Logo = () => (
  <div className="flex items-center gap-2 md:gap-3">
    <div className="relative group">
      <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-full bg-black flex items-center justify-center border border-white/20">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f60b86" />
              <stop offset="100%" stopColor="#00f4ff" />
            </linearGradient>
          </defs>
          <path d="M12 2v20M17 5v14M7 5v14M2 12h20M22 12c-2-2-3-3-5-5H7c-2 2-3 3-5 5M2 12c2 2 3 3 5 5h10c2-2 3-3 5-5"/>
        </svg>
      </div>
    </div>
    <div className="flex flex-col">
      <h1 className="text-xs md:text-sm font-bold tracking-[0.2em] text-white uppercase leading-none mb-0.5 md:mb-1">Nebula</h1>
      <span className="text-[8px] md:text-[10px] font-mono tracking-[0.3em] text-cyan-400 uppercase leading-none opacity-80">Cast FM</span>
    </div>
  </div>
);

export function Header({ onSearch, searchQuery, onBack, onFavToggle, favCount, mode, isPlaying, onRandom, onAdminClick }) {
  const [val, setVal] = useState(searchQuery ?? '');
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setVal(searchQuery ?? '');
    if (searchQuery) setSearchOpen(true);
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(val);
    if (!val) setSearchOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 md:px-8 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto h-16 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl px-4 md:px-6 relative overflow-hidden group/header shadow-2xl transition-all duration-300">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        
        {/* Logo Section (Hidden when search expanded on mobile) */}
        {!searchOpen && (
          <div className="flex items-center gap-3 animate-fade-in">
            <button 
              onClick={onBack} 
              className="px-2 py-2 hover:opacity-80 transition-all active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Go home"
            >
              <Logo />
            </button>
          </div>
        )}

        {/* Search Section */}
        <div className={`flex-1 flex items-center transition-all duration-300 ${searchOpen ? 'grow px-0' : 'grow-0'}`}>
          <form 
            onSubmit={handleSubmit} 
            className={`relative flex items-center transition-all duration-300 ${searchOpen ? 'w-full' : 'w-0 md:w-64 lg:w-96'}`}
          >
            {/* Desktop Search Icon / Mobile Back Icon */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] text-white/50 hover:text-cyan-400 transition-colors ${searchOpen ? 'md:pointer-events-none' : 'touch-manipulation'}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {searchOpen && !val ? (
                   <path d="M19 12H5m7-7-7 7 7 7" className="md:hidden" />
                ) : (
                  <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>
                )}
              </svg>
            </button>

            <input
              id="searchInput"
              ref={inputRef}
              type="text"
              placeholder="Search frequency..."
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className={`bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:bg-white/10 transition-all duration-300 ${searchOpen ? 'flex-1 h-11 opacity-100' : 'w-0 opacity-0 pointer-events-none md:w-full md:h-11 md:opacity-100 md:pointer-events-auto'}`}
            />

            {(val && searchOpen) && (
              <button
                type="button"
                onClick={() => { setVal(''); onSearch(''); setSearchOpen(false); }}
                className="absolute right-3 flex items-center justify-center w-8 h-8 text-white/30 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </form>
        </div>

        {/* Actions Section */}
        {!searchOpen && (
          <div className="flex items-center gap-1.5 md:gap-3 animate-fade-in pl-2">
            {/* Favs */}
            <button
              onClick={onFavToggle}
              className={`relative flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-3 rounded-2xl border transition-all duration-300 ${
                mode === 'favorites' 
                ? 'bg-pink-500/20 border-pink-500/50 text-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)]' 
                : 'bg-white/5 border-white/10 text-white/50 hover:border-pink-500/30 hover:text-pink-500'
              }`}
            >
               <svg 
                width="18" height="18" viewBox="0 0 24 24" fill={mode === 'favorites' ? "currentColor" : "none"} 
                stroke="currentColor" strokeWidth="2.5" 
                className={mode === 'favorites' ? 'animate-pulse' : ''}
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
              {favCount > 0 && <span className="hidden sm:inline text-[10px] font-bold font-mono tracking-widest">{favCount}</span>}
            </button>

            {/* Admin */}
            <button
              onClick={onAdminClick}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-2xl border transition-all duration-300 active:scale-95 ${
                mode === 'admin' 
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500' 
                : 'bg-white/5 border-white/10 text-white/20 hover:text-white'
              }`}
              aria-label="Admin"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
