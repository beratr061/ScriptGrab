/**
 * SettingsPanel Component
 * Provides UI for configuring application settings
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { useSettings, useAppStore } from '../store/appStore';
import type { ModelSize, ExportFormat, Settings } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Model size options with descriptions
const MODEL_OPTIONS: { value: ModelSize; label: string; description: string }[] = [
  { value: 'base', label: 'Base', description: 'Hızlı, düşük kaynak kullanımı (~1GB RAM)' },
  { value: 'small', label: 'Small', description: 'Dengeli performans (~2GB RAM)' },
  { value: 'medium', label: 'Medium', description: 'Yüksek doğruluk (~5GB RAM)' },
];

// Export format options
const EXPORT_FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'txt', label: 'TXT', description: 'Düz metin, zaman damgası yok' },
  { value: 'srt', label: 'SRT', description: 'Altyazı formatı, zaman damgalı' },
  { value: 'json', label: 'JSON', description: 'Tam veri, kelime düzeyinde zaman damgası' },
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

  // Save settings to backend whenever they change
  // Requirements: 9.5
  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    updateSettings(newSettings);
    
    try {
      await invoke('save_settings', { settings: updatedSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings, updateSettings]);

  // Handle model size change - Requirements: 9.2
  const handleModelSizeChange = useCallback((modelSize: ModelSize) => {
    saveSettings({ modelSize });
  }, [saveSettings]);

  // Handle minimize to tray toggle - Requirements: 9.3
  const handleMinimizeToTrayChange = useCallback((minimizeToTray: boolean) => {
    saveSettings({ minimizeToTray });
  }, [saveSettings]);

  // Handle default export format change - Requirements: 9.4
  const handleExportFormatChange = useCallback((defaultExportFormat: ExportFormat) => {
    saveSettings({ defaultExportFormat });
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Settings Content */}
            <div className="p-4 space-y-6">
              {/* Model Size Selection - Requirements: 9.2 */}
              <section>
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Whisper Model Boyutu</h3>
                <div className="space-y-2">
                  {MODEL_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        settings.modelSize === option.value
                          ? 'bg-indigo-600/20 border border-indigo-500/50'
                          : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="modelSize"
                        value={option.value}
                        checked={settings.modelSize === option.value}
                        onChange={() => handleModelSizeChange(option.value)}
                        className="mt-1 w-4 h-4 text-indigo-600 bg-zinc-700 border-zinc-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-medium text-zinc-200">{option.label}</span>
                        <span className="block text-xs text-zinc-500 mt-0.5">{option.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Minimize to Tray Toggle - Requirements: 9.3 */}
              <section>
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Sistem Davranışı</h3>
                <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800 transition-colors">
                  <div>
                    <span className="block text-sm font-medium text-zinc-200">Sistem tepsisine küçült</span>
                    <span className="block text-xs text-zinc-500 mt-0.5">
                      Pencere kapatıldığında uygulamayı arka planda çalıştır
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.minimizeToTray}
                      onChange={(e) => handleMinimizeToTrayChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                </label>
              </section>

              {/* Default Export Format - Requirements: 9.4 */}
              <section>
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Varsayılan Dışa Aktarma Formatı</h3>
                <div className="space-y-2">
                  {EXPORT_FORMAT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        settings.defaultExportFormat === option.value
                          ? 'bg-indigo-600/20 border border-indigo-500/50'
                          : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="exportFormat"
                        value={option.value}
                        checked={settings.defaultExportFormat === option.value}
                        onChange={() => handleExportFormatChange(option.value)}
                        className="mt-1 w-4 h-4 text-indigo-600 bg-zinc-700 border-zinc-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-medium text-zinc-200">{option.label}</span>
                        <span className="block text-xs text-zinc-500 mt-0.5">{option.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Version Info */}
              <section className="pt-4 border-t border-zinc-800">
                <div className="text-center text-xs text-zinc-600">
                  <p>ScriptGrab v1.0.0</p>
                  <p className="mt-1">Powered by OpenAI Whisper</p>
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
