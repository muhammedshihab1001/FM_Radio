import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE_URL;

export function AdminDashboard({ adminKey, adminUser, onLogout }) {
  const [deadStreams, setDeadStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Manual Report State
  const [reportUrl, setReportUrl] = useState('');

  const fetchList = () => {
    setLoading(true);
    fetch(`${API}/debug/list`)
      .then(r => {
        if (r.status === 401 || r.status === 403) {
          onLogout();
          throw new Error('Unauthorized');
        }
        return r.json();
      })
      .then(data => {
        setDeadStreams(Array.isArray(data) ? data : (data.dead_streams ?? []));
        setError(null);
      })
      .catch(err => {
        if (err.message !== 'Unauthorized') setError('Failed to fetch dead streams.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleDelete = async (url) => {
    if (!window.confirm('Delete this stream permanently?')) return;
    try {
      const p = new URLSearchParams();
      p.set('url', url);
      p.set('key', adminKey);
      const res = await fetch(`${API}/debug/delete?${p}`);
      if (res.status === 401 || res.status === 403) {
        onLogout();
        return;
      }
      if (res.ok) fetchList();
      else alert('Failed to delete.');
    } catch {
      alert('Network err.');
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('WARNING: Are you sure you want to run a bulk cleanup? This will remove all flagged dead streams from the database.')) return;
    try {
      const res = await fetch(`${API}/debug/cleanup?key=${adminKey}`);
      if (res.status === 401 || res.status === 403) {
        onLogout();
        return;
      }
      if (res.ok) {
        alert('Bulk cleanup successful.');
        fetchList();
      } else alert('Cleanup failed or unauthorized.');
    } catch {
      alert('Network err.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-12 animate-fade-in relative z-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 md:mb-12 pb-8 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-[0.4em] text-cyan-400">Security_Console &mdash; {adminUser || 'AUTH_NODE'}</h2>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Admin Debug Interface</h1>
        </div>
        <button 
          onClick={onLogout} 
          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all active:scale-95"
        >
          Terminate Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Actions (3 cols) */}
        <div className="lg:col-span-3 space-y-8">
          {/* Status Panel */}
          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500/50 to-cyan-500/50" />
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 mb-4">Node Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-white/20">TELEMETRY</span>
                <span className="text-cyan-400">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-white/20">AUTO_FLAG</span>
                <span className="text-cyan-400">ENABLED</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-white/20">ENCRYPTION</span>
                <span className="text-cyan-400">AES_256</span>
              </div>
            </div>
          </div>

          {/* Purge System */}
          <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-red-400 mb-3">Database Purge</h3>
            <p className="text-[10px] text-white/30 mb-6 leading-relaxed font-mono uppercase tracking-wider">Destructive operation. This will permanently erase all auto-flagged dead records from the telemetry databanks.</p>
            <button 
              onClick={handleCleanup} 
              className="w-full h-12 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white active:scale-[0.98] transition-all shadow-lg shadow-red-500/10"
            >
              Execute Global Purge
            </button>
          </div>
        </div>

        {/* Right: Telemetry Table (9 cols) */}
        <div className="lg:col-span-9 rounded-[2.5rem] bg-black/40 border border-white/10 backdrop-blur-3xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-6 px-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white">System Telemetry</h3>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/30 uppercase tracking-[0.2em]">
                {deadStreams.length} Resolved Errors
              </span>
            </div>
            <button 
              onClick={fetchList} 
              className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-cyan-400 transition-all active:rotate-180 duration-500"
              title="Refresh Telemetry"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {loading && (
              <div className="p-20 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Querying Satellite Net...</p>
              </div>
            )}
            
            {error && (
              <div className="p-20 text-center">
                <p className="text-xs font-mono text-red-400 uppercase tracking-widest leading-relaxed">{error}</p>
                <button onClick={fetchList} className="mt-4 text-[10px] text-cyan-400 underline uppercase tracking-widest">Retry Connection</button>
              </div>
            )}
            
            {!loading && !error && deadStreams.length === 0 && (
              <div className="p-20 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/5 mx-auto mb-6">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Frequency Grid Secure • No Errors Detected</p>
              </div>
            )}

            {!loading && deadStreams.length > 0 && (
              <>
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] uppercase font-mono tracking-[0.3em] text-white/20">
                      <th className="font-normal px-8 py-4">Data Node (ID/URL)</th>
                      <th className="font-normal px-8 py-4">Status</th>
                      <th className="font-normal px-8 py-4 text-right">Sanitize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {deadStreams.map((s, i) => (
                      <tr key={s.id || i} className="group/row hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex flex-col gap-1 max-w-[320px]">
                            <span className="text-xs font-mono text-white/60 truncate" title={s.url}>{s.id || s.url}</span>
                            <span className="text-[9px] font-mono text-white/10 truncate select-all">{s.url}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] font-mono font-bold text-red-400 uppercase tracking-widest">
                            {s.reason || 'Offline'}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(s.url)} 
                            className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 active:scale-90"
                            title="Erase Record"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-white/[0.02]">
                  {deadStreams.map((s, i) => (
                    <div key={s.id || i} className="p-6 space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Endpoint</p>
                        <p className="text-xs font-mono text-white/60 break-all">{s.url}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">Status</p>
                          <span className="px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[9px] font-mono font-bold text-red-500 uppercase tracking-widest">
                            {s.reason || 'ERROR'}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDelete(s.url)} 
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 active:scale-90"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
