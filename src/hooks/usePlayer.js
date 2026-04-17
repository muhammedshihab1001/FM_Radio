import { useState, useEffect, useRef, useCallback } from 'react';

const VOL_KEY = 'ast_volume_v1';

export function usePlayer() {
  const audioRef = useRef(null);

  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [status,     setStatus]     = useState('idle'); // idle|connecting|playing|buffering|error
  const [volume,     setVolumeState] = useState(() => {
    const v = parseFloat(localStorage.getItem(VOL_KEY));
    return isNaN(v) ? 0.75 : Math.max(0, Math.min(1, v));
  });

  const reportedUrls = useRef(new Set());

  /* ─── Create audio element once ─── */
  useEffect(() => {
    const audio = new Audio();
    audio.volume = parseFloat(localStorage.getItem(VOL_KEY) ?? '0.75');
    audioRef.current = audio;

    const on  = (ev, fn) => audio.addEventListener(ev, fn);

    on('loadstart', () => setStatus('connecting'));
    on('waiting',   () => setStatus('buffering'));
    on('playing',   () => { setStatus('playing'); setIsPlaying(true); document.body.classList.add('is-playing'); });
    on('pause',     () => { setIsPlaying(false);  document.body.classList.remove('is-playing'); setStatus('idle'); });
    on('stalled',   () => setStatus('buffering'));
    on('error',     () => { 
      setStatus('error');   
      setIsPlaying(false); 
      document.body.classList.remove('is-playing'); 

      // Auto-flag dead stream
      const url = audio.src;
      const API = import.meta.env.VITE_API_BASE_URL;

      // Robust Verification: 
      // 1. Must be absolute HTTP/HTTPS
      // 2. Must NOT be from the same origin as this app (dynamic, handles local & Vercel)
      // 3. Ignore system blobs or empty sources
      const currentOrigin = window.location.origin;
      const isRemoteStream = url && 
                             /^https?:\/\//i.test(url) && 
                             !url.startsWith(currentOrigin) &&
                             !url.includes('localhost') && 
                             !url.includes('127.0.0.1');

      if (isRemoteStream && API && !reportedUrls.current.has(url)) {
        reportedUrls.current.add(url);
        fetch(`${API}/debug/dead?url=${encodeURIComponent(url)}`)
          .catch(err => {
            if (import.meta.env.DEV) console.warn('Auto-flagging telemetry failed.', err);
          });
      }
    });

    return () => { audio.pause(); audio.src = ''; };
  }, []);

  /* ─── Play a station ─── */
  const play = useCallback((station) => {
    if (!station?.url) return;
    const audio = audioRef.current;
    audio.pause();
    audio.src = '';
    setCurrentStation(station);
    setStatus('connecting');
    audio.src = station.url;
    audio.load();
    audio.play().catch(() => setStatus('error'));
  }, []);

  /* ─── Pause ─── */
  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  /* ─── Toggle play/pause ─── */
  const toggle = useCallback((station) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentStation?.url === station?.url) {
      isPlaying ? audio.pause() : audio.play().catch(() => setStatus('error'));
    } else {
      play(station);
    }
  }, [currentStation, isPlaying, play]);

  /* ─── Volume ─── */
  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    localStorage.setItem(VOL_KEY, String(clamped));
  }, []);

  return { currentStation, isPlaying, status, volume, play, pause, toggle, setVolume };
}
