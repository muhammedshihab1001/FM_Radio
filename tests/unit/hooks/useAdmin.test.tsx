import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useAdmin } from '../../../src/hooks/useAdmin';
import { api, server } from '../../setup/msw';

describe('useAdmin', () => {
  it('rejects bad credentials and accepts the configured ones (session persisted)', () => {
    const { result } = renderHook(() => useAdmin());
    act(() => {
      result.current.login('x', 'y');
    });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.error).toMatch(/Access Denied/);

    act(() => {
      result.current.login('test-admin', 'test-pass');
    });
    expect(result.current.isAdmin).toBe(true);
    expect(sessionStorage.getItem('ast_admin_session')).toBe('active');
    expect(renderHook(() => useAdmin()).result.current.isAdmin).toBe(true);

    act(() => result.current.logout());
    expect(result.current.isAdmin).toBe(false);
    expect(sessionStorage.getItem('ast_admin_session')).toBeNull();
  });

  it('fetches D1 status only when signed in, and surfaces errors', async () => {
    const { result } = renderHook(() => useAdmin());
    await act(() => result.current.fetchStatus());
    expect(result.current.d1Status).toBeNull();

    act(() => {
      result.current.login('test-admin', 'test-pass');
    });
    await act(() => result.current.fetchStatus());
    expect(result.current.d1Status).toMatchObject({ remaining: 3800 });

    server.use(http.get(api('/admin/d1/status'), () => HttpResponse.json({ success: false, error: 'quota locked' })));
    await act(() => result.current.fetchStatus());
    expect(result.current.error).toBe('quota locked');
  });

  it('markDead / restore / cleanup / resetQuota report success and failure', async () => {
    sessionStorage.setItem('ast_admin_session', 'active');
    server.use(
      http.post(api('/admin/dead/add'), () => HttpResponse.json({ success: true })),
      http.post(api('/admin/dead/restore'), () => HttpResponse.json({ success: true })),
      http.post(api('/admin/dead/cleanup'), () =>
        HttpResponse.json({ success: true, data: { deleted_from_stations: 3 } }),
      ),
      http.get(api('/admin/d1/reset'), () => HttpResponse.json({ success: true })),
    );
    const { result } = renderHook(() => useAdmin());
    await act(async () => {
      expect(await result.current.markDead('https://x.test/a')).toBe(true);
      expect(await result.current.restore('https://x.test/a')).toBe(true);
      expect(await result.current.cleanup()).toMatchObject({ data: { deleted_from_stations: 3 } });
      expect(await result.current.resetQuota()).toBe(true);
    });

    server.use(
      http.post(api('/admin/dead/add'), () => HttpResponse.error()),
      http.post(api('/admin/dead/restore'), () => HttpResponse.error()),
      http.post(api('/admin/dead/cleanup'), () => HttpResponse.error()),
      http.get(api('/admin/d1/reset'), () => HttpResponse.error()),
    );
    await act(async () => {
      expect(await result.current.markDead('u')).toBe(false);
      expect(await result.current.restore('u')).toBe(false);
      expect(await result.current.cleanup()).toBe(false);
      expect(await result.current.resetQuota()).toBe(false);
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });
});
