import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registers the service worker itself (vite.config.js sets injectRegister:
 * false so nothing else does this). When a new version has been installed
 * and is waiting, shows a real "Refresh" toast instead of silently reloading
 * out from under the person mid-listen.
 */
export const UpdateToast: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (err) => console.warn('Service worker registration failed:', err),
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:bottom-36 inset-x-0 z-[200] flex justify-center px-3 pointer-events-none">
      <div className="card-enter flex items-center gap-3 px-4 py-2.5 rounded-button surface-raised text-sm pointer-events-auto">
        <span className="text-secondary">New version available</span>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="min-h-[44px] px-3.5 rounded-button bg-cyan text-on-accent text-xs font-semibold shrink-0"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="grid place-items-center min-w-[44px] min-h-[44px] -mr-2.5 -my-1 text-tertiary hover:text-primary shrink-0"
          aria-label="Dismiss"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
