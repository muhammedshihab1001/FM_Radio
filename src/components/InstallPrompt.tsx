import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const IOS_TIP_KEY = 'nc_ios_install_tip_seen_v1';

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * A small "Install app" affordance. Chrome/Edge/Android fire
 * beforeinstallprompt, which we capture and replay on tap. iOS has no such
 * event — Safari only supports the manual Share → Add to Home Screen flow —
 * so there we show a one-time tip instead, remembered in localStorage.
 */
export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosTip, setShowIosTip] = useState(false);

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
    if (isIOS()) {
      setShowIosTip(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  };

  if (installed) return null;
  const showButton = !!deferred || (isIOS() && !localStorage.getItem(IOS_TIP_KEY));
  if (!showButton && !showIosTip) return null;

  return (
    <>
      <button
        type="button"
        onClick={onInstallClick}
        className="flex items-center gap-1.5 min-h-[44px] px-2.5 md:px-3 rounded-button bg-raised border border-line/10 text-secondary hover:text-primary transition-colors"
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

      {showIosTip && (
        <div
          role="status"
          className="fixed bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:bottom-36 inset-x-0 z-[200] flex justify-center px-3"
        >
          <div className="card-enter flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-button surface-raised text-sm text-secondary">
            <span>
              Tap <strong className="text-primary">Share</strong> →{' '}
              <strong className="text-primary">Add to Home Screen</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setShowIosTip(false);
                try {
                  localStorage.setItem(IOS_TIP_KEY, '1');
                } catch {
                  /* storage blocked */
                }
              }}
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
