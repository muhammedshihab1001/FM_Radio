import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../hooks/useAdmin';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { isAdmin, loading, error, d1Status, login, logout, fetchStatus, markDead, restore, cleanup } = useAdmin();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [deadUrl, setDeadUrl] = useState('');
  const [healthStatus, setHealthStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAdmin) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 30000); 
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchStatus]);

  const runHealthCheck = useCallback(async () => {
    setHealthStatus({ system: 'SCANNING...' });
    const tests = [
      { name: 'STATIONS', endpoint: '/stations?limit=1' },
      { name: 'RANDOM',   endpoint: '/stations/random' },
      { name: 'STATS',    endpoint: '/stats' },
      { name: 'REGISTRY', endpoint: '/countries' }
    ];
    
    const API = import.meta.env.VITE_API_BASE_URL;
    const results: Record<string, string> = {};

    for (const test of tests) {
      try {
        const t0 = performance.now();
        const res = await fetch(`${API}${test.endpoint}`);
        const t1 = performance.now();
        const json = await res.json();
        
        if (json.success) {
          let summary = `UP (${Math.round(t1-t0)}ms)`;
          if (test.name === 'STATS') {
            const total = json.data?.total_stations ?? json.data?.total ?? 0;
            summary = `${total.toLocaleString()} STATIONS`;
          } else if (test.name === 'REGISTRY') {
            summary = `${json.data?.length || 0} REGIONS`;
          }
          results[test.name] = summary;
        } else {
          results[test.name] = `FAIL: ${json.error}`;
        }
      } catch (err: any) {
        results[test.name] = `ERR: ${err.message}`;
      }
    }
    setHealthStatus(results);
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 animate-fade-in text-center">
        <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-black/70 border border-white/5 backdrop-blur-3xl shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Admin Console</h2>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Credential Handshake Required</p>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); login(user, pass); }}
            className="space-y-4 text-left"
          >
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-white/40 uppercase pl-4">Admin ID</label>
              <input 
                type="text" 
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-mono text-white focus:outline-none focus:border-pink-500/50 transition-all"
                placeholder="ADMIN_USER"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-white/40 uppercase pl-4">Password</label>
              <input 
                type="password" 
                value={pass}
                onChange={e => setPass(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-mono text-white focus:outline-none focus:border-pink-500/50 transition-all"
                placeholder="********"
              />
            </div>
            
            {error && <p className="text-[10px] font-mono text-red-400 text-center uppercase animate-pulse">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-4 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold uppercase tracking-widest hover:bg-pink-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'Initialize Session'}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <button 
              onClick={onClose}
              className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.3em] hover:text-white/60 transition-colors"
            >
              ← System Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in space-y-8 text-left pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Terminal Admin</h1>
          <p className="text-xs font-mono text-pink-500/60 uppercase tracking-[0.3em] mt-2 italic">Direct Node Intelligence Active</p>
        </div>
        <button 
          onClick={() => { logout(); onClose(); }}
          className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-white/40 uppercase hover:text-red-400 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* 📊 D1 TELEMETRY MONITOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 p-8 rounded-[2.5rem] bg-black/40 border border-white/5 backdrop-blur-3xl space-y-8 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">D1 Database Health</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Circuit Breaker: <span className={d1Status?.can_query ? 'text-cyan-400' : 'text-red-500'}>{d1Status?.can_query ? 'ENABLED // STANDBY' : 'ENGAGED // PROTECTED'}</span></p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={runHealthCheck}
                className="px-4 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-[9px] font-mono text-pink-400 hover:bg-pink-500/20 transition-all uppercase"
              >
                Network Scan
              </button>
              <button 
                onClick={fetchStatus}
                className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-mono text-white/40 hover:text-white transition-all uppercase"
              >
                Sync Stats
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-white/30 uppercase">Reads Today</p>
              <p className="text-2xl font-bold text-white font-mono">{(d1Status?.reads_today || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-white/30 uppercase">Remaining</p>
              <p className="text-2xl font-bold text-cyan-400 font-mono">{(d1Status?.remaining || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-white/30 uppercase">Quota Used</p>
              <p className="text-2xl font-bold text-white font-mono">{d1Status?.percentage || '0'}%</p>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-white/30 uppercase">API Node</p>
              <p className="text-lg font-bold text-white/60 truncate max-w-[120px] font-mono" title={import.meta.env.VITE_API_BASE_URL}>
                {new URL(import.meta.env.VITE_API_BASE_URL).hostname}
              </p>
            </div>
          </div>

          {Object.keys(healthStatus).length > 0 && (
            <div className="pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(healthStatus).map(([name, status]) => (
                <div key={name} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-[8px] font-mono text-white/20 uppercase mb-1">{name}</p>
                  <p className={`text-[10px] font-mono font-bold ${status.includes('FAIL') || status.includes('ERR') ? 'text-red-400' : 'text-cyan-400'}`}>
                    {status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Broken Stream Registry</h3>
            <p className="text-[10px] text-white/30 leading-relaxed uppercase">Update the exclusion list to block inactive station signals.</p>
          </div>
          
          <div className="space-y-3">
            <input 
              type="text" 
              value={deadUrl}
              onChange={e => setDeadUrl(e.target.value)}
              className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-xs font-mono text-white placeholder:text-white/10 focus:outline-none focus:border-pink-500/30"
              placeholder="https://station-url.mp3"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => { markDead(deadUrl); setDeadUrl(''); }}
                disabled={loading}
                className="flex-1 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50 transition-all"
              >
                {loading ? 'PROCESSING...' : 'REMOVE URL'}
              </button>
              <button 
                onClick={() => { restore(deadUrl); setDeadUrl(''); }}
                disabled={loading}
                className="flex-1 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 disabled:opacity-50 transition-all"
              >
                RESTORE URL
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">System Sweep</h3>
            <p className="text-[10px] text-white/30 leading-relaxed uppercase">Clear the exclusion registry to refresh the entire signal mesh.</p>
          </div>
          
          <button 
            onClick={cleanup}
            disabled={loading}
            className="w-full h-14 mt-6 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-pink-500/20 disabled:opacity-50 shadow-lg shadow-pink-500/10 transition-all"
          >
            {loading ? 'CLEANING...' : 'START SWEEP'}
          </button>
        </div>
      </div>
    </div>
  );
};
