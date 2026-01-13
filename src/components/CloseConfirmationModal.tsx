/**
 * Close Confirmation Modal Component
 * Requirements: 8.5 - Display confirmation dialog when transcription is in progress
 */

import { motion, AnimatePresence } from 'framer-motion';

interface CloseConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmQuit: () => void;
  onMinimizeToTray: () => void;
  minimizeToTrayEnabled: boolean;
}

export function CloseConfirmationModal({
  isOpen,
  onClose,
  onConfirmQuit,
  onMinimizeToTray,
  minimizeToTrayEnabled,
}: CloseConfirmationModalProps) {
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
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-zinc-50">Transkript Devam Ediyor</h2>
              </div>
              
              {/* Content */}
              <div className="space-y-4 text-zinc-300">
                <p>
                  Şu anda bir transkript işlemi devam ediyor. Uygulamayı kapatırsanız bu işlem iptal edilecektir.
                </p>
                
                <p className="text-sm text-zinc-500">
                  Ne yapmak istersiniz?
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-3 mt-6">
                {minimizeToTrayEnabled && (
                  <button
                    onClick={onMinimizeToTray}
                    className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                  >
                    Sistem Tepsisine Küçült
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                >
                  İşleme Devam Et
                </button>
                <button
                  onClick={onConfirmQuit}
                  className="w-full px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium transition-colors border border-red-600/30"
                >
                  Yine de Kapat
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
