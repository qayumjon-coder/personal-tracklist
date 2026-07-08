import { useState } from 'react';
import { X, Send, Loader2, Clock, CheckCircle, ShieldOff } from 'lucide-react';
import type { PermissionStatus } from '../hooks/useUploadPermission';

interface UploadRequestModalProps {
  status: PermissionStatus;
  onClose: () => void;
  onSubmit: (name: string, message: string) => Promise<{ success: boolean; error?: string }>;
}

export function UploadRequestModal({ status, onClose, onSubmit }: UploadRequestModalProps) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setSubmitError('Iltimos, ismingizni kiriting.');
      return;
    }
    setLoading(true);
    setSubmitError(null);
    const result = await onSubmit(name, message);
    setLoading(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setSubmitError(result.error || 'Xatolik yuz berdi.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-[var(--bg-main)] border border-[var(--accent)]/50 shadow-[0_0_60px_rgba(var(--accent-rgb),0.15)] overflow-hidden">

        {/* Top scanline */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-80" />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[var(--accent)]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--accent)]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[var(--accent)]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[var(--accent)]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--text-secondary)]/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[var(--accent)]">
              UPLOAD ACCESS TERMINAL
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* Pending state */}
          {status === 'pending' && !submitted && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <Clock size={40} className="text-yellow-400 animate-pulse" />
              <h2 className="text-lg font-bold font-mono tracking-wider">SO'ROV YUBORILGAN</h2>
              <p className="text-[var(--text-secondary)] text-sm font-mono leading-relaxed">
                So'rovingiz adminstratorga yuborildi.<br/>
                Ko'rib chiqilgandan so'ng sizga ruxsat beriladi.
              </p>
              <button onClick={onClose} className="mt-2 px-6 py-2 border border-[var(--text-secondary)] text-[var(--text-secondary)] text-xs font-mono tracking-widest uppercase hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                YOPISH
              </button>
            </div>
          )}

          {/* Denied state */}
          {status === 'denied' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <ShieldOff size={40} className="text-red-400" />
              <h2 className="text-lg font-bold font-mono tracking-wider text-red-400">RUXSAT BERILMAGAN</h2>
              <p className="text-[var(--text-secondary)] text-sm font-mono leading-relaxed">
                Upload qilish huquqiga ega emassiz yoki so'rovingiz rad etilgan.
              </p>
              <button onClick={onClose} className="mt-2 px-6 py-2 border border-red-500/50 text-red-400 text-xs font-mono tracking-widest uppercase hover:bg-red-500/10 transition-all">
                YOPISH
              </button>
            </div>
          )}

          {/* Success state after submitting */}
          {submitted && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle size={40} className="text-green-400" />
              <h2 className="text-lg font-bold font-mono tracking-wider text-green-400">SO'ROV YUBORILDI!</h2>
              <p className="text-[var(--text-secondary)] text-sm font-mono leading-relaxed">
                Administrator tez orada ko'rib chiqadi.<br />
                Ruxsat berilganda Upload tugmasi faol bo'ladi.
              </p>
              <button onClick={onClose} className="mt-2 px-6 py-2 border border-green-500/50 text-green-400 text-xs font-mono tracking-widest uppercase hover:bg-green-500/10 transition-all">
                YOPISH
              </button>
            </div>
          )}

          {/* Form state (none) */}
          {status === 'none' && !submitted && (
            <>
              <div className="mb-5">
                <p className="text-[var(--text-secondary)] text-xs font-mono uppercase tracking-widest mb-1">
                  // KIRISH RUXSATI KERAK
                </p>
                <p className="text-sm font-mono text-[var(--text-primary)] leading-relaxed">
                  Musiqa yuklash uchun administrator ruxsatiga muhtojsiz. Quyida so'rov yuboring.
                </p>
              </div>

              <div className="space-y-4">
                {/* Name field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent)] mb-1.5">
                    &gt; ISMINGIZ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="To'liq ism..."
                    maxLength={60}
                    className="w-full bg-black/40 border border-[var(--text-secondary)]/40 px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)] transition-all placeholder-[var(--text-secondary)]/40"
                  />
                </div>

                {/* Message field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent)] mb-1.5">
                    &gt; SABAB / IZOH <span className="text-[var(--text-secondary)]">(ixtiyoriy)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Nima maqsadda yuklash istaysiz..."
                    maxLength={300}
                    rows={3}
                    className="w-full bg-black/40 border border-[var(--text-secondary)]/40 px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)] transition-all placeholder-[var(--text-secondary)]/40 resize-none"
                  />
                  <div className="text-right text-[10px] text-[var(--text-secondary)]/50 font-mono mt-1">{message.length}/300</div>
                </div>

                {submitError && (
                  <div className="text-red-400 text-xs font-mono border border-red-400/30 bg-red-400/5 px-3 py-2">
                    ⚠ {submitError}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-[var(--accent)] text-[var(--bg-main)] font-bold font-mono text-xs tracking-[0.25em] uppercase hover:opacity-90 transition-all shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> YUBORILMOQDA...</>
                  ) : (
                    <><Send size={14} /> SO'ROV YUBORISH</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom scanline effect */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      </div>
    </div>
  );
}
