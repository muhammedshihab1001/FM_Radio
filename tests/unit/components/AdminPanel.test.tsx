import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { AdminPanel } from '../../../src/components/AdminPanel';
import { api, server } from '../../setup/msw';

const signIn = async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<AdminPanel onClose={onClose} />);
  await user.type(screen.getByLabelText('Admin ID'), 'test-admin');
  await user.type(screen.getByLabelText('Password'), 'test-pass');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('heading', { name: 'Broadcast control' });
  return { user, onClose };
};

describe('AdminPanel', () => {
  it('login UI: labelled fields, error on bad credentials, back link', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AdminPanel onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Admin console' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    await user.type(screen.getByLabelText('Admin ID'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Access Denied');
    await user.click(screen.getByRole('button', { name: '← Back to stations' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('dashboard shows D1 metrics and a quota meter', async () => {
    await signIn();
    for (const v of ['1,200', '3,800', '24.0%', 'api.test', 'Operational'])
      expect(await screen.findByText(v)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Quota used' })).toHaveAttribute('aria-valuenow', '24');
  });

  it('scan endpoints reports each check', async () => {
    const { user } = await signIn();
    await user.click(screen.getByRole('button', { name: 'Scan endpoints' }));
    expect(await screen.findByText('872,268 stations')).toBeInTheDocument();
    expect(screen.getByText('9 regions')).toBeInTheDocument();
    expect(screen.getAllByText(/^Up · \d+ms$/)).toHaveLength(2);
  });

  it('remove / restore a stream, run the sweep, reset quota, sign out', async () => {
    const posted: string[] = [];
    server.use(
      http.post(api('/admin/dead/add'), async ({ request }) => {
        posted.push(`add ${await request.text()}`);
        return HttpResponse.json({ success: true });
      }),
      http.post(api('/admin/dead/restore'), async ({ request }) => {
        posted.push(`restore ${await request.text()}`);
        return HttpResponse.json({ success: true });
      }),
      http.post(api('/admin/dead/cleanup'), () =>
        HttpResponse.json({
          success: true,
          data: { deleted_from_stations: 7, deleted_from_dead_streams: 2, batches_processed: 1 },
        }),
      ),
      http.get(api('/admin/d1/reset'), () => {
        posted.push('reset');
        return HttpResponse.json({ success: true });
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user, onClose } = await signIn();
    const url = screen.getByRole('textbox', { name: 'Stream URL' });
    await user.type(url, 'https://dead.test/a');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.type(url, 'https://dead.test/b');
    await user.click(await screen.findByRole('button', { name: 'Restore' }));
    await user.click(screen.getByRole('button', { name: 'Reset quota' }));
    await vi.waitFor(() =>
      expect(posted).toEqual(['add {"url":"https://dead.test/a"}', 'restore {"url":"https://dead.test/b"}', 'reset']),
    );

    await user.click(screen.getByRole('button', { name: 'Start sweep' }));
    const result = (await screen.findByText('Stations removed')).parentElement!;
    expect(within(result).getByText('7')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Stations removed')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onClose).toHaveBeenCalled();
    expect(sessionStorage.getItem('ast_admin_session')).toBeNull();
  });
});
