import { vi } from 'vitest';

/**
 * Minimal HTMLAudioElement stand-in. Media events are fired by tests via
 * `emit()` so every player status transition can be driven deterministically.
 * `volume` validates like real browsers (non-finite → TypeError, out of
 * [0, 1] → IndexSizeError) so invalid values surface as real failures.
 */
export class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  static nativeHls = false;
  static playImpl: () => Promise<void> = () => Promise.resolve();

  preload = '';
  paused = true;
  currentTime = 0;
  #src = '';
  #volume = 1;

  play = vi.fn(() => {
    this.paused = false;
    return FakeAudio.playImpl();
  });
  pause = vi.fn(() => {
    if (this.paused) return;
    this.paused = true;
    this.emit('pause');
  });
  load = vi.fn(() => {
    this.emit('loadstart');
  });
  canPlayType = vi.fn((type: string) =>
    FakeAudio.nativeHls && type === 'application/vnd.apple.mpegurl' ? 'maybe' : '',
  );

  constructor() {
    super();
    FakeAudio.instances.push(this);
  }

  get src() {
    return this.#src;
  }
  set src(v: string) {
    this.#src = v;
  }
  get volume() {
    return this.#volume;
  }
  set volume(v: number) {
    if (!Number.isFinite(v))
      throw new TypeError("Failed to set the 'volume' property: The provided double value is non-finite.");
    if (v < 0 || v > 1)
      throw new DOMException(`The volume provided (${v}) is outside the range [0, 1].`, 'IndexSizeError');
    this.#volume = v;
  }

  emit(type: string) {
    this.dispatchEvent(new Event(type));
  }

  static get last(): FakeAudio {
    const a = FakeAudio.instances[FakeAudio.instances.length - 1];
    if (!a) throw new Error('No FakeAudio created yet');
    return a;
  }

  static reset() {
    FakeAudio.instances = [];
    FakeAudio.nativeHls = false;
    FakeAudio.playImpl = () => Promise.resolve();
  }
}

type Handler = (event: string, data: unknown) => void;

/** hls.js stand-in; `vi.mock('hls.js', () => ({ default: FakeHls }))` in tests. */
export class FakeHls {
  static instances: FakeHls[] = [];
  static supported = true;
  static isSupported = () => FakeHls.supported;
  static Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError' } as const;
  static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError', OTHER_ERROR: 'otherError' } as const;

  handlers = new Map<string, Handler[]>();
  media: unknown = null;
  source = '';
  destroyed = false;
  loadSource = vi.fn((url: string) => {
    this.source = url;
  });
  attachMedia = vi.fn((m: unknown) => {
    this.media = m;
  });
  startLoad = vi.fn();
  recoverMediaError = vi.fn();
  destroy = vi.fn(() => {
    this.destroyed = true;
  });

  constructor(public config?: unknown) {
    FakeHls.instances.push(this);
  }

  on(event: string, fn: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
  }
  trigger(event: string, data: unknown = {}) {
    for (const fn of this.handlers.get(event) ?? []) fn(event, data);
  }

  static reset() {
    FakeHls.instances = [];
    FakeHls.supported = true;
  }
}
