/**
 * Sidebar Component
 * Modern navigation sidebar with section dividers
 * Requirements: 6.2 (history list), 7.5 (staggered fade-in animation)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Clock, 
  ListTodo, 
  Settings, 
  ChevronDown,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  GripVertical
} from 'lucide-react';
import { useQueue, useAppActions } from '../store/appStore';
import type { StoredTranscript, QueueItem } from '../types';
import { getQueueStats } from '../lib/queue';

interface SidebarProps {
  onHistorySelect: (id: string, transcript: StoredTranscript) => void;
  onSettingsClick: () => void;
  onProcessNext?: () => void;
  isProcessing?: boolean;
}

type ActiveSection = 'home' | 'history' | 'queue';

// Navigation Item Component
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number | React.ReactNode;
  onClick?: () => void;
  hasSubmenu?: boolean;
  isExpanded?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive,
  badge,
  onClick,
  hasSubmenu,
  isExpanded,
}) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
      transition-all duration-200
      ${isActive 
        ? 'bg-zinc-800 text-white' 
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }
    `}
  >
    <span className="shrink-0 w-5 h-5">{icon}</span>
    <span className="flex-1 text-left truncate">{label}</span>
    {badge !== undefined && (
      typeof badge === 'number' ? (
        <span className={`
          min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full 
          flex items-center justify-center
          ${isActive ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-300'}
        `}>
          {badge}
        </span>
      ) : badge
    )}
    {hasSubmenu && (
      <ChevronDown 
        size={16} 
        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
      />
    )}
  </button>
);

// Divider Component
const NavDivider: React.FC = () => (
  <div className="my-2 mx-3 h-px bg-zinc-800" />
);

// Queue Item Component
const QueueItemRow: React.FC<{
  item: QueueItem;
  index: number;
  onRemove: (id: string) => void;
}> = ({ item, index, onRemove }) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'pending':
        return <Clock size={14} className="text-zinc-500" />;
      case 'processing':
        return <Loader2 size={14} className="text-indigo-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 size={14} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.05 }}
      className={`
        group flex items-center gap-2 px-3 py-2 rounded-lg text-sm
        ${item.status === 'processing' 
          ? 'bg-indigo-500/10 border border-indigo-500/20' 
          : 'hover:bg-zinc-800/50'
        }
      `}
    >
      {item.status === 'pending' && (
        <GripVertical size={14} className="text-zinc-600 cursor-grab" />
      )}
      {getStatusIcon()}
      <span className="flex-1 truncate text-zinc-300" title={item.fileName}>
        {item.fileName}
      </span>
      {item.status === 'processing' && item.progress > 0 && (
        <span className="text-xs text-indigo-400">{item.progress}%</span>
      )}
      {item.status !== 'processing' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </motion.div>
  );
};

// Featured Card for Processing Status
const ProcessingCard: React.FC<{
  progress: number;
  fileName: string;
  onCancel?: () => void;
}> = ({ progress, fileName }) => (
  <div className="mx-2 mb-2 p-3 rounded-xl bg-zinc-800/80 border border-zinc-700">
    <div className="flex items-center gap-2 mb-2">
      <Loader2 size={16} className="text-indigo-400 animate-spin" />
      <span className="text-sm font-medium text-zinc-200">İşleniyor</span>
    </div>
    <p className="text-xs text-zinc-400 truncate mb-3" title={fileName}>
      {fileName}
    </p>
    <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-linear-to-r from-indigo-600 to-indigo-400 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
    <p className="text-xs text-zinc-500 mt-2 text-right">{progress}%</p>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({
  onHistorySelect,
  onSettingsClick,
  onProcessNext,
  isProcessing = false,
}) => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [isQueueExpanded, setIsQueueExpanded] = useState(true);
  
  const queue = useQueue();
  const { removeFromQueue } = useAppActions();
  const stats = getQueueStats(queue);
  
  const processingItem = queue.find(item => item.status === 'processing');

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <FileAudio size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">ScriptGrab</h1>
            <p className="text-xs text-zinc-500">Transkript Uygulaması</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          <NavItem
            icon={<Home size={18} />}
            label="Ana Sayfa"
            isActive={activeSection === 'home'}
            onClick={() => setActiveSection('home')}
          />
          
          <NavItem
            icon={<Clock size={18} />}
            label="Geçmiş"
            isActive={activeSection === 'history'}
            onClick={() => setActiveSection('history')}
          />
        </div>

        <NavDivider />

        {/* Queue Section */}
        <div className="space-y-1">
          <NavItem
            icon={<ListTodo size={18} />}
            label="Kuyruk"
            badge={stats.total > 0 ? stats.total : undefined}
            hasSubmenu
            isExpanded={isQueueExpanded}
            onClick={() => setIsQueueExpanded(!isQueueExpanded)}
          />
          
          <AnimatePresence>
            {isQueueExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Processing Card */}
                {processingItem && (
                  <ProcessingCard
                    progress={processingItem.progress}
                    fileName={processingItem.fileName}
                  />
                )}
                
                {/* Queue Stats */}
                {stats.total > 0 && (
                  <div className="px-3 py-1.5 flex gap-3 text-xs">
                    {stats.pending > 0 && (
                      <span className="text-zinc-500">{stats.pending} bekliyor</span>
                    )}
                    {stats.completed > 0 && (
                      <span className="text-green-500">{stats.completed} tamamlandı</span>
                    )}
                    {stats.error > 0 && (
                      <span className="text-red-500">{stats.error} hata</span>
                    )}
                  </div>
                )}
                
                {/* Queue Items */}
                <div className="ml-2 space-y-0.5 max-h-[200px] overflow-y-auto">
                  <AnimatePresence>
                    {queue.filter(item => item.status !== 'processing').map((item, index) => (
                      <QueueItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        onRemove={removeFromQueue}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* Process Next Button */}
                {stats.pending > 0 && !isProcessing && onProcessNext && (
                  <div className="px-2 pt-2">
                    <button
                      onClick={onProcessNext}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Sonrakini İşle
                    </button>
                  </div>
                )}
                
                {/* Empty State */}
                {stats.total === 0 && (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-zinc-500">Kuyruk boş</p>
                    <p className="text-xs text-zinc-600 mt-1">Dosya sürükleyip bırakın</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <NavDivider />

        {/* Settings */}
        <NavItem
          icon={<Settings size={18} />}
          label="Ayarlar"
          onClick={onSettingsClick}
        />
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/50">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-zinc-400">Hazır</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
