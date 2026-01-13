/**
 * ProcessingView Component
 * Displays transcription progress with animated status messages
 * Requirements: 2.4, 7.3
 */

import { useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import DecryptedText from "./reactbits/DecryptedText";
import GradientText from "./reactbits/GradientText";
import { useTranscriptionEvents } from "../hooks/useTranscriptionEvents";
import { useAppStore } from "../store/appStore";
import type { Segment, Transcript } from "../types";

interface ProcessingViewProps {
  fileName: string;
  progress: number;
  status: string;
  jobId?: string;
  onCancel: () => void;
  onComplete?: (transcript: Transcript) => void;
  onError?: (message: string) => void;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({
  fileName,
  progress,
  status,
  jobId,
  onCancel,
  onComplete,
  onError,
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Get store actions for updating state
  const { setProgress, setTranscript, setCurrentView, resetProcessing } = useAppStore();

  // Track segments as they come in - use useRef to persist across renders
  const segmentsRef = useRef<Segment[]>([]);
  // Track if we've already completed to prevent duplicate handling
  const completedRef = useRef(false);

  // Reset refs when jobId changes (new transcription started)
  useEffect(() => {
    segmentsRef.current = [];
    completedRef.current = false;
  }, [jobId]);

  // Handle transcription progress events
  const handleProgress = useCallback(
    (_jobId: string, percent: number, statusMessage: string) => {
      setProgress(percent, statusMessage);
    },
    [setProgress]
  );

  // Handle new segment events
  const handleSegment = useCallback(
    (_jobId: string, segment: Segment) => {
      // Avoid duplicate segments by checking if segment already exists
      const exists = segmentsRef.current.some(s => s.id === segment.id);
      if (!exists) {
        segmentsRef.current.push(segment);
      }
    },
    []
  );

  // Handle transcription completion
  const handleComplete = useCallback(
    (_jobId: string, language: string, duration: number) => {
      // Prevent duplicate completion handling
      if (completedRef.current) return;
      completedRef.current = true;
      
      const transcript: Transcript = {
        segments: [...segmentsRef.current],
        language,
        duration,
      };
      setTranscript(transcript);
      setCurrentView("result");
      resetProcessing();
      onComplete?.(transcript);
    },
    [setTranscript, setCurrentView, resetProcessing, onComplete]
  );

  // Handle transcription errors
  const handleError = useCallback(
    (_jobId: string, message: string) => {
      // Reset refs on error
      segmentsRef.current = [];
      completedRef.current = false;
      resetProcessing();
      setCurrentView("idle");
      onError?.(message);
    },
    [resetProcessing, setCurrentView, onError]
  );

  // Set up Tauri event listeners
  useTranscriptionEvents(
    {
      onProgress: handleProgress,
      onSegment: handleSegment,
      onComplete: handleComplete,
      onError: handleError,
    },
    {
      jobId,
      enabled: true,
    }
  );

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* Container with subtle background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg space-y-8"
      >
        {/* File name */}
        <div className="text-center">
          <p className="text-zinc-500 text-sm mb-1">İşleniyor</p>
          <h2 className="text-zinc-200 text-lg font-medium truncate px-4">
            {fileName}
          </h2>
        </div>

        {/* Progress percentage with GradientText */}
        <div className="text-center">
          <GradientText
            className="text-6xl font-bold"
            colors={["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5"]}
            animationSpeed={3}
          >
            {clampedProgress}%
          </GradientText>
        </div>

        {/* Progress bar */}
        <div className="relative">
          {/* Background track */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            {/* Progress fill */}
            <motion.div
              className="h-full bg-linear-to-r from-indigo-600 via-indigo-500 to-indigo-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${clampedProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          
          {/* Animated glow effect on progress bar */}
          <motion.div
            className="absolute top-0 h-2 w-20 bg-linear-to-r from-transparent via-white/20 to-transparent rounded-full"
            animate={{
              left: ["-20%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              clipPath: `inset(0 ${100 - clampedProgress}% 0 0)`,
            }}
          />
        </div>

        {/* Status message with DecryptedText animation */}
        <div className="text-center min-h-8">
          <DecryptedText
            key={status} // Re-animate when status changes
            text={status || "Hazırlanıyor..."}
            speed={30}
            maxIterations={8}
            className="text-zinc-300"
            encryptedClassName="text-zinc-600"
            animateOn="view"
            revealDirection="start"
          />
        </div>

        {/* Cancel button */}
        <div className="flex justify-center pt-4">
          <motion.button
            onClick={onCancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors duration-200 flex items-center gap-2 border border-zinc-700 hover:border-zinc-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            İptal Et
          </motion.button>
        </div>

        {/* Processing indicator dots */}
        <div className="flex justify-center gap-1.5 pt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-indigo-500 rounded-full"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ProcessingView;
