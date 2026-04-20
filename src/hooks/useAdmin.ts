import { useState, useCallback } from 'react';
import * as api from '../services/api';

const ADMIN_USER = import.meta.env.VITE_ADMIN_USER;
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS;
const ADMIN_KEY  = import.meta.env.VITE_ADMIN_KEY;

export interface D1Status {
  reads_today: number;
  limit: number;
  remaining: number;
  percentage: string;
  can_query: boolean;
}

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('ast_admin_session') === 'active';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [d1Status, setD1Status] = useState<D1Status | null>(null);

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
    setD1Status(null);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const status = await api.fetchAdminStatus(ADMIN_KEY);
      setD1Status(status);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const markDead = useCallback(async (url: string) => {
    setLoading(true);
    try {
      await api.addDeadStream(url, ADMIN_KEY);
      await fetchStatus();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const restore = useCallback(async (url: string) => {
    setLoading(true);
    try {
      await api.restoreStream(url, ADMIN_KEY);
      await fetchStatus();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const cleanup = useCallback(async () => {
    setLoading(true);
    try {
      await api.cleanupDeadStreams(ADMIN_KEY);
      await fetchStatus();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  return { 
    isAdmin, loading, error, d1Status, 
    login, logout, fetchStatus, markDead, restore, cleanup 
  };
}
