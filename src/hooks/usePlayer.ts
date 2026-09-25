import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { Station, PlayerStatus } from '../types/terminal';
import { resolveStreamUrl, isMixedContent, isHls, upgradeToHttps, injectPreconnect } from '../utils/streamResolver';

const VOL_KEY = 'ast_volume_v1';

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [volume, setVolumeState] = useState<number>(() => {
    const vStr = localStorage.getItem(VOL_KEY);
    const v = vStr ? parseFloat(vStr) : 0.75;
    return isNaN(v) ? 0.75 : Math.max(0, Math.min(1, v));
  });

  const retryCount = useRef<number>(0);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);
  const lastPosition = useRef<number>(0);
  const stallCheckCounter = useRef<number>(0);

  const clearWatchdog = () => {
    if (watchdogTimer.current) {
      clearTimeout(watchdogTimer.current);
      watchdogTimer.current = null;
    }
  };

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const triggerReSync = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentStation) return;
    
    // Industrial Protocol: Max 3 retries before hard error
    if (retryCount.current >= 3) {
      console.error('Signal terminal failure: Max retries exceeded.');
      setStatus('error');
      setIsPlaying(false);
      return;
    }

    retryCount.current++;
    console.log(`📡 Recovering signal... Attempt ${retryCount.current}/3`);
    setStatus('recovering');
    
    // For HLS we need to re-bind
    if (isHls(audio.src)) {
      play(currentStation);
    } else {
      audio.load();
      audio.play().catch(() => setStatus('error'));
    }
  }, [currentStation]);

  const startWatchdog = (timeout = 6000) => {
    clearWatchdog();
    watchdogTimer.current = setTimeout(() => {
      triggerReSync();
    }, timeout); 
  };

  /* ─── Create audio element once (Stable Core) ─── */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    const vStr = localStorage.getItem(VOL_KEY) ?? '0.75';
    audio.volume = parseFloat(vStr);
    audioRef.current = audio;

    const on = (ev: string, fn: EventListener) => audio.addEventListener(ev, fn);

    on('loadstart', () => setStatus('connecting'));
    on('waiting',   () => {
      setStatus('buffering');
      startWatchdog(8000); // 8s watchdog
    });
    on('playing',   () => { 
      setStatus('playing'); 
      setIsPlaying(true); 
      document.body.classList.add('is-playing'); 
      clearWatchdog();
      retryCount.current = 0; 
      stallCheckCounter.current = 0;
    });
    on('pause',     () => { 
      setIsPlaying(false);  
      document.body.classList.remove('is-playing'); 
      setStatus('idle'); 
      clearWatchdog();
    });
    on('stalled',   () => {
      setStatus('buffering');
      startWatchdog(8000);
    });
    on('error',     () => {
      setStatus('error');
      setIsPlaying(false);
      clearWatchdog();
      if (retryCount.current < 3) {
        setTimeout(triggerReSync, 1000); // 1s delay before retry
      }
    });
    on('emptied',   () => {
      if (isPlaying) {
        setStatus('buffering');
        startWatchdog(5000);
      }
    });
    on('suspend',   () => {
      if (isPlaying && status !== 'playing') {
        startWatchdog(10000);
      }
    });

    const heartbeat = setInterval(() => {
      if (!audioRef.current || audio.paused) return;
      if (audio.currentTime === lastPosition.current) {
        stallCheckCounter.current++;
        if (stallCheckCounter.current > 10) { 
          setStatus('stalled');
          triggerReSync();
          stallCheckCounter.current = 0;
        }
      } else {
        lastPosition.current = audio.currentTime;
        stallCheckCounter.current = 0;
      }
    }, 500);

    return () => { 
      clearInterval(heartbeat);
      audio.pause(); 
      audio.src = ''; 
      destroyHls();
    };
  }, []); // EMPY ARRAY = STABLE CORE

  /* ─── Pre-warm signal on selection ─── */
  useEffect(() => {
    if (currentStation?.url) {
      injectPreconnect(currentStation.url);
      if (audioRef.current) audioRef.current.preload = 'auto'; // Start metadata handshake
    }
  }, [currentStation]);

  /* ─── Play a station ─── */
  const play = useCallback(async (station: Station) => {
    if (!station?.url) return;
    const audio = audioRef.current;
    if (!audio) return;
    
    // 1. Instant UI Handshake
    setCurrentStation(station);
    setStatus('connecting');

    // 2. Resolve format/playlist & Upgrade Protocol 
    const secureUrl = upgradeToHttps(station.url);
    const resolvedUrl = await resolveStreamUrl(secureUrl);
    
    // 3. Check Mixed Content
    if (isMixedContent(resolvedUrl)) {
      console.warn('📡 Signal Blocked: Insecure HTTP broadcast on secure HTTPS terminal.');
      setStatus('mixed-content');
      setIsPlaying(false);
      return;
    }

    clearWatchdog();
    destroyHls();
    
    audio.pause();
    audio.src = '';

    // 3. HLS vs Native Implementation
    if (isHls(resolvedUrl)) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          initialLiveManifestSize: 1,
          liveSyncDurationCount: 3,
          fragLoadingMaxRetry: 4
        });
        hls.loadSource(resolvedUrl);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().catch(() => setStatus('error'));
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error('HLS Fatal Error:', data.type);
            setStatus('error');
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                destroyHls();
                break;
            }
          }
        });
        hlsRef.current = hls;
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Native safari HLS
        audio.src = resolvedUrl;
        audio.play().catch(() => setStatus('error'));
      } else {
        setStatus('error'); // Unsupported format
      }
    } else {
      // Standard stream
      audio.src = resolvedUrl;
      audio.load();
      audio.play().catch(() => setStatus('error'));
    }
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
      if (isPlaying) {
        audio.pause();
      } else {
        // Use the existing src, don't re-resolve if it's the same
        audio.play().catch(() => setStatus('error'));
      }
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
