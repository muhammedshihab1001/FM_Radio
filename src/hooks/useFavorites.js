import { useState, useCallback, useEffect } from 'react';

const FAV_KEY = 'fm_favs_v2';

function read() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '{}'); }
  catch { return {}; }
}

function write(obj) {
  localStorage.setItem(FAV_KEY, JSON.stringify(obj));
}

/* Simple global sync — no context needed */
const listeners = new Set();
const broadcast = () => listeners.forEach(fn => fn());

export function useFavorites() {
  const [favs, setFavs] = useState(read);

  useEffect(() => {
    const sync = () => setFavs(read());
    listeners.add(sync);
    return () => listeners.delete(sync);
  }, []);

  const isFav = useCallback((url) => !!url && !!favs[url], [favs]);

  const toggleFav = useCallback((station) => {
    if (!station?.url) return;
    const next = { ...favs };
    const wasFav = !!next[station.url];
    if (wasFav) {
      delete next[station.url];
    } else {
      next[station.url] = station;
    }
    write(next);
    setFavs(next);
    broadcast();

    /* DOM toast — avoids prop-drilling */
    const toast = Object.assign(document.createElement('div'), {
      className: [
        'fixed bottom-28 left-1/2 -translate-x-1/2 z-[200]',
        'px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest',
        'bg-surface border border-accent/30 text-accent shadow-amber',
        'animate-fade-in pointer-events-none transition-opacity duration-500',
      ].join(' '),
      innerText: wasFav
        ? `✕ Removed ${station.name}`
        : `♥ Saved ${station.name}`,
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 2200);
  }, [favs]);

  const favList  = Object.values(favs);
  const favCount = favList.length;

  return { favs, isFav, toggleFav, favCount, favList };
}
