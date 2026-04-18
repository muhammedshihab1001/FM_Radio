import { useState, useEffect, useRef, useCallback } from 'react';
import { Station, PlayerStatus } from '../types/terminal';

const VOL_KEY = 'ast_volume_v1';

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying,  setIsPlaying]  = useState<boolean>(false);
  const [status,     setStatus]     = useState<PlayerStatus>('idle');
  const [volume,     setVolumeState] = useState<number>(() => {
    const vStr = localStorage.getItem(VOL_KEY);
    const v = vStr ? parseFloat(vStr) : 0.75;
    return isNaN(v) ? 0.75 : Math.max(0, Math.min(1, v));
  });

  const reportedUrls = useRef<Set<string>>(new Set());
  const retryCount = useRef<number>(0);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);

  /* ─── Resilient Signal Logic: Watchdog ─── */
  const clearWatchdog = () => {
    if (watchdogTimer.current) {
      clearTimeout(watchdogTimer.current);
      watchdogTimer.current = null;
    }
  };

  const triggerReSync = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentStation) return;
    
    if (retryCount.current >= 3) {
      setStatus('error');
      setIsPlaying(false);
      return;
    }

    retryCount.current++;
    setStatus('connecting');
    audio.load();
    audio.play().catch(() => setStatus('error'));
  }, [currentStation]);

  const startWatchdog = () => {
    clearWatchdog();
    watchdogTimer.current = setTimeout(() => {
      triggerReSync();
    }, 8000); // 8-second Industrial Watchdog
  };

  /* ─── Create audio element once ─── */
  useEffect(() => {
    const audio = new Audio();
    const vStr = localStorage.getItem(VOL_KEY) ?? '0.75';
    audio.volume = parseFloat(vStr);
    audioRef.current = audio;

    const on = (ev: string, fn: EventListener) => audio.addEventListener(ev, fn);

    on('loadstart', () => setStatus('connecting'));
    on('waiting',   () => {
      setStatus('buffering');
      startWatchdog();
    });
    on('playing',   () => { 
      setStatus('playing'); 
      setIsPlaying(true); 
      document.body.classList.add('is-playing'); 
      clearWatchdog();
      retryCount.current = 0; // Signal Secured
    });
    on('pause',     () => { 
      setIsPlaying(false);  
      document.body.classList.remove('is-playing'); 
      setStatus('idle'); 
      clearWatchdog();
    });
    on('stalled',   () => {
      setStatus('buffering');
      startWatchdog();
    });
    on('error',     () => {
      setStatus('error');
      setIsPlaying(false);
      clearWatchdog();
      // Only attempt one re-sync on immediate error
      if (retryCount.current < 2) triggerReSync();
    });

    return () => { audio.pause(); audio.src = ''; };
  }, []);

  /* ─── Play a station ─── */
  const play = useCallback((station: Station) => {
    if (!station?.url) return;
    const audio = audioRef.current;
    if (!audio) return;
    
    clearWatchdog();
    retryCount.current = 0; // Fresh Handshake
    
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
  const toggle = useCallback((station: Station) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentStation?.url === station?.url) {
      isPlaying ? audio.pause() : audio.play().catch(() => setStatus('error'));
    } else {
      play(station);
    }
  }, [currentStation, isPlaying, play]);

  /* ─── Volume ─── */
  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    localStorage.setItem(VOL_KEY, String(clamped));
  }, []);

  return { currentStation, isPlaying, status, volume, play, pause, toggle, setVolume };
}
