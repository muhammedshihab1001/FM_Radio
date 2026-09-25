import { useState } from 'react';
import { vi } from 'vitest';

// Stand-in for vite-plugin-pwa's virtual module. Tests flip `pwaMock.needRefresh`
// before render to show the update toast.
export const pwaMock = {
  needRefresh: false,
  updateServiceWorker: vi.fn(() => Promise.resolve()),
};

export function useRegisterSW(_options?: unknown) {
  const needRefresh = useState(pwaMock.needRefresh);
  const offlineReady = useState(false);
  return { needRefresh, offlineReady, updateServiceWorker: pwaMock.updateServiceWorker };
}
