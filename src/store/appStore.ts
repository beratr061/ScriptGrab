/**
 * ScriptGrab Application State Management
 * Zustand store for global application state
 * Requirements: 2.3, 2.4, 6.1, 9.5
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  AppView,
  FileInfo,
  Transcript,
  QueueItem,
  Settings,
  HistoryItem,
} from '../types';

// ============================================
// Store State Interface
// ============================================

interface AppState {
  // View state
  currentView: AppView;
  
  // File state
  currentFile: FileInfo | null;
  
  // Transcript state
  transcript: Transcript | null;
  
  // Processing state
  isProcessing: boolean;
  progress: number;
  statusMessage: string;
  
  // Queue state
  queue: QueueItem[];
  
  // History state
  historyItems: HistoryItem[];
  
  // Settings state
  settings: Settings;
}

// ============================================
// Store Actions Interface
// ============================================

interface AppActions {
  // View actions
  setCurrentView: (view: AppView) => void;
  
  // File actions
  setFile: (file: FileInfo | null) => void;
  clearFile: () => void;
  
  // Transcript actions
  setTranscript: (transcript: Transcript | null) => void;
  clearTranscript: () => void;
  updateSegmentText: (segmentId: string, newText: string) => void;
  
  // Processing actions
  setProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: number, statusMessage?: string) => void;
  resetProcessing: () => void;
  
  // Queue actions
  addToQueue: (items: QueueItem[]) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  
  // History actions
  setHistoryItems: (items: HistoryItem[]) => void;
  addHistoryItem: (item: HistoryItem) => void;
  removeHistoryItem: (id: string) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  
  // Reset all state
  resetAll: () => void;
}

// ============================================
// Default State
// ============================================

const defaultSettings: Settings = {
  modelSize: 'base',
  minimizeToTray: false,
  defaultExportFormat: 'txt',
  autoCheckUpdates: true,
};

const initialState: AppState = {
  currentView: 'idle',
  currentFile: null,
  transcript: null,
  isProcessing: false,
  progress: 0,
  statusMessage: '',
  queue: [],
  historyItems: [],
  settings: defaultSettings,
};

// ============================================
// Store Implementation
// ============================================

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        ...initialState,

        // ========================================
        // View Actions
        // ========================================
        
        setCurrentView: (view) => set({ currentView: view }, false, 'setCurrentView'),

        // ========================================
        // File Actions
        // ========================================
        
        setFile: (file) => set({ currentFile: file }, false, 'setFile'),
        
        clearFile: () => set({ currentFile: null }, false, 'clearFile'),

        // ========================================
        // Transcript Actions
        // ========================================
        
        setTranscript: (transcript) => set({ transcript }, false, 'setTranscript'),
        
        clearTranscript: () => set({ transcript: null }, false, 'clearTranscript'),
        
        /**
         * Update segment text for inline editing
         * Requirements: 4.1, 4.2
         */
        updateSegmentText: (segmentId, newText) =>
          set(
            (state) => {
              if (!state.transcript) return state;
              
              const updatedSegments = state.transcript.segments.map((segment) =>
                segment.id === segmentId
                  ? { ...segment, text: newText }
                  : segment
              );
              
              return {
                transcript: {
                  ...state.transcript,
                  segments: updatedSegments,
                },
              };
            },
            false,
            'updateSegmentText'
          ),

        // ========================================
        // Processing Actions
        // ========================================
        
        setProcessing: (isProcessing) => set({ isProcessing }, false, 'setProcessing'),
        
        setProgress: (progress, statusMessage) => 
          set(
            (state) => ({
              progress,
              statusMessage: statusMessage ?? state.statusMessage,
            }),
            false,
            'setProgress'
          ),
        
        resetProcessing: () => 
          set(
            { isProcessing: false, progress: 0, statusMessage: '' },
            false,
            'resetProcessing'
          ),

        // ========================================
        // Queue Actions
        // ========================================
        
        addToQueue: (items) =>
          set(
            (state) => ({ queue: [...state.queue, ...items] }),
            false,
            'addToQueue'
          ),
        
        removeFromQueue: (id) =>
          set(
            (state) => ({ queue: state.queue.filter((item) => item.id !== id) }),
            false,
            'removeFromQueue'
          ),
        
        updateQueueItem: (id, updates) =>
          set(
            (state) => ({
              queue: state.queue.map((item) =>
                item.id === id ? { ...item, ...updates } : item
              ),
            }),
            false,
            'updateQueueItem'
          ),
        
        reorderQueue: (fromIndex, toIndex) =>
          set(
            (state) => {
              const newQueue = [...state.queue];
              const [removed] = newQueue.splice(fromIndex, 1);
              if (removed) {
                newQueue.splice(toIndex, 0, removed);
              }
              return { queue: newQueue };
            },
            false,
            'reorderQueue'
          ),
        
        clearQueue: () => set({ queue: [] }, false, 'clearQueue'),

        // ========================================
        // History Actions
        // ========================================
        
        setHistoryItems: (items) => set({ historyItems: items }, false, 'setHistoryItems'),
        
        addHistoryItem: (item) =>
          set(
            (state) => ({ historyItems: [item, ...state.historyItems] }),
            false,
            'addHistoryItem'
          ),
        
        removeHistoryItem: (id) =>
          set(
            (state) => ({
              historyItems: state.historyItems.filter((item) => item.id !== id),
            }),
            false,
            'removeHistoryItem'
          ),

        // ========================================
        // Settings Actions
        // ========================================
        
        updateSettings: (newSettings) =>
          set(
            (state) => ({
              settings: { ...state.settings, ...newSettings },
            }),
            false,
            'updateSettings'
          ),
        
        resetSettings: () => set({ settings: defaultSettings }, false, 'resetSettings'),

        // ========================================
        // Reset All
        // ========================================
        
        resetAll: () => set(initialState, false, 'resetAll'),
      }),
      {
        name: 'scriptgrab-storage',
        // Only persist settings (not history - history comes from backend)
        partialize: (state) => ({
          settings: state.settings,
        }),
      }
    ),
    { name: 'ScriptGrab Store' }
  )
);

// ============================================
// Selector Hooks (for optimized re-renders)
// ============================================

export const useCurrentView = () => useAppStore((state) => state.currentView);
export const useCurrentFile = () => useAppStore((state) => state.currentFile);
export const useTranscript = () => useAppStore((state) => state.transcript);
export const useIsProcessing = () => useAppStore((state) => state.isProcessing);
export const useProgress = () => useAppStore((state) => ({ 
  progress: state.progress, 
  statusMessage: state.statusMessage 
}));
export const useQueue = () => useAppStore((state) => state.queue);
export const useHistoryItems = () => useAppStore((state) => state.historyItems);
export const useSettings = () => useAppStore((state) => state.settings);

// ============================================
// Action Hooks (for cleaner component code)
// ============================================

// Use shallow comparison to prevent infinite loops
import { useShallow } from 'zustand/react/shallow';

export const useAppActions = () => useAppStore(
  useShallow((state) => ({
    setCurrentView: state.setCurrentView,
    setFile: state.setFile,
    clearFile: state.clearFile,
    setTranscript: state.setTranscript,
    clearTranscript: state.clearTranscript,
    updateSegmentText: state.updateSegmentText,
    setProcessing: state.setProcessing,
    setProgress: state.setProgress,
    resetProcessing: state.resetProcessing,
    addToQueue: state.addToQueue,
    removeFromQueue: state.removeFromQueue,
    updateQueueItem: state.updateQueueItem,
    reorderQueue: state.reorderQueue,
    clearQueue: state.clearQueue,
    setHistoryItems: state.setHistoryItems,
    addHistoryItem: state.addHistoryItem,
    removeHistoryItem: state.removeHistoryItem,
    updateSettings: state.updateSettings,
    resetSettings: state.resetSettings,
    resetAll: state.resetAll,
  }))
);
