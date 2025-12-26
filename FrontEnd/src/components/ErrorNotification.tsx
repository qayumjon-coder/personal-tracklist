import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorNotificationProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function ErrorNotification({ message, onClose, duration = 5000 }: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-red-900/90 border border-red-500 text-white p-4 pr-12 max-w-md backdrop-blur-md shadow-[0_0_30px_rgba(239,68,68,0.5)]">
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-1">PLAYBACK ERROR</h4>
            <p className="text-xs font-mono leading-relaxed opacity-90">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
