import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle } from 'lucide-react';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (login(password)) {
      navigate('/admin');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="retro-grid" />
      <div className="scanline" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/40 border border-[var(--text-secondary)] p-8 backdrop-blur-sm shadow-[0_0_40px_rgba(0,255,255,0.1)]">
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
          <form onSubmit={handleSubmit} className="space-y-6">
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
                autoFocus
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
              className="w-full py-3 font-bold text-lg uppercase tracking-widest border border-[var(--accent)] text-[var(--bg-main)] bg-[var(--accent)] hover:bg-transparent hover:text-[var(--accent)] hover:shadow-[0_0_20px_var(--accent)] transition-all duration-300"
            >
              Access Admin Panel
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors font-mono uppercase tracking-wider"
            >
              ← Back to Player
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
