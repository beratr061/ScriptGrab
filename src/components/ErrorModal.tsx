/**
 * Error Modal Component
 * Displays error messages with retry option
 * Requirements: 2.8
 */

import { motion, AnimatePresence } from 'framer-motion';

interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorModal({
  isOpen,
  title,
  message,
  details,
  onClose,
  onRetry,
  showRetry = true,
}: ErrorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-zinc-50">{title}</h2>
              </div>
              
              {/* Content */}
              <div className="space-y-4 text-zinc-300">
                <p>{message}</p>
                
                {details && (
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-sm text-zinc-400 font-mono break-all">{details}</p>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                >
                  Kapat
                </button>
                {showRetry && onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                  >
                    Tekrar Dene
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ErrorModal;
