import { useState, useCallback } from 'react';
import * as api from '../services/api';

const ADMIN_USER = import.meta.env.VITE_ADMIN_USER;
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS;
const ADMIN_KEY  = import.meta.env.VITE_ADMIN_KEY;

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('ast_admin_session') === 'active';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback((user: string, pass: string) => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      setIsAdmin(true);
      sessionStorage.setItem('ast_admin_session', 'active');
      setError(null);
      return true;
    }
    setError('Access Denied: Biometric/Credential Mismatch');
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
    sessionStorage.removeItem('ast_admin_session');
  }, []);

  const markDead = useCallback(async (url: string) => {
    setLoading(true);
    try {
      await api.addDeadStream(url, ADMIN_KEY);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const restore = useCallback(async (url: string) => {
    setLoading(true);
    try {
      await api.restoreStream(url, ADMIN_KEY);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const cleanup = useCallback(async () => {
    setLoading(true);
    try {
      await api.cleanupDeadStreams(ADMIN_KEY);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { isAdmin, loading, error, login, logout, markDead, restore, cleanup };
}
