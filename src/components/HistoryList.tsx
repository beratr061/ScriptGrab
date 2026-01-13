/**
 * HistoryList Component
 * Displays saved transcripts in a date-sorted list with delete functionality
 * Requirements: 6.2 (history list), 6.3 (load transcript), 6.4 (delete), 6.5 (sort by date)
 */

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import type { HistoryItem, StoredTranscript } from '../types';
import { useAppStore } from '../store/appStore';
import { toast } from './Toast';

interface HistoryListProps {
  onHistorySelect: (id: string, transcript: StoredTranscript) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
    },
  },
};

const HistoryList: React.FC<HistoryListProps> = ({ onHistorySelect }) => {
  const { historyItems, setHistoryItems, removeHistoryItem } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  /**
   * Load history items from storage on mount
   * Requirements: 6.2, 6.5
   */
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await invoke<HistoryItem[]>('get_history');
      // Items are already sorted by date descending from backend (Requirement 6.5)
      setHistoryItems(items);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setHistoryItems]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /**
   * Handle history item click - load transcript
   * Requirements: 6.3
   */
  const handleItemClick = useCallback(async (id: string) => {
    try {
      setLoadingItemId(id);
      const transcript = await invoke<StoredTranscript>('load_history_item', { id });
      onHistorySelect(id, transcript);
    } catch (error) {
      console.error('Failed to load transcript:', error);
      toast.error('Yükleme Hatası', 'Transkript yüklenemedi');
    } finally {
      setLoadingItemId(null);
    }
  }, [onHistorySelect]);

  /**
   * Handle history item delete
   * Requirements: 6.4
   */
  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    try {
      setDeletingItemId(id);
      await invoke('delete_history_item', { id });
      removeHistoryItem(id);
      toast.success('Silindi', 'Transkript başarıyla silindi');
    } catch (error) {
      console.error('Failed to delete history item:', error);
      toast.error('Silme Hatası', 'Transkript silinemedi');
    } finally {
      setDeletingItemId(null);
    }
  }, [removeHistoryItem]);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  /**
   * Format duration for display
   */
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-zinc-500">Geçmiş yükleniyor...</p>
      </div>
    );
  }

  // Empty state
  if (historyItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-4 py-8 text-center"
      >
        <div className="text-zinc-600 mb-2">
          <svg
            className="w-10 h-10 mx-auto opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-xs text-zinc-600">Henüz transkript yok</p>
      </motion.div>
    );
  }

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-1"
    >
      <AnimatePresence mode="popLayout">
        {historyItems.map((item) => (
          <motion.li
            key={item.id}
            variants={itemVariants}
            layout
            exit="exit"
          >
            <div
              onClick={() => handleItemClick(item.id)}
              className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer
                         hover:bg-zinc-800/50 transition-colors duration-200
                         ${loadingItemId === item.id ? 'bg-zinc-800/30' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate font-medium">
                  {item.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-500">
                    {formatDate(item.date)}
                  </span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-xs text-zinc-500">
                    {formatDuration(item.duration)}
                  </span>
                  {item.language && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span className="text-xs text-zinc-500 uppercase">
                        {item.language}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Loading indicator */}
              {loadingItemId === item.id && (
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              )}
              
              {/* Delete button */}
              {loadingItemId !== item.id && (
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  disabled={deletingItemId === item.id}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded
                           text-zinc-500 hover:text-red-400 hover:bg-zinc-700/50
                           transition-all duration-200
                           ${deletingItemId === item.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Sil"
                >
                  {deletingItemId === item.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
};

export default HistoryList;
