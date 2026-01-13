/**
 * Toast Notification Component
 * Global toast notifications for error handling and user feedback
 * Requirements: 2.8
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';

// ============================================
// Types
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// ============================================
// Toast Store
// ============================================

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),
}));

// ============================================
// Toast Helper Functions
// ============================================

export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'success', title, message, duration });
  },
  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'error', title, message, duration: duration ?? 5000 });
  },
  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'warning', title, message, duration });
  },
  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'info', title, message, duration });
  },
};

// ============================================
// Toast Item Component
// ============================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast: t, onRemove }) => {
  const duration = t.duration ?? 4000;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove(t.id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [t.id, duration, onRemove]);

  const getIcon = () => {
    switch (t.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getBgColor = () => {
    switch (t.type) {
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30';
      case 'info': return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg ${getBgColor()}`}
    >
      <div className="shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100">{t.title}</p>
        {t.message && (
          <p className="text-xs text-zinc-400 mt-1">{t.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(t.id)}
        className="shrink-0 p-1 rounded hover:bg-zinc-700/50 transition-colors"
      >
        <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
};

// ============================================
// Toast Container Component
// ============================================

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  const handleRemove = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  return (
    <div className="fixed top-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={handleRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
