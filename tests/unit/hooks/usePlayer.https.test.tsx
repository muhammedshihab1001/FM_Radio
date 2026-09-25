// @vitest-environment-options { "url": "https://nebula.test/" }
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayer } from '../../../src/hooks/usePlayer';
import { FakeAudio } from '../../setup/fakeMedia';
import { server } from '../../setup/msw';
import { makeStation } from '../../fixtures/stations';

vi.mock('hls.js', async () => ({ default: (await import('../../setup/fakeMedia')).FakeHls }));

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudio);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('usePlayer on an https page', () => {
  it('blocks a playlist that resolves to an http:// stream (mixed content)', async () => {
    server.use(
      http.get('https://dir.radio.test/list.pls', () => HttpResponse.text('File1=http://insecure.radio.test/live\n')),
    );
    const { result } = renderHook(() => usePlayer());
    await act(async () => {
      await result.current.play(makeStation(0, { url: 'https://dir.radio.test/list.pls' }));
    });
    expect(result.current.status).toBe('mixed-content');
    expect(result.current.isPlaying).toBe(false);
    expect(FakeAudio.last.play).not.toHaveBeenCalled();
  });

  // BUG-14: a blocked station returns before pausing the old one, so the
  // previous station keeps playing while the UI shows "Blocked · HTTP only".
  it.fails('stops the previous station when the next one is blocked', async () => {
    server.use(http.get('https://dir.radio.test/b.pls', () => HttpResponse.text('File1=http://insecure.radio.test/b')));
    const { result } = renderHook(() => usePlayer());
    await act(async () => {
      await result.current.play(makeStation(0, { url: 'https://edge.radio.test/a.mp3' }));
    });
    act(() => FakeAudio.last.emit('playing'));
    FakeAudio.last.pause.mockClear();
    await act(async () => {
      await result.current.play(makeStation(1, { url: 'https://dir.radio.test/b.pls' }));
    });
    expect(result.current.status).toBe('mixed-content');
    expect(FakeAudio.last.paused).toBe(true);
  });

  it('plays http:// station URLs by upgrading them instead of blocking', async () => {
    const { result } = renderHook(() => usePlayer());
    await act(async () => {
      await result.current.play(makeStation(0, { url: 'http://edge.radio.test/live.mp3' }));
    });
    expect(result.current.status).toBe('connecting');
    expect(FakeAudio.last.src).toBe('https://edge.radio.test/live.mp3');
  });
});
