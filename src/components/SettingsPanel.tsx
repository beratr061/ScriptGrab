/**
 * SettingsPanel Component
 * Provides UI for configuring application settings
 * Requirements: 9.1, 9.2, 9.3
 */

import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { X, Cpu, Monitor } from 'lucide-react';
import { useSettings, useAppStore } from '../store/appStore';
import type { ModelSize, Settings } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Model size options with descriptions
const MODEL_OPTIONS: { value: ModelSize; label: string; description: string; ram: string }[] = [
  { value: 'base', label: 'Base', description: 'Hızlı işlem, temel doğruluk', ram: '~1GB RAM' },
  { value: 'small', label: 'Small', description: 'Dengeli performans', ram: '~2GB RAM' },
  { value: 'medium', label: 'Medium', description: 'Yüksek doğruluk', ram: '~5GB RAM' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const settings = useSettings();
  const updateSettings = useAppStore((state) => state.updateSettings);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await invoke<Settings>('get_settings');
        updateSettings(savedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, updateSettings]);

  // Save settings to backend
  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    updateSettings(newSettings);
    
    try {
      await invoke('save_settings', { settings: updatedSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings, updateSettings]);

  // Handle model size change
  const handleModelSizeChange = useCallback((modelSize: ModelSize) => {
    saveSettings({ modelSize });
  }, [saveSettings]);

  // Handle minimize to tray toggle
  const handleMinimizeToTrayChange = useCallback((minimizeToTray: boolean) => {
    saveSettings({ minimizeToTray });
  }, [saveSettings]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">Ayarlar</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Settings Content */}
            <div className="p-4 space-y-6">
              {/* Model Size Selection */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-medium text-zinc-300">Whisper Model</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                  Daha büyük modeller daha doğru sonuç verir ama daha fazla RAM kullanır.
                </p>
                <div className="space-y-2">
                  {MODEL_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        settings.modelSize === option.value
                          ? 'bg-indigo-600/20 border border-indigo-500/50 ring-1 ring-indigo-500/30'
                          : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="modelSize"
                        value={option.value}
                        checked={settings.modelSize === option.value}
                        onChange={() => handleModelSizeChange(option.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settings.modelSize === option.value
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-zinc-600'
                      }`}>
                        {settings.modelSize === option.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-200">{option.label}</span>
                          <span className="text-xs text-zinc-500">{option.ram}</span>
                        </div>
                        <span className="text-xs text-zinc-500">{option.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* System Behavior */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-medium text-zinc-300">Sistem Davranışı</h3>
                </div>
                <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800 transition-colors">
                  <div>
                    <span className="block text-sm font-medium text-zinc-200">Sistem tepsisine küçült</span>
                    <span className="block text-xs text-zinc-500 mt-0.5">
                      Kapatıldığında arka planda çalışmaya devam et
                    </span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={settings.minimizeToTray}
                    onClick={() => handleMinimizeToTrayChange(!settings.minimizeToTray)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.minimizeToTray ? 'bg-indigo-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settings.minimizeToTray ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </section>

              {/* About */}
              <section className="pt-4 border-t border-zinc-800">
                <div className="p-4 rounded-lg bg-zinc-800/30 text-center">
                  <p className="text-sm font-medium text-zinc-300">ScriptGrab</p>
                  <p className="text-xs text-zinc-500 mt-1">v1.0.0</p>
                  <p className="text-xs text-zinc-600 mt-2">
                    Powered by OpenAI Whisper
                  </p>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
