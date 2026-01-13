/**
 * FFmpeg Check Hook
 * Requirements: 2.1, 2.2
 * 
 * Checks FFmpeg availability on application startup
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FFmpegCheckResult } from '../types';

interface UseFFmpegCheckReturn {
  isChecking: boolean;
  isAvailable: boolean | null;
  result: FFmpegCheckResult | null;
  error: string | null;
  checkFFmpeg: () => Promise<void>;
}

export function useFFmpegCheck(): UseFFmpegCheckReturn {
  const [isChecking, setIsChecking] = useState(true);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [result, setResult] = useState<FFmpegCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkFFmpeg = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const checkResult = await invoke<FFmpegCheckResult>('check_ffmpeg');
      setResult(checkResult);
      setIsAvailable(checkResult.available);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check FFmpeg on mount
  useEffect(() => {
    checkFFmpeg();
  }, [checkFFmpeg]);

  return {
    isChecking,
    isAvailable,
    result,
    error,
    checkFFmpeg,
  };
}
