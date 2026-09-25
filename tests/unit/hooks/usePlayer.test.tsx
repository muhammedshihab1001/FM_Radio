import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayer } from '../../../src/hooks/usePlayer';
import { FakeAudio, FakeHls } from '../../setup/fakeMedia';
import { server } from '../../setup/msw';
import { makeStation } from '../../fixtures/stations';

vi.mock('hls.js', async () => ({ default: (await import('../../setup/fakeMedia')).FakeHls }));

const mp3 = makeStation(0, { url: 'https://edge.radio.test/live.mp3' });
const other = makeStation(1, { url: 'https://other.radio.test/live.aac' });
const hls = makeStation(2, { url: 'https://cdn.radio.test/live/index.m3u8' });

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudio);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

const mount = () => renderHook(() => usePlayer());
const play = async (result: { current: ReturnType<typeof usePlayer> }, s = mp3) => {
  await act(async () => {
    await result.current.play(s);
  });
};
const emit = (type: string) => act(() => FakeAudio.last.emit(type));
/** Advance fake time while the stream keeps producing audio (so the heartbeat sees progress). */
const flowFor = async (ms: number) => {
  for (let t = 0; t < ms; t += 500) {
    FakeAudio.last.currentTime += 0.5;
    await act(() => vi.advanceTimersByTimeAsync(500));
  }
};

describe('usePlayer — basics', () => {
  it('starts idle with the default volume', () => {
    const { result } = mount();
    expect(result.current).toMatchObject({ currentStation: null, isPlaying: false, status: 'idle', volume: 0.75 });
    expect(FakeAudio.last.volume).toBe(0.75);
    expect(FakeAudio.last.preload).toBe('none');
  });

  it('restores a valid stored volume', () => {
    localStorage.setItem('ast_volume_v1', '0.3');
    const { result } = mount();
    expect(result.current.volume).toBe(0.3);
    expect(FakeAudio.last.volume).toBe(0.3);
  });

  // BUG-4: the mount effect assigns the raw stored value to audio.volume.
  it.fails('does not crash on an out-of-range stored volume ("1.5")', () => {
    localStorage.setItem('ast_volume_v1', '1.5');
    const { result } = mount();
    expect(result.current.volume).toBe(1);
  });
  it.fails('does not crash on a corrupted stored volume ("abc")', () => {
    localStorage.setItem('ast_volume_v1', 'abc');
    const { result } = mount();
    expect(result.current.volume).toBe(0.75);
  });

  it('clamps and persists volume changes', () => {
    const { result } = mount();
    act(() => result.current.setVolume(0.5));
    expect([result.current.volume, FakeAudio.last.volume, localStorage.getItem('ast_volume_v1')]).toEqual([
      0.5,
      0.5,
      '0.5',
    ]);
    act(() => result.current.setVolume(2));
    expect(result.current.volume).toBe(1);
    act(() => result.current.setVolume(-3));
    expect([result.current.volume, FakeAudio.last.volume]).toEqual([0, 0]);
  });

  it('ignores a station without a URL', async () => {
    const { result } = mount();
    await play(result, { ...mp3, url: '' });
    expect(result.current.currentStation).toBeNull();
  });
});

describe('usePlayer — direct streams', () => {
  it('plays: connecting → playing, then pause → idle', async () => {
    const { result } = mount();
    await play(result);
    const audio = FakeAudio.last;
    expect(result.current.currentStation).toBe(mp3);
    expect(result.current.status).toBe('connecting');
    expect(audio.src).toBe(mp3.url);
    expect(audio.load).toHaveBeenCalled();
    expect(audio.play).toHaveBeenCalled();
    expect(document.head.querySelector('link[rel="preconnect"]')).toHaveAttribute('href', 'https://edge.radio.test');
    expect(audio.preload).toBe('auto');

    emit('playing');
    expect(result.current).toMatchObject({ status: 'playing', isPlaying: true });
    expect(document.body).toHaveClass('is-playing');

    act(() => result.current.pause());
    expect(result.current).toMatchObject({ status: 'idle', isPlaying: false });
    expect(document.body).not.toHaveClass('is-playing');
  });

  it('upgrades http:// station URLs to https://', async () => {
    const { result } = mount();
    await play(result, { ...mp3, url: 'http://edge.radio.test/live.mp3' });
    expect(FakeAudio.last.src).toBe('https://edge.radio.test/live.mp3');
  });

  it('resolves a .pls playlist before playing', async () => {
    server.use(
      http.get('https://edge.radio.test/list.pls', () => HttpResponse.text('File1=https://edge.radio.test/real\n')),
    );
    const { result } = mount();
    await play(result, { ...mp3, url: 'https://edge.radio.test/list.pls' });
    expect(FakeAudio.last.src).toBe('https://edge.radio.test/real');
  });

  it('maps every media event to the right status', async () => {
    const { result } = mount();
    await play(result);
    const seen: string[] = [];
    for (const ev of ['loadstart', 'waiting', 'playing', 'stalled', 'playing']) {
      emit(ev);
      seen.push(result.current.status);
    }
    expect(seen).toEqual(['connecting', 'buffering', 'playing', 'buffering', 'playing']);
    emit('error');
    expect(result.current).toMatchObject({ status: 'error', isPlaying: false });
  });

  it('reports an error when play() is rejected (e.g. autoplay blocked)', async () => {
    FakeAudio.playImpl = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    const { result } = mount();
    await play(result);
    expect(result.current.status).toBe('error');
  });

  it('toggle: same station pauses / resumes, another station switches', async () => {
    const { result } = mount();
    act(() => result.current.toggle(mp3));
    await vi.waitFor(() => expect(FakeAudio.last.src).toBe(mp3.url));
    emit('playing');
    act(() => result.current.toggle(mp3));
    expect(FakeAudio.last.pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);

    FakeAudio.last.play.mockClear();
    act(() => result.current.toggle(mp3));
    expect(FakeAudio.last.play).toHaveBeenCalledTimes(1);
    expect(FakeAudio.last.src).toBe(mp3.url);

    act(() => result.current.toggle(other));
    await vi.waitFor(() => expect(FakeAudio.last.src).toBe(other.url));
    expect(result.current.currentStation).toBe(other);
  });

  // BUG-13: toggle() on the current, errored station calls play() on the same
  // failed source; browsers do not re-fetch it, so the station stays dead.
  it.fails('toggling a station that errored reloads its source', async () => {
    const { result } = mount();
    await play(result);
    emit('error');
    FakeAudio.last.load.mockClear();
    act(() => result.current.toggle(mp3));
    await vi.waitFor(() => expect(FakeAudio.last.load).toHaveBeenCalled(), { timeout: 300 });
  });

  // BUG-5: play() awaits the playlist resolver without checking whether a
  // newer play() started meanwhile, so the slower, older call wins.
  it.fails('a slow playlist from an older click never overrides the newer station', async () => {
    server.use(
      http.get('https://edge.radio.test/slow.m3u', async () => {
        await delay(50);
        return HttpResponse.text('https://edge.radio.test/old-stream\n');
      }),
    );
    const { result } = mount();
    let first!: Promise<void>;
    act(() => {
      first = result.current.play({ ...mp3, url: 'https://edge.radio.test/slow.m3u' });
    });
    await play(result, other);
    await act(() => first);
    expect(FakeAudio.last.src).toBe(other.url);
  });
});

describe('usePlayer — HLS', () => {
  it('uses hls.js when supported and plays on MANIFEST_PARSED', async () => {
    const { result } = mount();
    await play(result, hls);
    const h = FakeHls.instances[0]!;
    expect(h.loadSource).toHaveBeenCalledWith(hls.url);
    expect(h.attachMedia).toHaveBeenCalledWith(FakeAudio.last);
    expect(FakeAudio.last.play).not.toHaveBeenCalled();
    act(() => h.trigger(FakeHls.Events.MANIFEST_PARSED));
    expect(FakeAudio.last.play).toHaveBeenCalled();
  });

  it('recovers from fatal network/media errors and tears down on others', async () => {
    const { result } = mount();
    await play(result, hls);
    const h = FakeHls.instances[0]!;
    act(() => h.trigger(FakeHls.Events.ERROR, { fatal: false, type: FakeHls.ErrorTypes.NETWORK_ERROR }));
    expect(result.current.status).toBe('connecting');
    act(() => h.trigger(FakeHls.Events.ERROR, { fatal: true, type: FakeHls.ErrorTypes.NETWORK_ERROR }));
    expect(h.startLoad).toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    act(() => h.trigger(FakeHls.Events.ERROR, { fatal: true, type: FakeHls.ErrorTypes.MEDIA_ERROR }));
    expect(h.recoverMediaError).toHaveBeenCalled();
    act(() => h.trigger(FakeHls.Events.ERROR, { fatal: true, type: FakeHls.ErrorTypes.OTHER_ERROR }));
    expect(h.destroy).toHaveBeenCalled();
  });

  // hls.js is loaded on demand (PERF-1); a load that finishes after a newer play/pause must not start playback.
  it('drops an HLS setup when the station changes while hls.js is loading', async () => {
    const { result } = mount();
    await act(async () => {
      const first = result.current.play(hls);
      const second = result.current.play(mp3);
      await Promise.all([first, second]);
    });
    expect(FakeHls.instances).toHaveLength(0);
    expect(FakeAudio.last.src).toBe(mp3.url);
  });

  it('drops an HLS setup when playback is paused while hls.js is loading', async () => {
    const { result } = mount();
    await act(async () => {
      const pending = result.current.play(hls);
      result.current.pause();
      await pending;
    });
    expect(FakeHls.instances).toHaveLength(0);
    expect(FakeAudio.last.play).not.toHaveBeenCalled();
  });

  it('destroys the previous Hls instance when switching stations', async () => {
    const { result } = mount();
    await play(result, hls);
    await play(result, other);
    expect(FakeHls.instances[0]!.destroyed).toBe(true);
    expect(FakeAudio.last.src).toBe(other.url);
  });

  it('uses native HLS on Safari (no MSE, canPlayType says yes)', async () => {
    FakeHls.supported = false;
    FakeAudio.nativeHls = true;
    const { result } = mount();
    await play(result, hls);
    expect(FakeHls.instances).toHaveLength(0);
    expect(FakeAudio.last.src).toBe(hls.url);
    expect(FakeAudio.last.play).toHaveBeenCalled();
  });

  it('reports an error when HLS is not playable at all', async () => {
    FakeHls.supported = false;
    const { result } = mount();
    await play(result, hls);
    expect(result.current.status).toBe('error');
  });
});

describe('usePlayer — watchdog, heartbeat, recovery', () => {
  it('the watchdog is cancelled when playback resumes', async () => {
    vi.useFakeTimers();
    const { result } = mount();
    await play(result);
    emit('waiting');
    emit('playing');
    await flowFor(9000);
    expect(result.current.status).toBe('playing');
  });

  it('the heartbeat flags a frozen stream as stalled after ~5 s', async () => {
    vi.useFakeTimers();
    const { result } = mount();
    await play(result);
    emit('playing');
    FakeAudio.last.currentTime = 12;
    await act(() => vi.advanceTimersByTimeAsync(500)); // records position 12
    await act(() => vi.advanceTimersByTimeAsync(5000)); // 10 checks without progress
    expect(result.current.status).toBe('playing');
    await act(() => vi.advanceTimersByTimeAsync(500)); // 11th → stalled
    expect(['stalled', 'recovering']).toContain(result.current.status);
  });

  it('keeps a stream that is progressing', async () => {
    vi.useFakeTimers();
    const { result } = mount();
    await play(result);
    emit('playing');
    await flowFor(10_000);
    expect(result.current.status).toBe('playing');
  });

  // BUG-2: listeners are bound once on mount and call the first render's
  // triggerReSync, whose currentStation is null — so recovery never runs.
  it.fails('the 8 s buffering watchdog starts a recovery attempt', async () => {
    vi.useFakeTimers();
    const { result } = mount();
    await play(result);
    emit('playing');
    emit('waiting');
    await act(() => vi.advanceTimersByTimeAsync(8000));
    expect(result.current.status).toBe('recovering');
  });

  it.fails('an error retries after 1 s, up to 3 times, then gives up', async () => {
    vi.useFakeTimers();
    const { result } = mount();
    await play(result);
    const audio = FakeAudio.last;
    audio.load.mockClear();
    for (let attempt = 1; attempt <= 3; attempt++) {
      emit('error');
      await act(() => vi.advanceTimersByTimeAsync(1000));
      expect(result.current.status).toBe('recovering');
      expect(audio.load).toHaveBeenCalledTimes(attempt);
    }
    emit('error');
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.status).toBe('error');
  });

  it.fails('a stalled heartbeat re-syncs the stream', async () => {
    vi.useFakeTimers();
    const { result } = mount();
    await play(result);
    emit('playing');
    const audio = FakeAudio.last;
    audio.load.mockClear();
    await act(() => vi.advanceTimersByTimeAsync(6500));
    expect(audio.load).toHaveBeenCalled();
  });

  // BUG-3: 'emptied'/'suspend' read the first render's isPlaying (false).
  it.fails('an emptied buffer while playing goes back to buffering', async () => {
    const { result } = mount();
    await play(result);
    emit('playing');
    emit('emptied');
    expect(result.current.status).toBe('buffering');
  });

  it('switching stations mid-recovery keeps the new station', async () => {
    vi.useFakeTimers();
    const { result } = mount();
    await play(result);
    emit('error');
    await play(result, other);
    emit('playing');
    await flowFor(10_000);
    expect(result.current.currentStation).toBe(other);
    expect(FakeAudio.last.src).toBe(other.url);
    expect(result.current.status).toBe('playing');
  });
});

describe('usePlayer — cleanup', () => {
  it('unmount stops audio, destroys Hls and clears the heartbeat', async () => {
    vi.useFakeTimers();
    const { result, unmount } = mount();
    await play(result, hls);
    const audio = FakeAudio.last;
    unmount();
    expect(audio.src).toBe('');
    expect(FakeHls.instances[0]!.destroyed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('unmount also clears a pending watchdog (via the pause it triggers)', async () => {
    vi.useFakeTimers();
    const { result, unmount } = mount();
    await play(result);
    emit('waiting');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
