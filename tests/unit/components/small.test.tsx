import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomTabBar } from '../../../src/components/BottomTabBar';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';
import { Footer } from '../../../src/components/Footer';
import { InstallPrompt } from '../../../src/components/InstallPrompt';
import { OfflineBanner } from '../../../src/components/OfflineBanner';
import { SectionHeading } from '../../../src/components/SectionHeading';
import { UpdateToast } from '../../../src/components/UpdateToast';
import { pwaMock } from '../../setup/pwa-register-mock';

describe('OfflineBanner', () => {
  it('appears on offline and disappears on online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent("You're offline — radio needs a connection");
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('starts visible when the browser is already offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('InstallPrompt', () => {
  const fireInstallPrompt = (outcome: 'accepted' | 'dismissed') => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome }),
    });
    act(() => void window.dispatchEvent(event));
    return event;
  };

  it('is hidden until the browser offers installation, then replays the prompt', async () => {
    render(<InstallPrompt />);
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
    const event = fireInstallPrompt('accepted');
    expect(event.defaultPrevented).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(event.prompt).toHaveBeenCalled();
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull());
  });

  it('hides after the app is installed', () => {
    render(<InstallPrompt />);
    fireInstallPrompt('dismissed');
    act(() => void window.dispatchEvent(new Event('appinstalled')));
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  it('renders nothing when already running standalone', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) =>
        ({
          matches: q === '(display-mode: standalone)',
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as MediaQueryList,
    );
    const { container } = render(<InstallPrompt />);
    fireInstallPrompt('accepted');
    expect(container).toBeEmptyDOMElement();
  });

  it('on iOS shows a one-time "Add to Home Screen" tip', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tap Share → Add to Home Screen');
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(localStorage.getItem('nc_ios_install_tip_seen_v1')).toBe('1');
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  const ua = (value: string, platform = 'Win32', touch = 0) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(value);
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
    // jsdom has no maxTouchPoints; define it for this test only.
    Object.defineProperty(navigator, 'maxTouchPoints', { value: touch, configurable: true });
  };
  afterEach(() => Reflect.deleteProperty(navigator, 'maxTouchPoints'));
  const MAC_SAFARI =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

  it('on iPhone the tip sits at the bottom, next to the Safari Share button', async () => {
    ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5);
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(screen.getByRole('status').className).toMatch(/bottom-/);
  });

  it('on iPad (which reports itself as a Mac) the tip sits at the top', async () => {
    ua(MAC_SAFARI, 'MacIntel', 5);
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }));
    const tip = screen.getByRole('status');
    expect(tip).toHaveTextContent('Tap Share → Add to Home Screen');
    expect(tip.className).toMatch(/top-/);
  });

  it('on Safari 17+ for Mac offers "Add to Dock"', async () => {
    ua(MAC_SAFARI, 'MacIntel', 0);
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(screen.getByRole('status')).toHaveTextContent('Click Share → Add to Dock');
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(localStorage.getItem('nc_mac_install_tip_seen_v1')).toBe('1');
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  it('shows nothing for Chrome on a Mac or older Safari until the browser offers installation', () => {
    ua(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      'MacIntel',
      0,
    );
    const { unmount } = render(<InstallPrompt />);
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
    unmount();
    ua(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
      'MacIntel',
      0,
    );
    render(<InstallPrompt />);
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  it('never breaks when storage is blocked (e.g. Safari with website data blocked)', async () => {
    ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }));
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('UpdateToast', () => {
  afterEach(() => {
    pwaMock.needRefresh = false;
  });
  it('is silent until an update is waiting', () => {
    const { container } = render(<UpdateToast />);
    expect(container).toBeEmptyDOMElement();
  });
  it('refreshes into the new service worker, or can be dismissed', async () => {
    pwaMock.needRefresh = true;
    const { unmount } = render(<UpdateToast />);
    expect(screen.getByText('New version available')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(pwaMock.updateServiceWorker).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('New version available')).toBeNull();
    unmount();
  });
});

describe('BottomTabBar', () => {
  const props = () => ({
    favCount: 3,
    cooldown: 0,
    onHome: vi.fn(),
    onTrending: vi.fn(),
    onRandom: vi.fn(),
    onFavorites: vi.fn(),
    onSearch: vi.fn(),
  });

  it('marks the current tab and wires every tab to its handler', async () => {
    const p = props();
    render(<BottomTabBar mode="favorites" {...p} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(screen.getByRole('button', { name: 'Saved stations, 3' })).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    for (const name of ['Home', 'Charts', 'Shuffle to a random country', 'Saved stations, 3', 'Search']) {
      await userEvent.click(screen.getByRole('button', { name }));
    }
    for (const fn of [p.onHome, p.onTrending, p.onRandom, p.onFavorites, p.onSearch])
      expect(fn).toHaveBeenCalledTimes(1);
  });

  it('shows the shuffle cooldown and caps the saved badge at 99+', () => {
    render(<BottomTabBar mode="search" {...props()} favCount={140} cooldown={2} />);
    expect(screen.getByRole('button', { name: 'Shuffle available in 2s' })).toBeDisabled();
    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('SectionHeading / Footer', () => {
  it('heading renders title, subtitle and live dot — and no action button', () => {
    const { container } = render(<SectionHeading title="Global Top Charts" subtitle="48 stations" live />);
    expect(screen.getByRole('heading', { level: 1, name: 'Global Top Charts' })).toBeInTheDocument();
    expect(screen.getByText('48 stations')).toBeInTheDocument();
    expect(container.querySelector('.animate-ping')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('footer shows counts and opens admin', async () => {
    const onAdminClick = vi.fn();
    render(<Footer stats={null} stationCount={872268} countryCount={189} onAdminClick={onAdminClick} />);
    expect(screen.getByText('872,268 stations')).toBeInTheDocument();
    expect(screen.getByText('189 regions')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Admin' }));
    expect(onAdminClick).toHaveBeenCalled();
  });
});

describe('ErrorBoundary', () => {
  const Boom = (): never => {
    throw new Error('kaboom');
  };

  it('replaces a crashed app with a styled page and a Reload button', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload });
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalled();
  });

  it('inline variant keeps the layout and can be closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onReset = vi.fn();
    const { rerender } = render(
      <ErrorBoundary variant="inline" onReset={onReset}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent("This part didn't load");
    rerender(
      <ErrorBoundary variant="inline" onReset={onReset}>
        <p>recovered</p>
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onReset).toHaveBeenCalled();
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });
});
