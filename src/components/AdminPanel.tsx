import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../hooks/useAdmin';

interface CleanupResult {
  deleted_from_stations?: number;
  deleted_from_dead_streams?: number;
  batches_processed?: number;
}

interface ApiEnvelope {
  success?: boolean;
  data?: unknown;
  error?: string;
}

// Cleanup responses carry CleanupResult in `data`; other endpoints reuse the envelope.
type CleanupEnvelope = ApiEnvelope & { data?: CleanupResult | null };

const isEnvelope = (v: unknown): v is CleanupEnvelope => typeof v === 'object' && v !== null && 'success' in v;

const endpointHost = () => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  try {
    return new URL(base).hostname;
  } catch {
    return base || '—';
  }
};

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { isAdmin, loading, error, d1Status, login, logout, fetchStatus, markDead, restore, cleanup, resetQuota } =
    useAdmin();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [deadUrl, setDeadUrl] = useState('');
  const [healthStatus, setHealthStatus] = useState<Record<string, string>>({});
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  useEffect(() => {
    if (isAdmin) {
      void fetchStatus();
      const interval = setInterval(() => void fetchStatus(), 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchStatus]);

  const handleCleanup = useCallback(async () => {
    const res: unknown = await cleanup();
    if (isEnvelope(res) && res.success && typeof res.data === 'object' && res.data !== null) {
      setCleanupResult(res.data);
    }
  }, [cleanup]);

  const handleReset = useCallback(async () => {
    if (confirm('Reset the daily database read quota?')) {
      await resetQuota();
    }
  }, [resetQuota]);

  const runHealthCheck = useCallback(async () => {
    setHealthStatus({ system: 'Scanning…' });
    const tests = [
      { name: 'Stations', endpoint: '/stations?limit=1' },
      { name: 'Random', endpoint: '/stations/random' },
      { name: 'Stats', endpoint: '/stats' },
      { name: 'Registry', endpoint: '/countries' },
    ];

    const API = import.meta.env.VITE_API_BASE_URL ?? '';
    const results: Record<string, string> = {};

    for (const test of tests) {
      try {
        const t0 = performance.now();
        const res = await fetch(`${API}${test.endpoint}`);
        const t1 = performance.now();
        const json = (await res.json()) as ApiEnvelope;

        if (json.success) {
          let summary = `Up · ${Math.round(t1 - t0)}ms`;
          if (test.name === 'Stats') {
            const data = (json.data ?? {}) as { total_stations?: number; total?: number };
            const total = data.total_stations ?? data.total ?? 0;
            summary = `${total.toLocaleString()} stations`;
          } else if (test.name === 'Registry') {
            summary = `${Array.isArray(json.data) ? json.data.length : 0} regions`;
          }
          results[test.name] = summary;
        } else {
          results[test.name] = `Failed: ${json.error}`;
        }
      } catch (err: unknown) {
        results[test.name] = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    setHealthStatus(results);
  }, []);

  const field =
    'w-full h-11 rounded-button bg-base border border-line/10 px-4 text-[16px] md:text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-cyan/40 transition-colors';
  const btn = 'min-h-[44px] px-4 rounded-button border text-xs font-medium transition-colors';

  if (!isAdmin) {
    return (
      <div className="card-enter flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-full max-w-sm p-7 rounded-card surface-raised space-y-6">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-primary tracking-[-0.01em]">Admin console</h1>
            <p className="text-xs text-tertiary">Sign in to manage the broadcast network</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login(user, pass);
            }}
            className="space-y-3.5 text-left"
          >
            <div className="space-y-1.5">
              <label htmlFor="admin-user" className="text-2xs font-mono text-tertiary uppercase tracking-wide">
                Admin ID
              </label>
              <input
                id="admin-user"
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className={field}
                placeholder="Username"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="admin-pass" className="text-2xs font-mono text-tertiary uppercase tracking-wide">
                Password
              </label>
              <input
                id="admin-pass"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className={field}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-danger text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-button bg-cyan text-on-accent text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-tertiary hover:text-primary transition-colors min-h-[44px]"
          >
            ← Back to stations
          </button>
        </div>
      </div>
    );
  }

  const pct = parseFloat(d1Status?.percentage || '0');

  return (
    <div className="card-enter max-w-4xl mx-auto space-y-6 pb-20 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-line/[0.06]">
        <div>
          <h1 className="text-xl font-semibold text-primary tracking-[-0.01em]">Broadcast control</h1>
          <p className="font-mono text-xs text-tertiary mt-1">Network administration</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            onClose();
          }}
          className="min-h-[44px] px-4 rounded-button surface-raised text-xs font-medium text-secondary hover:text-danger transition-colors self-start"
        >
          Sign out
        </button>
      </div>

      {/* Telemetry */}
      <div className="p-6 rounded-card surface-raised space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-primary">Network stability</h2>
            <p className="text-xs text-tertiary mt-0.5">
              Circuit breaker:{' '}
              <span className={d1Status?.can_query ? 'text-cyan' : 'text-danger'}>
                {d1Status?.can_query ? 'Operational' : 'Protected mode'}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className={`${btn} border-danger/25 text-danger hover:bg-danger/10`}
            >
              Reset quota
            </button>
            <button
              type="button"
              onClick={runHealthCheck}
              className={`${btn} border-line/10 text-secondary hover:text-primary`}
            >
              Scan endpoints
            </button>
            <button
              type="button"
              onClick={fetchStatus}
              className={`${btn} border-line/10 text-secondary hover:text-primary`}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Reads today', value: (d1Status?.reads_today ?? 0).toLocaleString() },
            { label: 'Remaining', value: (d1Status?.remaining ?? 0).toLocaleString(), accent: true },
            { label: 'Quota used', value: `${d1Status?.percentage ?? '0'}%` },
            { label: 'Endpoint', value: endpointHost() },
          ].map((m) => (
            <div key={m.label} className="p-3.5 rounded-button bg-base">
              <p className="text-2xs font-mono text-tertiary uppercase tracking-wide mb-1">{m.label}</p>
              <p
                className={`font-mono text-lg font-semibold tabular truncate ${m.accent ? 'text-cyan' : 'text-primary'}`}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {d1Status && (
          <div
            className="h-1.5 rounded-full bg-base overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Quota used"
          >
            <div
              className={`h-full rounded-full transition-all duration-standard ${pct > 90 ? 'bg-danger' : pct > 70 ? 'bg-warn' : 'bg-cyan'}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        )}

        {Object.keys(healthStatus).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-line/[0.06]">
            {Object.entries(healthStatus).map(([name, status]) => (
              <div key={name} className="p-2.5 rounded-button bg-base">
                <p className="text-2xs font-mono text-tertiary uppercase mb-0.5">{name}</p>
                <p
                  className={`text-2xs font-mono font-medium ${status.includes('Fail') || status.includes('Error') ? 'text-danger' : 'text-cyan'}`}
                >
                  {status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-card surface-raised space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-primary">Broken stream registry</h2>
            <p className="text-xs text-tertiary mt-0.5">Block or restore an inactive station's stream URL.</p>
          </div>
          <input
            type="url"
            value={deadUrl}
            onChange={(e) => setDeadUrl(e.target.value)}
            className={field}
            placeholder="https://station-url.mp3"
            aria-label="Stream URL"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void markDead(deadUrl);
                setDeadUrl('');
              }}
              disabled={loading}
              className={`${btn} flex-1 border-danger/25 text-danger hover:bg-danger/10 disabled:opacity-40`}
            >
              {loading ? 'Working…' : 'Remove'}
            </button>
            <button
              type="button"
              onClick={() => {
                void restore(deadUrl);
                setDeadUrl('');
              }}
              disabled={loading}
              className={`${btn} flex-1 border-cyan/25 text-cyan hover:bg-cyan-dim disabled:opacity-40`}
            >
              Restore
            </button>
          </div>
        </div>

        <div className="p-6 rounded-card surface-raised flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-primary">System sweep</h2>
            <p className="text-xs text-tertiary mt-0.5">Purge the exclusion registry and refresh the signal mesh.</p>
          </div>
          <button
            type="button"
            onClick={handleCleanup}
            disabled={loading}
            className="w-full h-11 rounded-button bg-magenta-dim border border-magenta/30 text-magenta-ink text-sm font-medium disabled:opacity-40 transition-colors hover:bg-magenta/20"
          >
            {loading ? 'Cleaning…' : 'Start sweep'}
          </button>

          {cleanupResult && (
            <div className="card-enter p-3.5 rounded-button bg-base space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-line/[0.06]">
                <span className="text-2xs font-mono text-tertiary uppercase">Result</span>
                <button
                  type="button"
                  onClick={() => setCleanupResult(null)}
                  className="text-2xs text-tertiary hover:text-primary min-h-[44px] min-w-[44px] -my-3 -mr-2"
                >
                  Close
                </button>
              </div>
              <div className="font-mono text-2xs grid grid-cols-2 gap-1.5 tabular">
                <span className="text-tertiary">Stations removed</span>
                <span className="text-right text-magenta">{cleanupResult.deleted_from_stations}</span>
                <span className="text-tertiary">Registry removed</span>
                <span className="text-right text-magenta">{cleanupResult.deleted_from_dead_streams}</span>
                <span className="text-tertiary">Batches</span>
                <span className="text-right text-secondary">{cleanupResult.batches_processed}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
