import { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'error', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColors = {
    error: 'bg-red-500/90',
    success: 'bg-green-500/90',
    info: 'bg-blue-500/90',
  };

  const borderColors = {
    error: 'border-red-600',
    success: 'border-green-600',
    info: 'border-blue-600',
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div
        className={`${bgColors[type]} ${borderColors[type]} border backdrop-blur-sm rounded-lg shadow-lg p-4 min-w-[320px] max-w-md`}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="text-white flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-white text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
