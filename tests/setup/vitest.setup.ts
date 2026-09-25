import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { calls, server } from './msw';
import { FakeAudio, FakeHls } from './fakeMedia';

// Deterministic number formatting: the app calls toLocaleString() with the
// visitor's locale (correct), but tests must not depend on the machine's
// locale (e.g. en-IN renders 872268 as "8,72,268").
Number.prototype.toLocaleString = function toLocaleString(
  this: number,
  locales?: Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locales ?? 'en-US', options).format(this);
};

// findBy*/waitFor give up after 1 s by default; a lazy chunk's first import can exceed that on a
// loaded CI box. Waiting longer never makes a real failure pass — it only removes load flakes.
configure({ asyncUtilTimeout: 5000 });

// jsdom gaps
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
Element.prototype.scrollIntoView = function scrollIntoView() {};
window.scrollTo = () => undefined;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// The player logs its recovery progress; keep test output readable.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  calls.length = 0;
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = '';
  document.head.querySelectorAll('link[rel="preconnect"]').forEach((l) => l.remove());
  document.body.className = '';
  document.body.removeAttribute('style');
  FakeAudio.reset();
  FakeHls.reset();
  vi.useRealTimers();
});
afterAll(() => server.close());
