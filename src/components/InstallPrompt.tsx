import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const IOS_TIP_KEY = 'nc_ios_install_tip_seen_v1';
const MAC_TIP_KEY = 'nc_mac_install_tip_seen_v1';

// Storage can be unavailable (Safari with website data blocked, some private modes) — never let
// that break the header.
const seen = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const markSeen = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* storage blocked */
  }
};

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

// iPadOS reports itself as a Mac; a touch screen gives it away.
const isIPad = () =>
  /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isIOS = () => /iPhone|iPod/.test(navigator.userAgent) || isIPad();
// Safari 17+ on macOS can install web apps ("Add to Dock"), but fires no install event.
const isMacSafari = () => {
  if (isIPad()) return false;
  const ua = navigator.userAgent;
  const m = /Macintosh.*Version\/(\d+)[\d.]*.*Safari/.exec(ua);
  return !!m && Number(m[1]) >= 17 && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua);
};

type ManualPlatform = 'ios' | 'mac';
const manualPlatform = (): ManualPlatform | null => (isIOS() ? 'ios' : isMacSafari() ? 'mac' : null);
const TIP_KEY: Record<ManualPlatform, string> = { ios: IOS_TIP_KEY, mac: MAC_TIP_KEY };

const ShareIcon = () => (
  <svg
    className="inline-block align-[-2px] mx-0.5 text-cyan"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

/**
 * "Install app", on every platform that can install:
 * - Chrome / Edge / Samsung Internet (Android, Windows, ChromeOS, Linux) fire beforeinstallprompt,
 *   which is captured and replayed on tap — the browser's own install dialog.
 * - iPhone / iPad (any browser) and Safari 17+ on macOS have no such event, so a one-time tip
 *   explains the Share → Add to Home Screen / Add to Dock step. On iPhone it sits near the bottom,
 *   where Safari's Share button is; on iPad and Mac, at the top, next to theirs.
 * The button sits first in the header actions and fades in, so it never shifts the other buttons.
 */
export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [manual] = useState(manualPlatform);
  const [tipSeen, setTipSeen] = useState(() => (manual ? seen(TIP_KEY[manual]) : true));
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (installed) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [installed]);

  const onInstallClick = async () => {
    if (manual && !deferred) {
      setShowTip(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  };

  const dismissTip = () => {
    setShowTip(false);
    if (manual) markSeen(TIP_KEY[manual]);
    setTipSeen(true);
  };

  if (installed) return null;
  const showButton = !!deferred || (!!manual && !tipSeen);
  if (!showButton && !showTip) return null;

  const tipAtBottom = manual === 'ios' && !isIPad();

  return (
    <>
      {showButton && (
        <button
          type="button"
          onClick={() => void onInstallClick()}
          className="card-enter flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] px-2.5 md:px-3 rounded-button bg-raised border border-line/10 text-secondary hover:text-primary transition-colors"
          aria-label="Install app"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 3v13" />
            <path d="m7 11 5 5 5-5" />
            <path d="M5 20h14" />
          </svg>
          <span className="hidden lg:inline text-xs font-medium">Install</span>
        </button>
      )}

      {showTip && (
        <div
          role="status"
          className={`fixed z-[200] flex px-3 ${
            tipAtBottom
              ? 'bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:bottom-36 inset-x-0 justify-center'
              : 'top-[calc(max(12px,env(safe-area-inset-top))+4.25rem)] md:top-24 right-0 md:right-3 justify-end'
          }`}
        >
          <div className="card-enter flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-button surface-raised text-sm text-secondary">
            <span>
              {manual === 'mac' ? 'Click' : 'Tap'} <ShareIcon />
              <strong className="text-primary">Share</strong> →{' '}
              <strong className="text-primary">{manual === 'mac' ? 'Add to Dock' : 'Add to Home Screen'}</strong>
            </span>
            <button
              type="button"
              onClick={dismissTip}
              className="min-h-[44px] px-3 rounded-button text-xs font-medium text-cyan"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
