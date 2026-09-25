import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { FakeAudio } from '../../setup/fakeMedia';
import { api, respond, server } from '../../setup/msw';
import { ESTONIA } from '../../fixtures/stations';

vi.mock('hls.js', async () => ({ default: (await import('../../setup/fakeMedia')).FakeHls }));

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudio);
  // useStations drops a load that starts < 200 ms after the previous one
  // (BUG-8); each user action below advances this Date-only clock by 250 ms.
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
});

const later = () => vi.setSystemTime(Date.now() + 250);
const heading = () => screen.getByRole('heading', { level: 1 });
const cards = () => screen.queryAllByRole('article');

async function boot() {
  const user = userEvent.setup();
  const view = render(<App />);
  await vi.waitFor(() => expect(cards()).toHaveLength(ESTONIA.length));
  later();
  return { user, ...view };
}

async function playFirst(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: `Play ${ESTONIA[0]!.name}` }));
  await vi.waitFor(() => expect(FakeAudio.last.src).toBe(ESTONIA[0]!.url));
  act(() => FakeAudio.last.emit('playing'));
  return screen.getByRole('region', { name: 'Now playing' });
}

describe('App — first load', () => {
  it('shows Estonia by default with counts, a card per station and one nav', async () => {
    await boot();
    expect(heading()).toHaveTextContent('Estonia');
    expect(screen.getByText('48 stations')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Search' })).not.toHaveAttribute('aria-current');
  });

  it('shows skeletons while the directory is slow', async () => {
    server.use(
      http.get(api('/stations'), async () => {
        await delay(300);
        return HttpResponse.json({ success: true, data: { stations: ESTONIA, next_cursor: null } });
      }),
    );
    render(<App />);
    expect(await screen.findByRole('status', { name: 'Loading stations' })).toBeInTheDocument();
    await vi.waitFor(() => expect(cards()).toHaveLength(ESTONIA.length));
    expect(screen.queryByRole('status', { name: 'Loading stations' })).toBeNull();
  });

  it('shows the API error instead of a blank page', async () => {
    server.use(http.get(api('/stations'), () => HttpResponse.json({ success: false, error: 'D1 quota exhausted' })));
    render(<App />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The station directory is busy right now.');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('explains a rate limit (429) in plain words', async () => {
    server.use(
      http.get(api('/stations'), () =>
        HttpResponse.json({ success: false, error: 'Too many requests' }, { status: 429 }),
      ),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many requests right now. Wait a few seconds, then try again.',
    );
  });
});

describe('App — keyboard shortcuts', () => {
  it('"/" focuses search; typing "/" inside it just types', async () => {
    const { user } = await boot();
    await user.keyboard('/');
    const input = screen.getByPlaceholderText('Search stations…');
    expect(input).toHaveFocus();
    await user.keyboard('a/b');
    expect(input).toHaveValue('a/b');
  });

  it('Space toggles playback — but never while typing or on a focused button', async () => {
    const { user } = await boot();
    await playFirst(user);
    const audio = FakeAudio.last;
    (document.activeElement as HTMLElement).blur();
    audio.pause.mockClear(); // play() itself pauses the element before switching source

    await user.keyboard(' ');
    expect(audio.pause).toHaveBeenCalledTimes(1);
    audio.play.mockClear();
    await user.keyboard(' ');
    expect(audio.play).toHaveBeenCalledTimes(1);

    const input = screen.getByPlaceholderText('Search stations…');
    await user.click(input);
    audio.play.mockClear();
    audio.pause.mockClear();
    await user.keyboard(' ');
    expect(input).toHaveValue(' ');
    expect(audio.pause).not.toHaveBeenCalled();

    const fav = within(cards()[3]!).getByRole('button', { name: 'Add to favorites' });
    fav.focus();
    await user.keyboard(' ');
    expect(within(cards()[3]!).getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument();
    expect(audio.pause).not.toHaveBeenCalled();
  });

  it('Esc closes the station modal and returns focus to Details', async () => {
    const { user } = await boot();
    const details = screen.getByRole('button', { name: `Details for ${ESTONIA[2]!.name}` });
    await user.click(details);
    expect(await screen.findByRole('dialog', { name: ESTONIA[2]!.name })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(details).toHaveFocus();
  });

  it('Shift+A toggles admin, but not while typing a capital A', async () => {
    const { user } = await boot();
    const input = screen.getByPlaceholderText('Search stations…');
    await user.click(input);
    await user.keyboard('{Shift>}A{/Shift}');
    expect(input).toHaveValue('A');
    expect(screen.queryByRole('heading', { name: 'Admin console' })).toBeNull();

    input.blur();
    await user.keyboard('{Shift>}A{/Shift}');
    expect(await screen.findByRole('heading', { name: 'Admin console' })).toBeInTheDocument();
    await user.keyboard('{Shift>}A{/Shift}');
    await vi.waitFor(() => expect(screen.queryByRole('heading', { name: 'Admin console' })).toBeNull());
  });
});

describe('App — flows', () => {
  it('browse → play → favorite → switch view → favorite survives a reload', async () => {
    const { user, unmount } = await boot();
    const player = await playFirst(user);
    expect(within(player).getByText(ESTONIA[0]!.name)).toBeInTheDocument();
    expect(within(cards()[0]!).getByText('Live')).toBeInTheDocument();

    await user.click(within(player).getByRole('button', { name: 'Add to favorites' }));
    later();
    await user.click(screen.getByRole('button', { name: 'Saved stations, 1' }));
    expect(heading()).toHaveTextContent('Your stations');
    expect(cards()).toHaveLength(1);

    unmount();
    render(<App />);
    await vi.waitFor(() => expect(cards().length).toBeGreaterThan(0));
    later();
    await user.click(screen.getByRole('button', { name: 'Saved stations, 1' }));
    expect(heading()).toHaveTextContent('Your stations');
    expect(within(cards()[0]!).getByRole('heading')).toHaveTextContent(ESTONIA[0]!.name);
  });

  it('"Try again" and re-tapping a failed card both restart the stream', async () => {
    const { user } = await boot();
    const player = await playFirst(user);
    act(() => FakeAudio.last.emit('error'));
    expect(within(player).getByText(/^Station offline ·/)).toBeInTheDocument();

    FakeAudio.last.load.mockClear();
    await user.click(within(player).getByRole('button', { name: 'Try again' }));
    await vi.waitFor(() => expect(FakeAudio.last.load).toHaveBeenCalledTimes(1));

    act(() => FakeAudio.last.emit('error'));
    FakeAudio.last.load.mockClear();
    await user.click(within(cards()[0]!).getByRole('button', { name: `Retry ${ESTONIA[0]!.name}` }));
    await vi.waitFor(() => expect(FakeAudio.last.load).toHaveBeenCalledTimes(1));
  });

  it('Charts, Shuffle and country filter each change the view', async () => {
    const { user } = await boot();
    await user.click(screen.getByRole('button', { name: 'Charts' }));
    await vi.waitFor(() => expect(heading()).toHaveTextContent('Global Top Charts'));
    await vi.waitFor(() => expect(cards()).toHaveLength(12));

    later();
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // → Brazil
    await user.click(
      within(screen.getByRole('navigation')).getByRole('button', { name: 'Shuffle to a random country' }),
    );
    await vi.waitFor(() => expect(heading()).toHaveTextContent('Brazil'));
    expect(screen.getByRole('button', { name: /Brazil/, expanded: false })).toBeInTheDocument(); // filter synced

    later();
    await user.click(screen.getByRole('button', { name: /Brazil/, expanded: false }));
    await user.click(screen.getByRole('option', { name: /Japan/ }));
    await vi.waitFor(() => expect(heading()).toHaveTextContent('Japan'));
  });

  it('search from the Search tab shows results', async () => {
    const { user } = await boot();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByPlaceholderText('Search stations…')).toHaveFocus();
    await user.keyboard('fixture{Enter}');
    await vi.waitFor(() => expect(heading()).toHaveTextContent('Results for "fixture"'), { timeout: 2000 });
    await vi.waitFor(() => expect(cards().length).toBeGreaterThan(10));
  });
});

describe('App — empty states', () => {
  it('favorites: explains and offers a way back', async () => {
    const { user } = await boot();
    await user.click(screen.getByRole('button', { name: 'Saved stations, 0' }));
    expect(screen.getByRole('heading', { name: 'Nothing saved yet' })).toBeInTheDocument();
    expect(screen.getByText('Tap the heart on any station to save it here.')).toBeInTheDocument();
    later();
    await user.click(screen.getByRole('button', { name: 'Browse stations' }));
    await vi.waitFor(() => expect(heading()).toHaveTextContent('Estonia'));
  });

  it('search with no results', async () => {
    const { user } = await boot();
    await user.click(screen.getByPlaceholderText('Search stations…'));
    await user.keyboard('zzzzqqq{Enter}');
    expect(await screen.findByRole('heading', { name: 'No stations found' }, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('That search or country turned up nothing. Try a different one.')).toBeInTheDocument();
    later();
    await user.click(screen.getByRole('button', { name: 'Back to Estonia' }));
    await vi.waitFor(() => expect(heading()).toHaveTextContent('Estonia'));
  });

  it('discovery feed unreachable', async () => {
    server.use(
      respond('/stations/random', []),
      http.get(api('/stations'), ({ request }) =>
        HttpResponse.json({
          success: true,
          data: {
            stations: new URL(request.url).searchParams.get('country') === 'Estonia' ? ESTONIA : [],
            next_cursor: null,
          },
        }),
      ),
    );
    const { user } = await boot();
    // With the random feed empty the hook falls back to a random country from a built-in list that
    // includes Estonia (the one country with stations here) — pin the pick so it is never Estonia.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await user.click(screen.getByRole('button', { name: /Estonia/, expanded: false }));
    await user.click(screen.getByRole('option', { name: /Global network/ }));
    expect(await screen.findByText("Couldn't reach the discovery feed. Try another shuffle.")).toBeInTheDocument();
  });
});

describe('App — configuration', () => {
  it('explains a missing API endpoint instead of failing silently', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { default: FreshApp } = await import('../../../src/App');
    render(<FreshApp />);
    expect(screen.getByRole('heading', { name: "Can't reach the station directory" })).toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
