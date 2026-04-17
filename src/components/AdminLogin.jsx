import React, { useState, useEffect } from 'react';

export function AdminLogin({ onLogin, isVerifying }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr]   = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [lockout,  setLockout]  = useState(0);

  useEffect(() => {
    if (lockout > 0) {
      const timer = setInterval(() => {
        const left = Math.ceil((lockout - Date.now()) / 1000);
        if (left <= 0) {
          setLockout(0);
          setAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockout > 0) return;
    if (!user.trim() || !pass.trim()) {
      setErr('Full Credentials Required');
      return;
    }
    
    setErr(null);
    const result = await onLogin(pass, user); // Passing both
    
    if (!result.success) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setLockout(Date.now() + 60000);
        setErr('TERMINAL_LOCKED: 3 Failed Attempts');
      } else {
        setErr(`${result.error || 'Access Denied'} (${newAttempts}/3)`);
      }
    }
  };

  const isLocked = lockout > 0;
  const timeLeft = Math.ceil((lockout - Date.now()) / 1000);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fade-in text-white">
      <div className="w-full max-w-sm relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000" />
        
        <div className="relative bg-black/40 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500/50 to-cyan-500/50" />
          
          <div className="mb-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 relative overflow-hidden">
               <div className="absolute inset-0 bg-cyan-500/10 animate-pulse" />
               {isVerifying ? (
                 <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
               ) : (
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="relative z-10">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
               )}
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-white">Security Login</h2>
              <p className="text-[10px] text-white/30 font-mono tracking-[0.3em] uppercase mt-2">Administrator Protocol Required</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <input
                type="text"
                disabled={isVerifying || isLocked}
                placeholder={isLocked ? "LOCKED" : "Admin ID..."}
                value={user}
                onChange={(e) => { setUser(e.target.value); setErr(null); }}
                className={`w-full h-12 px-5 rounded-2xl bg-white/5 border text-xs font-mono font-bold tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-white/20 ${err ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 focus:border-cyan-500/30'} ${(isVerifying || isLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <input
                type="password"
                disabled={isVerifying || isLocked}
                placeholder={isLocked ? `LOCKED (${timeLeft}s)` : "Key Passphrase..."}
                value={pass}
                onChange={(e) => { setPass(e.target.value); setErr(null); }}
                className={`w-full h-12 px-5 rounded-2xl bg-white/5 border text-xs font-mono font-bold tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-white/20 ${err ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 focus:border-cyan-500/30'} ${(isVerifying || isLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            
            {err && (
              <p className="text-[9px] uppercase tracking-[0.4em] text-red-500 font-mono text-center font-bold animate-pulse">{err}</p>
            )}

            <button 
              type="submit" 
              disabled={isVerifying || isLocked}
              className={`w-full h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold tracking-[0.3em] text-[10px] shadow-lg shadow-pink-500/20 hover:shadow-cyan-500/30 transition-all active:scale-[0.98] ${(isVerifying || isLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isVerifying ? 'AUTHENTICATING...' : isLocked ? `SYSTEM_HALT (${timeLeft}s)` : 'EXECUTE SIGN_IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
