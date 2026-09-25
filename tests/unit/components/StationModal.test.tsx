import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StationModal } from '../../../src/components/StationModal';
import type { Station } from '../../../src/types/terminal';
import { makeStation } from '../../fixtures/stations';

const station = makeStation(5, {
  name: 'Classic FM',
  country: 'France',
  city: 'Paris',
  genre: 'classical',
  bitrate: 128,
  codec: 'MP3',
  clickcount: 12345,
  url: 'https://edge.radio.test/classic.mp3',
});

function Harness({ onPlay = vi.fn() }: { onPlay?: (s: Station) => void }) {
  const [open, setOpen] = useState<Station | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(station)}>
        Open details
      </button>
      {open && <StationModal station={open} onClose={() => setOpen(null)} onPlay={onPlay} isPlaying={false} />}
    </>
  );
}

const openModal = async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open details' });
  await user.click(trigger);
  return { user, trigger, dialog: screen.getByRole('dialog', { name: 'Classic FM' }) };
};

describe('StationModal', () => {
  it('is a labelled modal dialog with every detail', async () => {
    const { dialog } = await openModal();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    for (const text of ['France', 'Paris', '128 kbps', 'MP3', 'classical', '12,345', 'Secure · HTTPS', station.url]) {
      expect(dialog).toHaveTextContent(text);
    }
  });

  it('moves focus to Close, traps Tab / Shift+Tab, and returns focus to the trigger', async () => {
    const { user, trigger, dialog } = await openModal();
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();

    const listen = screen.getByRole('button', { name: /Listen now/ });
    await user.tab({ shift: true });
    expect(listen).toHaveFocus(); // wrapped from first to last
    await user.tab();
    expect(close).toHaveFocus(); // wrapped from last to first
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes on backdrop click and via the Close button', async () => {
    const { user } = await openModal();
    await user.click(screen.getByTestId('modal-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open details' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clicks inside the dialog do not close it', async () => {
    const { user, dialog } = await openModal();
    await user.click(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('locks page scroll while open and restores it on close', async () => {
    const { user } = await openModal();
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('"Listen now" plays and closes; copy puts the stream URL on the clipboard', async () => {
    const onPlay = vi.fn();
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<Harness onPlay={onPlay} />);
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    await user.click(screen.getByRole('button', { name: 'Copy stream link' }));
    expect(writeText).toHaveBeenCalledWith(station.url);
    // toast text is set via innerText (a plain property in jsdom)
    expect(
      [...document.body.querySelectorAll<HTMLElement>('[role=status]')].some(
        (t) => t.innerText === 'Stream link copied',
      ),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: /Listen now/ }));
    expect(onPlay).toHaveBeenCalledWith(station);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('refuses to show or copy a non-http(s) URL', async () => {
    const user = userEvent.setup();
    render(
      <StationModal
        station={{ ...station, url: 'javascript:alert(1)' }}
        onClose={vi.fn()}
        onPlay={vi.fn()}
        isPlaying={false}
      />,
    );
    expect(screen.getByText('URL unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy stream link' })).toBeDisabled();
    await user.keyboard('{Tab}');
  });
});
