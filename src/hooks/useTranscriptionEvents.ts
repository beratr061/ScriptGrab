/**
 * useTranscriptionEvents Hook
 * Handles Tauri event listeners for transcription progress, completion, and errors
 * Requirements: 2.4, 2.8
 */

import { useEffect, useCallback, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type {
  TranscriptionProgressPayload,
  TranscriptionSegmentPayload,
  TranscriptionCompletePayload,
  TranscriptionErrorPayload,
  Segment,
} from "../types";

// ============================================
// Types
// ============================================

interface TranscriptionEventHandlers {
  /** Called when transcription progress updates */
  onProgress?: (jobId: string, percent: number, status: string) => void;
  /** Called when a new segment is transcribed */
  onSegment?: (jobId: string, segment: Segment) => void;
  /** Called when transcription completes successfully */
  onComplete?: (jobId: string, language: string, duration: number) => void;
  /** Called when an error occurs during transcription */
  onError?: (jobId: string, message: string) => void;
}

interface UseTranscriptionEventsOptions {
  /** Only listen for events from this specific job ID */
  jobId?: string;
  /** Whether to enable event listening */
  enabled?: boolean;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook to listen for Tauri transcription events
 * 
 * @param handlers - Event handler callbacks
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * useTranscriptionEvents({
 *   onProgress: (jobId, percent, status) => {
 *     setProgress(percent);
 *     setStatus(status);
 *   },
 *   onComplete: (jobId, language, duration) => {
 *     console.log('Transcription complete!');
 *   },
 *   onError: (jobId, message) => {
 *     console.error('Error:', message);
 *   },
 * }, { jobId: currentJobId, enabled: isProcessing });
 * ```
 */
export function useTranscriptionEvents(
  handlers: TranscriptionEventHandlers,
  options: UseTranscriptionEventsOptions = {}
): void {
  const { jobId, enabled = true } = options;
  
  // Store handlers in refs to avoid re-subscribing on every render
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Store unlisten functions
  const unlistenRefs = useRef<UnlistenFn[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    unlistenRefs.current.forEach((unlisten) => unlisten());
    unlistenRefs.current = [];
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    const setupListeners = async () => {
      // Clean up any existing listeners
      cleanup();

      const unlisteners: UnlistenFn[] = [];

      // Listen for progress events
      const unlistenProgress = await listen<TranscriptionProgressPayload>(
        "transcription_progress",
        (event) => {
          const { job_id, percent, status } = event.payload;
          
          // Filter by jobId if specified
          if (jobId && job_id !== jobId) return;
          
          handlersRef.current.onProgress?.(job_id, percent, status);
        }
      );
      unlisteners.push(unlistenProgress);

      // Listen for segment events
      const unlistenSegment = await listen<TranscriptionSegmentPayload>(
        "transcription_segment",
        (event) => {
          const { job_id, segment } = event.payload;
          
          // Filter by jobId if specified
          if (jobId && job_id !== jobId) return;
          
          handlersRef.current.onSegment?.(job_id, segment);
        }
      );
      unlisteners.push(unlistenSegment);

      // Listen for completion events
      const unlistenComplete = await listen<TranscriptionCompletePayload>(
        "transcription_complete",
        (event) => {
          const { job_id, language, duration } = event.payload;
          
          // Filter by jobId if specified
          if (jobId && job_id !== jobId) return;
          
          handlersRef.current.onComplete?.(job_id, language, duration);
        }
      );
      unlisteners.push(unlistenComplete);

      // Listen for error events
      const unlistenError = await listen<TranscriptionErrorPayload>(
        "transcription_error",
        (event) => {
          const { job_id, message } = event.payload;
          
          // Filter by jobId if specified
          if (jobId && job_id !== jobId) return;
          
          handlersRef.current.onError?.(job_id, message);
        }
      );
      unlisteners.push(unlistenError);

      unlistenRefs.current = unlisteners;
    };

    setupListeners();

    // Cleanup on unmount or when dependencies change
    return cleanup;
  }, [enabled, jobId, cleanup]);
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Hook to listen only for transcription progress events
 */
export function useTranscriptionProgress(
  onProgress: (jobId: string, percent: number, status: string) => void,
  options: UseTranscriptionEventsOptions = {}
): void {
  useTranscriptionEvents({ onProgress }, options);
}

/**
 * Hook to listen only for transcription completion events
 */
export function useTranscriptionComplete(
  onComplete: (jobId: string, language: string, duration: number) => void,
  options: UseTranscriptionEventsOptions = {}
): void {
  useTranscriptionEvents({ onComplete }, options);
}

/**
 * Hook to listen only for transcription error events
 */
export function useTranscriptionError(
  onError: (jobId: string, message: string) => void,
  options: UseTranscriptionEventsOptions = {}
): void {
  useTranscriptionEvents({ onError }, options);
}

export default useTranscriptionEvents;
