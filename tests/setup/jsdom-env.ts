import { builtinEnvironments, type Environment } from 'vitest/environments';

/**
 * jsdom, but with Node's own AbortController/AbortSignal kept in place.
 * jsdom replaces them with its own classes, which Node's fetch (undici) rejects
 * ("Expected signal to be an instance of AbortSignal"), so every request the
 * app makes with a timeout would throw in tests even though browsers are fine.
 */
export default {
  name: 'jsdom-node-abort',
  transformMode: 'web',
  async setup(global: typeof globalThis, options: Record<string, unknown>) {
    const { AbortController, AbortSignal } = global;
    // Per-file `@vitest-environment-options` arrive keyed by environment name.
    const jsdom = (options.jsdom ?? Object.values(options)[0] ?? {}) as Record<string, unknown>;
    const env = await builtinEnvironments.jsdom.setup(global, { jsdom });
    Object.assign(global, { AbortController, AbortSignal });
    return env;
  },
} satisfies Environment;
