/**
 * QueueView Component
 * Displays and manages the transcription queue
 * Requirements: Queue state ve UI implement et
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useQueue, useAppActions } from '../store/appStore';
import type { QueueItem } from '../types';
import { getQueueStats } from '../lib/queue';

interface QueueViewProps {
  onProcessNext?: () => void;
  isProcessing?: boolean;
}

const QueueView: React.FC<QueueViewProps> = ({ onProcessNext, isProcessing = false }) => {
  const queue = useQueue();
  const { removeFromQueue, reorderQueue } = useAppActions();
  const stats = getQueueStats(queue);

  const handleReorder = useCallback((newOrder: QueueItem[]) => {
    // Find the indices that changed and update
    const currentIds = queue.map(item => item.id);
    const newIds = newOrder.map(item => item.id);
    
    // Find the item that moved
    for (let i = 0; i < currentIds.length; i++) {
      if (currentIds[i] !== newIds[i]) {
        const movedId = currentIds[i];
        const newIndex = newIds.indexOf(movedId);
        if (newIndex !== -1 && newIndex !== i) {
          reorderQueue(i, newIndex);
          break;
        }
      }
    }
  }, [queue, reorderQueue]);

  const handleRemove = useCallback((id: string) => {
    removeFromQueue(id);
  }, [removeFromQueue]);

  const handleClearCompleted = useCallback(() => {
    queue
      .filter(item => item.status === 'completed' || item.status === 'error')
      .forEach(item => removeFromQueue(item.id));
  }, [queue, removeFromQueue]);

  const getStatusIcon = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'processing':
        return (
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  const getStatusText = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'processing': return 'İşleniyor';
      case 'completed': return 'Tamamlandı';
      case 'error': return 'Hata';
    }
  };

  if (queue.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm">Kuyruk boş</p>
        <p className="text-xs text-zinc-600 mt-1">Dosya eklemek için sürükleyip bırakın</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Queue Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-200">
            Kuyruk ({stats.total})
          </h3>
          <div className="flex items-center gap-2">
            {stats.completed + stats.error > 0 && (
              <button
                onClick={handleClearCompleted}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Temizle
              </button>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-3 mt-2 text-xs">
          {stats.pending > 0 && (
            <span className="text-zinc-500">
              {stats.pending} bekliyor
            </span>
          )}
          {stats.processing > 0 && (
            <span className="text-indigo-400">
              {stats.processing} işleniyor
            </span>
          )}
          {stats.completed > 0 && (
            <span className="text-green-500">
              {stats.completed} tamamlandı
            </span>
          )}
          {stats.error > 0 && (
            <span className="text-red-500">
              {stats.error} hata
            </span>
          )}
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        <Reorder.Group
          axis="y"
          values={queue}
          onReorder={handleReorder}
          className="p-2 space-y-1"
        >
          <AnimatePresence>
            {queue.map((item, index) => (
              <Reorder.Item
                key={item.id}
                value={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className={`
                  group relative p-3 rounded-lg cursor-grab active:cursor-grabbing
                  ${item.status === 'processing' 
                    ? 'bg-indigo-500/10 border border-indigo-500/30' 
                    : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                  }
                  transition-colors duration-200
                `}
                dragListener={item.status === 'pending'}
              >
                <div className="flex items-start gap-3">
                  {/* Drag Handle */}
                  {item.status === 'pending' && (
                    <div className="mt-0.5 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {getStatusIcon(item.status)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${
                        item.status === 'processing' ? 'text-indigo-400' :
                        item.status === 'completed' ? 'text-green-500' :
                        item.status === 'error' ? 'text-red-500' :
                        'text-zinc-500'
                      }`}>
                        {getStatusText(item.status)}
                      </span>
                      {item.status === 'processing' && item.progress > 0 && (
                        <span className="text-xs text-indigo-400">
                          {item.progress}%
                        </span>
                      )}
                      <span className="text-xs text-zinc-600">
                        #{index + 1}
                      </span>
                    </div>
                    
                    {/* Progress Bar for Processing Items */}
                    {item.status === 'processing' && (
                      <div className="mt-2 h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Remove Button */}
                  {item.status !== 'processing' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
                      title="Kaldır"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* Process Next Button */}
      {stats.pending > 0 && !isProcessing && onProcessNext && (
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={onProcessNext}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sonrakini İşle
          </button>
        </div>
      )}
    </div>
  );
};

export default QueueView;
