import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, ArrowLeft, Loader2, Mail } from 'lucide-react';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);

    if (res.success) {
      navigate('/admin');
    } else {
      setError(res.message);
      setLoading(false);
      // Cyberpunk shake effect
      const box = document.getElementById('login-box');
      if (box) {
        box.classList.add('animate-[shake_0.5s_ease-in-out]');
        setTimeout(() => box.classList.remove('animate-[shake_0.5s_ease-in-out]'), 500);
      }
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="retro-grid" />
      <div className="scanline" />
      
      <div className="relative z-10 w-full max-w-md">
        <div id="login-box" className="bg-black/40 border border-[var(--text-secondary)] p-8 backdrop-blur-sm shadow-[0_0_40px_rgba(var(--accent-rgb),0.1)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 border-2 border-[var(--accent)] bg-[var(--accent)]/10">
              <Lock className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-wider font-mono uppercase">
              Admin Access
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 tracking-widest">
              AUTHENTICATION REQUIRED
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2 uppercase tracking-widest font-mono">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-[var(--text-secondary)] pl-9 pr-3 py-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent)] transition-all text-[var(--text-primary)] font-mono"
                  placeholder="admin@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2 uppercase tracking-widest font-mono">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-[var(--text-secondary)] p-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent)] transition-all text-[var(--text-primary)] font-mono"
                placeholder="Enter admin password..."
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 border border-red-500 bg-red-900/20 text-red-400">
                <AlertCircle size={18} />
                <span className="text-sm font-mono">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-bold text-lg uppercase tracking-widest border transition-all duration-300
                         border-[var(--accent)] text-[var(--bg-main)] bg-[var(--accent)]
                         hover:bg-transparent hover:text-[var(--accent)] hover:shadow-[0_0_20px_var(--accent)]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Verifying...</>
              ) : (
                'Access Admin Panel'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[var(--text-secondary)]/30">
            <button
              onClick={() => navigate('/')}
              className="group flex items-center justify-center gap-2 w-full py-3 text-sm uppercase tracking-wider font-bold
                       border border-[var(--text-secondary)] text-[var(--text-secondary)] bg-black/50
                       hover:border-[var(--text-primary)] hover:text-black hover:bg-[var(--text-primary)]
                       transition-all duration-300 shadow-[0_0_10px_rgba(var(--accent-rgb),0.05)]"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-300" />
              <span>Back to Player</span>
            </button>
          </div>
        </div>

        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)]" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--accent)]" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--accent)]" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)]" />
      </div>
    </div>
  );
}
