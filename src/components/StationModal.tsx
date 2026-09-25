import React, { useEffect, useRef } from 'react';
import type { Station } from '../types/terminal';
import { artworkFor } from './artwork';
import { EqBars } from './PlayerVisuals';

interface StationModalProps {
  station: Station | null;
  onClose: () => void;
  onPlay: (s: Station) => void;
  isPlaying: boolean;
}

const safeUrl = (url: string | undefined): string => {
  if (typeof url !== 'string') return '';
  const t = url.trim();
  return /^https?:\/\//i.test(t) ? t : '';
};

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Station details. Centered dialog on desktop, a bottom sheet on mobile
 * (same structure v3 had — a handle-bar look + slide-up — just restyled).
 * Esc/backdrop closes it; focus is trapped inside while open and returns to
 * whatever opened it on close (v3 had neither).
 */
export const StationModal: React.FC<StationModalProps> = ({ station, onClose, onPlay, isPlaying }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    // Lock page scroll behind the dialog (restored on close).
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!first || !last) return;
        if (!dialogRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!station) return null;

  const art = artworkFor(station.name);
  const url = safeUrl(station.url);
  const secure = url.startsWith('https');

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).catch(() => undefined);
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: url });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const t = Object.assign(document.createElement('div'), {
      className:
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-2.5 rounded-button text-xs font-medium text-primary surface-raised shadow-raised animate-fade-in pointer-events-none',
      innerText: 'Stream link copied',
    });
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s ease';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 2000);
  };

  const details: [string, string][] = [
    ['Country', station.country || 'Global'],
    ['City', station.city || '—'],
    ['Bitrate', station.bitrate ? `${station.bitrate} kbps` : 'Standard'],
    ['Codec', station.codec || 'Auto'],
    ['Genre', station.genre || '—'],
    [
      'Plays',
      typeof station.clickcount === 'number'
        ? station.clickcount.toLocaleString()
        : typeof station.votes === 'number'
          ? station.votes.toLocaleString()
          : '—',
    ],
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center animate-fade-in">
      {/* Backdrop: mouse/touch shortcut only — Esc and the Close button are the keyboard path. */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-modal-title"
        className="relative w-full max-h-[88dvh] sm:max-h-[85dvh] sm:max-w-md overflow-hidden animate-modal-up shadow-raised flex flex-col rounded-t-modal sm:rounded-modal bg-surface border border-line/[0.06] sm:border-line/10"
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-line/20" />
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 grid place-items-center min-w-[44px] min-h-[44px] rounded-button bg-overlay text-tertiary hover:text-primary transition-colors"
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pt-2 sm:p-6">
          <div
            className="w-full aspect-video rounded-card mb-5 overflow-hidden relative [container-type:inline-size]"
            style={{ background: art.gradient }}
          >
            <span
              className="absolute inset-0 grid place-items-center font-sans font-bold text-[16cqw]"
              style={{ color: art.tint }}
              aria-hidden
            >
              {art.monogram}
            </span>
            {isPlaying && (
              <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-chip bg-cyan text-on-accent text-2xs font-bold uppercase tracking-[0.08em] px-2 py-1">
                <EqBars count={3} className="h-2.5" />
                Live
              </span>
            )}
          </div>

          <h2
            dir="auto"
            id="station-modal-title"
            className="text-lg font-semibold text-primary tracking-[-0.01em] leading-tight mb-1"
          >
            {station.name}
          </h2>
          <p className="font-mono text-xs text-cyan tracking-wide mb-5">
            {station.country || 'Global'}
            {station.city ? ` · ${station.city}` : ''}
          </p>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
            {details.map(([label, value]) => (
              <div key={label} className="p-3 rounded-button surface-raised">
                <dt className="text-2xs font-mono text-tertiary uppercase tracking-wide mb-0.5">{label}</dt>
                <dd className="text-sm font-medium text-primary truncate tabular">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="p-3.5 rounded-button surface-raised mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs font-mono text-tertiary uppercase tracking-wide">Connection</span>
              <span className={`text-2xs font-mono font-medium ${secure ? 'text-cyan' : 'text-warn'}`}>
                {secure ? 'Secure · HTTPS' : 'Insecure · HTTP'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-xs text-secondary bg-base px-2.5 py-2 rounded select-all">
                {url || 'URL unavailable'}
              </code>
              <button
                type="button"
                onClick={copyUrl}
                disabled={!url}
                className="grid place-items-center min-w-[44px] min-h-[44px] rounded-button text-tertiary hover:text-primary disabled:opacity-40 transition-colors shrink-0"
                aria-label="Copy stream link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] sm:pb-6 border-t border-line/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => {
              onPlay(station);
              onClose();
            }}
            className="w-full h-[52px] rounded-button bg-cyan text-on-accent font-semibold text-sm flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98]"
          >
            {isPlaying ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Stop listening
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                  <path d="m7 4 12 8-12 8V4z" />
                </svg>
                Listen now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
