/**
 * DropZone Component
 * File upload area with drag-and-drop support and animated background
 * Requirements: 1.1 (drag-drop), 1.2 (file picker), 7.2 (animated background)
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { open } from '@tauri-apps/plugin-dialog';
import Threads from './Threads';
import { validateFileFormat, getSupportedFormatsString, SUPPORTED_EXTENSIONS } from '../lib/validation';

interface DropZoneProps {
  onFileDrop: (filePath: string) => void;
  onMultipleFilesDrop?: (filePaths: string[]) => void;
  isProcessing?: boolean;
  allowMultiple?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ 
  onFileDrop, 
  onMultipleFilesDrop,
  isProcessing = false,
  allowMultiple = false 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragOver(true);
      setError(null);
    }
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragOver to false if we're leaving the drop zone entirely
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Validate all files
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];
    
    files.forEach(file => {
      const filePath = (file as any).path || file.name;
      if (validateFileFormat(filePath)) {
        validFiles.push(filePath);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0 && validFiles.length === 0) {
      setError(`Desteklenmeyen format. Desteklenen formatlar: ${getSupportedFormatsString()}`);
      return;
    }

    setError(null);

    // Handle multiple files if allowed and callback provided
    if (allowMultiple && onMultipleFilesDrop && validFiles.length > 0) {
      onMultipleFilesDrop(validFiles);
    } else if (validFiles.length > 0) {
      // Single file mode - use first valid file
      onFileDrop(validFiles[0]);
    }
  }, [isProcessing, onFileDrop, onMultipleFilesDrop, allowMultiple]);

  const handleFileSelect = useCallback(async () => {
    if (isProcessing) return;

    try {
      const selected = await open({
        multiple: allowMultiple,
        filters: [{
          name: 'Ses/Video Dosyaları',
          extensions: SUPPORTED_EXTENSIONS.map(ext => ext.slice(1)), // Remove leading dot
        }],
      });

      if (selected) {
        setError(null);
        
        if (Array.isArray(selected)) {
          // Multiple files selected
          if (allowMultiple && onMultipleFilesDrop && selected.length > 0) {
            onMultipleFilesDrop(selected);
          } else if (selected.length > 0) {
            onFileDrop(selected[0]);
          }
        } else if (typeof selected === 'string') {
          // Single file selected
          onFileDrop(selected);
        }
      }
    } catch (err) {
      console.error('File selection error:', err);
      setError('Dosya seçilirken bir hata oluştu');
    }
  }, [isProcessing, onFileDrop, onMultipleFilesDrop, allowMultiple]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <Threads
          color={[0.31, 0.27, 0.9]} // indigo-600 RGB normalized
          amplitude={0.8}
          distance={0.3}
          enableMouseInteraction={true}
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-linear-to-b from-zinc-950/50 via-transparent to-zinc-950/50" />
      </div>

      {/* Drop Zone */}
      <motion.div
        ref={dropRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`
          relative z-10 w-full max-w-xl p-12
          border-2 border-dashed rounded-2xl
          backdrop-blur-sm bg-zinc-900/30
          transition-all duration-300 ease-out
          ${isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
            : 'border-zinc-700 hover:border-zinc-600'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onClick={handleFileSelect}
      >
        {/* Icon */}
        <motion.div
          animate={{
            y: isDragOver ? -5 : 0,
            scale: isDragOver ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="flex justify-center mb-6"
        >
          <div className={`
            p-4 rounded-full
            ${isDragOver ? 'bg-indigo-500/20' : 'bg-zinc-800/50'}
            transition-colors duration-300
          `}>
            <svg
              className={`w-12 h-12 ${isDragOver ? 'text-indigo-400' : 'text-zinc-500'} transition-colors duration-300`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        </motion.div>

        {/* Text */}
        <div className="text-center space-y-3">
          <AnimatePresence mode="wait">
            {isDragOver ? (
              <motion.p
                key="drop"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-medium text-indigo-400"
              >
                {allowMultiple ? 'Dosyaları bırakın' : 'Dosyayı bırakın'}
              </motion.p>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="text-lg font-medium text-zinc-200">
                  {allowMultiple ? 'Dosyaları sürükleyip bırakın' : 'Dosyayı sürükleyip bırakın'}
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  veya tıklayarak seçin
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supported formats */}
          <p className="text-xs text-zinc-600 mt-4">
            Desteklenen formatlar: {getSupportedFormatsString()}
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -bottom-16 left-0 right-0 text-center"
            >
              <p className="text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-lg inline-block">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DropZone;
