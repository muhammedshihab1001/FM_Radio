import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { StationCard } from '../../../src/components/StationCard';
import type { PlayerStatus, Station } from '../../../src/types/terminal';
import { api, server } from '../../setup/msw';
import { STATIONS, makeStation } from '../../fixtures/stations';

const base = makeStation(10, {
  name: 'Jazz FM',
  city: 'Tallinn',
  country: 'Estonia',
  codec: 'AAC',
  bitrate: 192,
  genre: 'jazz',
});

function renderCard(props: Partial<Parameters<typeof StationCard>[0]> = {}) {
  const handlers = { onPlay: vi.fn(), onFavorite: vi.fn(), onInfo: vi.fn() };
  const view = render(
    <StationCard
      station={base}
      active={false}
      isPlaying={false}
      isFavorite={false}
      status={null}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers, card: screen.getByRole('article', { name: (props.station ?? base).name }) };
}

describe('StationCard', () => {
  it('shows name, location and up to three meta tags', () => {
    const { card } = renderCard();
    expect(within(card).getByRole('heading', { name: 'Jazz FM' })).toBeInTheDocument();
    expect(within(card).getByText('Tallinn, Estonia')).toBeInTheDocument();
    for (const tag of ['AAC', '192K', 'jazz']) expect(within(card).getByText(tag)).toBeInTheDocument();
  });

  it('plays the station from the whole-card button and records a click', async () => {
    const posted = vi.fn();
    server.use(
      http.post(api('/stations/click'), async ({ request }) => {
        posted(await request.json());
        return HttpResponse.json({ success: true });
      }),
    );
    const { onPlay } = renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Play Jazz FM' }));
    expect(onPlay).toHaveBeenCalledWith(base);
    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({ id: String(base.id) }));
  });

  it('is keyboard operable: Enter and Space activate the play button', async () => {
    const { onPlay } = renderCard();
    const play = screen.getByRole('button', { name: 'Play Jazz FM' });
    play.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onPlay).toHaveBeenCalledTimes(2);
  });

  it('favorite and details buttons act without starting playback', async () => {
    const { onPlay, onFavorite, onInfo } = renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Add to favorites' }));
    await userEvent.click(screen.getByRole('button', { name: 'Details for Jazz FM' }));
    expect(onFavorite).toHaveBeenCalledWith(base);
    expect(onInfo).toHaveBeenCalledWith(base);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('reflects the favorite state', () => {
    renderCard({ isFavorite: true });
    expect(screen.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('playing: LIVE badge, pause action, cyan border, no glow disc', () => {
    const { card } = renderCard({ active: true, isPlaying: true, status: 'playing' });
    expect(within(card).getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause Jazz FM' })).toBeInTheDocument();
    expect(card.className).toContain('border-cyan/50');
    expect(card.querySelector('.shadow-glow')).toBeNull(); // glow only on the card edge, never the centre button
  });

  it.each<[PlayerStatus, string]>([
    ['connecting', 'Tuning…'],
    ['buffering', 'Buffering…'],
    ['recovering', 'Reconnecting…'],
    ['stalled', 'Weak signal'],
    ['error', 'Station offline'],
    ['mixed-content', 'Blocked · HTTP only'],
  ])('status %s shows "%s" on the active card only', (status, label) => {
    const { card, rerender, onPlay, onFavorite, onInfo } = renderCard({ active: true, status });
    expect(within(card).getByText(label)).toBeInTheDocument();
    const failed = status === 'error' || status === 'mixed-content';
    expect(screen.getByRole('button', { name: `${failed ? 'Retry' : 'Play'} Jazz FM` })).toBeInTheDocument();
    rerender(
      <StationCard
        station={base}
        active={false}
        isPlaying={false}
        isFavorite={false}
        status={null}
        onPlay={onPlay}
        onFavorite={onFavorite}
        onInfo={onInfo}
      />,
    );
    expect(within(card).queryByText(label)).toBeNull();
  });

  it.each(STATIONS.slice(0, 6).map((s) => [s.name, s] as [string, Station]))(
    'renders a long / unicode name safely: %s',
    (_n, station) => {
      const { card } = renderCard({ station });
      const heading = within(card).getByRole('heading', { name: station.name });
      expect(heading).toHaveClass('truncate');
      expect(screen.getByRole('button', { name: `Play ${station.name}` })).toBeInTheDocument();
    },
  );

  it('never renders station data as HTML', () => {
    const evil = makeStation(1, { name: '<img src=x onerror=alert(1)>', city: '<b>x</b>' });
    const { card } = renderCard({ station: evil });
    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector('b')).toBeNull();
    expect(within(card).getByRole('heading')).toHaveTextContent('<img src=x onerror=alert(1)>');
  });
});
