import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bus, KeyRound, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill accounts for demo convenience
  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b13] relative overflow-hidden px-4">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 mb-4 animate-pulse">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent tracking-wide">
            Where Is My Bus
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-1">Smart Transportation management System</p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel rounded-3xl p-8 neon-border-cyan">
          <h3 className="text-xl font-bold text-slate-100 mb-6 text-center">Account Sign In</h3>

          {error && (
            <div className="mb-5 flex items-center gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-950/15 text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stmarys.edu"
                  required
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder-slate-600 text-sm focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder-slate-600 text-sm focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm tracking-wider cursor-pointer shadow-lg shadow-cyan-500/15 active:scale-95 transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying Credentials...' : 'SIGN IN'}
            </button>
          </form>

          {/* Quick Login Presets */}
          <div className="mt-8 pt-6 border-t border-slate-800/40">
            <span className="block text-[10px] text-slate-500 font-bold uppercase text-center tracking-wider mb-3">
              Quick Sign In Presets
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin('admin@stmarys.edu')}
                className="py-2 px-1 text-[11px] rounded-lg border border-slate-800 bg-slate-900/30 text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-950/10 transition-colors font-medium cursor-pointer"
              >
                School Admin
              </button>
              <button
                onClick={() => handleQuickLogin('driver1@stmarys.edu')}
                className="py-2 px-1 text-[11px] rounded-lg border border-slate-800 bg-slate-900/30 text-slate-300 hover:border-purple-500/40 hover:bg-purple-950/10 transition-colors font-medium cursor-pointer"
              >
                Bus Driver
              </button>
              <button
                onClick={() => handleQuickLogin('parent1@stmarys.edu')}
                className="py-2 px-1 text-[11px] rounded-lg border border-slate-800 bg-slate-900/30 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-950/10 transition-colors font-medium cursor-pointer"
              >
                Student Parent
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
