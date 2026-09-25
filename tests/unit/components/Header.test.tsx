import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../../../src/components/Header';

type Props = Parameters<typeof Header>[0];

function renderHeader(over: Partial<Props> = {}) {
  const props: Props = {
    onSearch: vi.fn(),
    searchQuery: '',
    onBack: vi.fn(),
    onFavToggle: vi.fn(),
    onTrending: vi.fn(),
    onAdminToggle: vi.fn(),
    favCount: 0,
    mode: 'home',
    isPlaying: false,
    onRandom: vi.fn(),
    cooldown: 0,
    ...over,
  };
  const view = render(<Header {...props} />);
  return { ...view, props, input: screen.getByPlaceholderText('Search stations…') };
}

describe('Header', () => {
  it('submits the typed query and hints when it is too short', async () => {
    const user = userEvent.setup();
    const { props, input } = renderHeader();
    await user.click(input);
    await user.type(input, 'ja');
    expect(screen.getByRole('status')).toHaveTextContent('Type at least 3 characters');
    await user.type(input, 'zz{Enter}');
    expect(props.onSearch).toHaveBeenCalledWith('jazz');
    expect(input).not.toHaveFocus(); // keyboard is dismissed on submit
  });

  it('clears the query but keeps the field focused for retyping', async () => {
    const user = userEvent.setup();
    const { props, input, rerender } = renderHeader();
    await user.click(input);
    await user.type(input, 'rock');
    rerender(<Header {...props} searchQuery="rock" mode="search" />);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(props.onSearch).toHaveBeenLastCalledWith('');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('syncs the field when the query changes from outside (e.g. reset)', () => {
    const { props, input, rerender } = renderHeader();
    rerender(<Header {...props} searchQuery="blues" mode="search" />);
    expect(input).toHaveValue('blues');
    rerender(<Header {...props} searchQuery="" mode="home" />);
    expect(input).toHaveValue('');
  });

  it('action buttons call their handlers and expose state', async () => {
    const user = userEvent.setup();
    const { props } = renderHeader({ mode: 'trending', favCount: 4 });
    const charts = screen.getByRole('button', { name: 'Top charts' });
    expect(charts).toHaveAttribute('aria-pressed', 'true');
    await user.click(charts);
    await user.click(screen.getByRole('button', { name: 'Shuffle to a random country' }));
    await user.click(screen.getByRole('button', { name: 'Favorites, 4 saved' }));
    expect(props.onTrending).toHaveBeenCalled();
    expect(props.onRandom).toHaveBeenCalled();
    expect(props.onFavToggle).toHaveBeenCalled();
  });

  it('shows the shuffle cooldown and disables the button', () => {
    renderHeader({ cooldown: 2 });
    const shuffle = screen.getByRole('button', { name: 'Shuffle available in 2s' });
    expect(shuffle).toBeDisabled();
    expect(shuffle).toHaveTextContent('2s');
  });

  it('logo goes home; five quick taps open admin instead', () => {
    // Only Date is faked and it never moves on its own, so the taps are "quick" however loaded the machine is.
    vi.useFakeTimers({ toFake: ['Date'] });
    const { props } = renderHeader();
    const logo = screen.getByRole('button', { name: 'Nebula Cast FM — home' });
    fireEvent.click(logo);
    expect(props.onBack).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 4; i++) fireEvent.click(logo);
    expect(props.onAdminToggle).toHaveBeenCalledTimes(1);
    expect(props.onBack).toHaveBeenCalledTimes(4);
  });
});
