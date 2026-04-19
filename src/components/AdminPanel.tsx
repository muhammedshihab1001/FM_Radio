import React, { useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { isAdmin, loading, error, login, logout, markDead, restore, cleanup } = useAdmin();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [deadUrl, setDeadUrl] = useState('');

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-black/60 border border-white/5 backdrop-blur-3xl shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Command Authorization</h2>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Restricted Sector // Admin Access Only</p>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); login(user, pass); }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-white/40 uppercase pl-4">Orbital ID</label>
              <input 
                type="text" 
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50 transition-all"
                placeholder="USER_ID"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-white/40 uppercase pl-4">Digital Key</label>
              <input 
                type="password" 
                value={pass}
                onChange={e => setPass(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50 transition-all"
                placeholder="********"
              />
            </div>
            
            {error && <p className="text-[10px] font-mono text-red-400 text-center uppercase animate-pulse">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'AUTHORIZING...' : 'Authorize Access'}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <button 
              onClick={onClose}
              className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.3em] hover:text-white/60 transition-colors"
            >
              ← Return to Radio Mesh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Terminal Command Center</h1>
          <p className="text-xs font-mono text-amber-500/60 uppercase tracking-[0.3em] mt-2 italic">Integrity Maintenance Protocol Active</p>
        </div>
        <button 
          onClick={() => { logout(); onClose(); }}
          className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-white/40 uppercase hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stream Management */}
        <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Mark Dead Stream</h3>
            <p className="text-[10px] text-white/30 leading-relaxed uppercase">Add broken signal URLs to the exclusion registry.</p>
          </div>
          
          <div className="space-y-3">
            <input 
              type="text" 
              value={deadUrl}
              onChange={e => setDeadUrl(e.target.value)}
              className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-xs font-mono text-amber-200 placeholder:text-white/10 focus:outline-none focus:border-amber-500/30"
              placeholder="https://stream-url.mp3"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => { markDead(deadUrl); setDeadUrl(''); }}
                disabled={loading}
                className="flex-1 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50 transition-all"
              >
                {loading ? 'PROCESSING...' : 'FLAG AS DEAD'}
              </button>
              <button 
                onClick={() => { restore(deadUrl); setDeadUrl(''); }}
                disabled={loading}
                className="flex-1 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 disabled:opacity-50 transition-all"
              >
                RESTORE SIGNAL
              </button>
            </div>
          </div>
        </div>

        {/* Global Tools */}
        <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Global Maintenance</h3>
            <p className="text-[10px] text-white/30 leading-relaxed uppercase">Trigger deep scan to prune all validated dead signals from the discovery mesh.</p>
          </div>
          
          <button 
            onClick={cleanup}
            disabled={loading}
            className="w-full h-14 mt-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-amber-500/20 disabled:opacity-50 shadow-lg shadow-amber-500/10 transition-all"
          >
            {loading ? 'SCANNING MESH...' : 'INITIALIZE SYSTEM CLEANUP'}
          </button>
        </div>
      </div>

      <div className="p-6 rounded-[1.5rem] bg-black/40 border border-red-500/10 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Terminal Security Warning</p>
          <p className="text-[9px] font-mono text-white/20 uppercase leading-relaxed">Changes made here directly affect the cloud-synchronization of 30,000+ stations. Direct database mutations are non-reversible.</p>
        </div>
      </div>
    </div>
  );
};
