import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAudio } from '../../setup/fakeMedia';
import { ESTONIA } from '../../fixtures/stations';
import type * as StationCardModule from '../../../src/components/StationCard';

// Counts real renders of each StationCard (memo bail-outs are not counted).
const renders = new Map<string, number>();
vi.mock('../../../src/components/StationCard', async (importOriginal) => {
  const mod = await importOriginal<typeof StationCardModule>();
  const memo = mod.StationCard as unknown as { type: React.FC<{ station: { name: string } }>; compare?: never };
  const Inner = memo.type;
  const Counted = (props: React.ComponentProps<typeof mod.StationCard>) => {
    renders.set(props.station.name, (renders.get(props.station.name) ?? 0) + 1);
    return <Inner {...props} />;
  };
  return { ...mod, StationCard: React.memo(Counted, memo.compare) };
});
vi.mock('hls.js', async () => ({ default: (await import('../../setup/fakeMedia')).FakeHls }));

const { default: App } = await import('../../../src/App');
const total = () => [...renders.values()].reduce((a, b) => a + b, 0);

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudio);
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  renders.clear();
});

async function boot() {
  const user = userEvent.setup();
  render(<App />);
  await vi.waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(ESTONIA.length));
  vi.setSystemTime(Date.now() + 250);
  renders.clear();
  return user;
}

describe('station grid re-renders', () => {
  it('player status changes only re-render the affected card', async () => {
    const user = await boot();
    await user.click(screen.getByRole('button', { name: `Play ${ESTONIA[0]!.name}` }));
    await vi.waitFor(() => expect(FakeAudio.last.src).toBe(ESTONIA[0]!.url));
    renders.clear();
    for (const ev of ['loadstart', 'waiting', 'playing', 'waiting', 'playing']) act(() => FakeAudio.last.emit(ev));
    expect([...renders.keys()]).toEqual([ESTONIA[0]!.name]);
  });

  it('switching stations re-renders only the old and the new card', async () => {
    const user = await boot();
    await user.click(screen.getByRole('button', { name: `Play ${ESTONIA[0]!.name}` }));
    await vi.waitFor(() => expect(FakeAudio.last.src).toBe(ESTONIA[0]!.url));
    act(() => FakeAudio.last.emit('playing'));
    renders.clear();
    await user.click(screen.getByRole('button', { name: `Play ${ESTONIA[5]!.name}` }));
    await vi.waitFor(() => expect(FakeAudio.last.src).toBe(ESTONIA[5]!.url));
    expect(new Set(renders.keys())).toEqual(new Set([ESTONIA[0]!.name, ESTONIA[5]!.name]));
  });

  it('favoriting one station re-renders only that card', async () => {
    const user = await boot();
    const card = screen.getAllByRole('article')[3]!;
    await user.click(card.querySelector<HTMLButtonElement>('[aria-label="Add to favorites"]')!);
    expect([...renders.keys()]).toEqual([ESTONIA[3]!.name]);
  });

  it('scrolling never re-renders the grid and no scroll listener sets state', async () => {
    const added: string[] = [];
    const orig = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, ...rest: unknown[]) => {
      added.push(type);
      return orig(type, ...(rest as [EventListenerOrEventListenerObject]));
    });
    await boot();
    for (const y of [100, 400, 900, 1200, 50]) {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
      fireEvent.scroll(window);
    }
    expect(total()).toBe(0);
    expect(added).not.toContain('scroll');
  });
});
