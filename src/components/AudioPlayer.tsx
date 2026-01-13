/**
 * AudioPlayer Component
 * Wavesurfer.js integration for audio playback with waveform visualization
 * Requirements: 3.1, 3.2, 3.5
 */

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import WaveSurfer from "wavesurfer.js";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";

// ============================================
// Types
// ============================================

export interface AudioPlayerRef {
  /** Seek to a specific time in seconds */
  seekTo: (time: number) => void;
  /** Get current playback time */
  getCurrentTime: () => number;
  /** Play audio */
  play: () => void;
  /** Pause audio */
  pause: () => void;
  /** Toggle play/pause */
  togglePlayPause: () => void;
  /** Check if audio is playing */
  isPlaying: () => boolean;
}

interface AudioPlayerProps {
  /** Path to the audio file */
  audioPath: string;
  /** Callback fired when playback time updates */
  onTimeUpdate?: (time: number) => void;
  /** Callback fired when user seeks */
  onSeek?: (time: number) => void;
  /** Callback fired when audio is ready */
  onReady?: (duration: number) => void;
  /** Callback fired when playback ends */
  onFinish?: () => void;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Formats seconds to MM:SS or HH:MM:SS format
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// ============================================
// Main Component
// ============================================

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ audioPath, onTimeUpdate, onSeek, onReady, onFinish }, ref) => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    
    // State
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        if (wavesurferRef.current && duration > 0) {
          const progress = Math.max(0, Math.min(1, time / duration));
          wavesurferRef.current.seekTo(progress);
          setCurrentTime(time);
        }
      },
      getCurrentTime: () => currentTime,
      play: () => wavesurferRef.current?.play(),
      pause: () => wavesurferRef.current?.pause(),
      togglePlayPause: () => wavesurferRef.current?.playPause(),
      isPlaying: () => isPlaying,
    }));

    // Initialize WaveSurfer
    useEffect(() => {
      if (!containerRef.current) return;

      setIsLoading(true);
      setIsReady(false);

      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#4f46e5",
        progressColor: "#818cf8",
        cursorColor: "#c7d2fe",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 80,
        normalize: true,
        backend: "WebAudio",
      });

      wavesurferRef.current = wavesurfer;

      // Event handlers
      wavesurfer.on("ready", () => {
        setIsReady(true);
        setIsLoading(false);
        const dur = wavesurfer.getDuration();
        setDuration(dur);
        onReady?.(dur);
      });

      wavesurfer.on("play", () => setIsPlaying(true));
      wavesurfer.on("pause", () => setIsPlaying(false));
      wavesurfer.on("finish", () => {
        setIsPlaying(false);
        onFinish?.();
      });

      wavesurfer.on("timeupdate", (time) => {
        setCurrentTime(time);
        onTimeUpdate?.(time);
      });

      wavesurfer.on("seeking", (progress) => {
        const time = progress * wavesurfer.getDuration();
        setCurrentTime(time);
        onSeek?.(time);
      });

      wavesurfer.on("error", (error) => {
        console.error("WaveSurfer error:", error);
        setIsLoading(false);
      });

      // Load audio file
      // For Tauri, we need to use convertFileSrc to get a proper URL
      const audioUrl = audioPath.startsWith("http") 
        ? audioPath 
        : convertFileSrc(audioPath);
      
      wavesurfer.load(audioUrl);

      return () => {
        try {
          wavesurfer.destroy();
        } catch {
          // Ignore abort errors during cleanup
        }
        wavesurferRef.current = null;
      };
    }, [audioPath]);

    // Handle volume changes
    useEffect(() => {
      if (wavesurferRef.current) {
        wavesurferRef.current.setVolume(isMuted ? 0 : volume);
      }
    }, [volume, isMuted]);

    // Control handlers
    const handlePlayPause = useCallback(() => {
      wavesurferRef.current?.playPause();
    }, []);

    const handleSkipBack = useCallback(() => {
      if (wavesurferRef.current && duration > 0) {
        const newTime = Math.max(0, currentTime - 10);
        wavesurferRef.current.seekTo(newTime / duration);
      }
    }, [currentTime, duration]);

    const handleSkipForward = useCallback(() => {
      if (wavesurferRef.current && duration > 0) {
        const newTime = Math.min(duration, currentTime + 10);
        wavesurferRef.current.seekTo(newTime / duration);
      }
    }, [currentTime, duration]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }, []);

    const handleToggleMute = useCallback(() => {
      setIsMuted((prev) => !prev);
    }, []);

    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
        {/* Waveform Container */}
        <div className="relative mb-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-lg z-10">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-zinc-400">Ses yükleniyor...</span>
              </div>
            </div>
          )}
          <div
            ref={containerRef}
            className="w-full rounded-lg overflow-hidden bg-zinc-950/50"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Time Display */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="text-sm font-mono text-indigo-400">
              {formatTime(currentTime)}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm font-mono text-zinc-500">
              {formatTime(duration)}
            </span>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleSkipBack}
              disabled={!isReady}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="10 saniye geri"
            >
              <SkipBack size={20} />
            </motion.button>

            <motion.button
              onClick={handlePlayPause}
              disabled={!isReady}
              className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </motion.button>

            <motion.button
              onClick={handleSkipForward}
              disabled={!isReady}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="10 saniye ileri"
            >
              <SkipForward size={20} />
            </motion.button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 min-w-[120px] justify-end">
            <motion.button
              onClick={handleToggleMute}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </motion.button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-indigo-500
                [&::-webkit-slider-thumb]:hover:bg-indigo-400
                [&::-webkit-slider-thumb]:transition-colors"
            />
          </div>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";

export default AudioPlayer;
