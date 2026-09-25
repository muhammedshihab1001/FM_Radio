import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MiniPlayer } from '../../../src/components/MiniPlayer';
import type { PlayerStatus } from '../../../src/types/terminal';
import { makeStation } from '../../fixtures/stations';

const station = makeStation(3, { name: 'Radio Eins', country: 'Germany' });

function renderPlayer(status: PlayerStatus, extra: Partial<Parameters<typeof MiniPlayer>[0]> = {}) {
  const props = {
    station,
    isPlaying: status === 'playing',
    status,
    volume: 0.6,
    onToggle: vi.fn(),
    onRetry: vi.fn(),
    onVolumeChange: vi.fn(),
    onFavorite: vi.fn(),
    isFavorite: false,
    ...extra,
  };
  render(<MiniPlayer {...props} />);
  return props;
}

describe('MiniPlayer', () => {
  it.each<[PlayerStatus, string, boolean]>([
    ['idle', 'Ready', false],
    ['connecting', 'Tuning…', false],
    ['playing', 'On air', false],
    ['buffering', 'Buffering…', false],
    ['recovering', 'Reconnecting…', false],
    ['stalled', 'Weak signal', true],
    ['error', 'Station offline', true],
    ['mixed-content', 'Blocked · HTTP only', false],
  ])('%s → "%s" (announced), retry=%s', (status, label, retry) => {
    renderPlayer(status);
    expect(screen.getByText(`${label} · Germany`)).toBeVisible();
    const live = screen.getByRole('status');
    expect(live).toHaveTextContent(`${label}: Radio Eins`);
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(!!screen.queryByRole('button', { name: 'Try again' })).toBe(retry);
  });

  it('play/pause label follows playback', () => {
    renderPlayer('playing');
    expect(screen.getByRole('button', { name: 'Pause Radio Eins' })).toBeInTheDocument();
  });

  it('"Try again" restarts the stream (not a plain toggle)', async () => {
    const props = renderPlayer('error');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(props.onToggle).not.toHaveBeenCalled();
  });

  it('volume slider exposes a readable value and reports changes', () => {
    const props = renderPlayer('playing');
    const [slider] = screen.getAllByRole('slider', { name: 'Volume' });
    expect(slider).toHaveAttribute('aria-valuetext', '60%');
    fireEvent.change(slider!, { target: { value: '0.25' } });
    expect(props.onVolumeChange).toHaveBeenCalledWith(0.25);
  });

  it('mobile volume flyout toggles open', async () => {
    renderPlayer('playing');
    const toggle = screen.getByRole('button', { name: 'Volume' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('slider', { name: 'Volume' })).toHaveLength(2);
  });

  it('favorite button reflects and toggles state', async () => {
    const props = renderPlayer('idle', { isFavorite: true });
    const fav = screen.getByRole('button', { name: 'Remove from favorites' });
    expect(fav).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(fav);
    expect(props.onFavorite).toHaveBeenCalled();
  });
});
