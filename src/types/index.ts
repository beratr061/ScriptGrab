/**
 * ScriptGrab TypeScript Type Definitions
 * Requirements: 2.6, 2.7, 5.1, 6.1
 */

// ============================================
// Export Format Enums
// ============================================

export type ExportFormat = 'txt' | 'srt' | 'json';

// ============================================
// Core Transcript Types
// ============================================

/**
 * Represents a single word with its timestamp
 * Requirements: 2.7 (word-level timestamps)
 */
export interface Word {
  word: string;
  start: number;
  end: number;
}

/**
 * Represents a transcript segment with text and timestamps
 * Requirements: 2.6 (timestamps)
 */
export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
}

/**
 * Complete transcript data structure
 * Requirements: 2.6, 2.7
 */
export interface Transcript {
  segments: Segment[];
  language: string;
  duration: number;
}

// ============================================
// File and Metadata Types
// ============================================

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  duration: number;
}

// ============================================
// History Types
// ============================================

/**
 * History item for saved transcripts
 * Requirements: 6.1 (save transcript with metadata)
 */
export interface HistoryItem {
  id: string;
  fileName: string;
  filePath: string;
  date: string;
  duration: number;
  language: string;
}

/**
 * Stored transcript with full metadata
 * Requirements: 6.1
 */
export interface StoredTranscript {
  id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  duration: number;
  language: string;
  modelSize: ModelSize;
  segments: Segment[];
}

// ============================================
// Queue Types
// ============================================

export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Queue item for batch processing
 */
export interface QueueItem {
  id: string;
  filePath: string;
  fileName: string;
  status: QueueItemStatus;
  progress: number;
  addedAt: string;
}

// ============================================
// Settings Types
// ============================================

export type ModelSize = 'base' | 'small' | 'medium';

/**
 * Application settings
 * Requirements: 5.1 (export formats), 9.1-9.5
 */
export interface Settings {
  modelSize: ModelSize;
  minimizeToTray: boolean;
  defaultExportFormat: ExportFormat;
  autoCheckUpdates: boolean;
}

// ============================================
// Application State Types
// ============================================

export type AppView = 'idle' | 'processing' | 'result';

export interface AppState {
  currentView: AppView;
  currentFile: FileInfo | null;
  transcript: Transcript | null;
  queue: QueueItem[];
  settings: Settings;
}

// ============================================
// Sidecar Message Types (Python -> Rust -> Frontend)
// ============================================

export interface ProgressMessage {
  type: 'progress';
  percent: number;
  status: string;
}

export interface SegmentMessage {
  type: 'segment';
  data: Segment;
}

export interface CompleteMessage {
  type: 'complete';
  language: string;
  duration: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type SidecarMessage = ProgressMessage | SegmentMessage | CompleteMessage | ErrorMessage;

// ============================================
// Transcription Event Payload Types (Rust -> Frontend)
// ============================================

/**
 * Event payload for transcription progress
 * Requirements: 2.4
 */
export interface TranscriptionProgressPayload {
  job_id: string;
  percent: number;
  status: string;
}

/**
 * Event payload for transcription segment
 * Requirements: 2.6
 */
export interface TranscriptionSegmentPayload {
  job_id: string;
  segment: Segment;
}

/**
 * Event payload for transcription completion
 * Requirements: 2.6
 */
export interface TranscriptionCompletePayload {
  job_id: string;
  language: string;
  duration: number;
}

/**
 * Event payload for transcription error
 * Requirements: 2.8
 */
export interface TranscriptionErrorPayload {
  job_id: string;
  message: string;
}

// ============================================
// Model Info Types
// ============================================

export interface ModelInfo {
  name: ModelSize;
  size: string;
  downloaded: boolean;
}

// ============================================
// FFmpeg Check Types
// ============================================

/**
 * Result of FFmpeg availability check
 * Requirements: 2.1, 2.2
 */
export interface FFmpegCheckResult {
  available: boolean;
  location: string | null;
  version: string | null;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_SETTINGS: Settings = {
  modelSize: 'base',
  minimizeToTray: false,
  defaultExportFormat: 'txt',
  autoCheckUpdates: true,
};
