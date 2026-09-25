import React, { useEffect, useState } from 'react';

/**
 * Listens to the browser's online/offline events itself — no props, no
 * connection to App.tsx's own state, so App's hook list stays untouched.
 */
export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:bottom-36 inset-x-0 z-[200] flex justify-center px-3 pointer-events-none"
    >
      <div className="card-enter flex items-center gap-2.5 px-4 py-2.5 rounded-button bg-surface/95 border border-danger/30 backdrop-blur-md text-danger shadow-raised text-xs font-medium pointer-events-auto">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        You're offline — radio needs a connection
      </div>
    </div>
  );
};
