/**
 * Transcript Utility Functions
 * Requirements: 2.6, 2.7, 3.3
 */

import type { Transcript, Segment, Word } from '../types';

// ============================================
// Validation Functions
// ============================================

/**
 * Validates that all word timestamps are within segment bounds
 * Property 3: Word Timestamps Within Segment Bounds
 * 
 * For any valid transcript segment, all word timestamps SHALL satisfy:
 * segment.start <= word.start <= word.end <= segment.end
 * 
 * @param segment - The segment to validate
 * @returns true if all words are within bounds, false otherwise
 */
export function validateWordTimestamps(segment: Segment): boolean {
  if (!segment.words || segment.words.length === 0) {
    return true; // No words to validate
  }

  for (const word of segment.words) {
    // Check: segment.start <= word.start
    if (word.start < segment.start) {
      return false;
    }
    // Check: word.start <= word.end
    if (word.start > word.end) {
      return false;
    }
    // Check: word.end <= segment.end
    if (word.end > segment.end) {
      return false;
    }
  }

  return true;
}

/**
 * Validates all segments in a transcript have valid word timestamps
 * @param transcript - The transcript to validate
 * @returns true if all segments have valid word timestamps
 */
export function validateTranscriptWordTimestamps(transcript: Transcript): boolean {
  for (const segment of transcript.segments) {
    if (!validateWordTimestamps(segment)) {
      return false;
    }
  }
  return true;
}

// ============================================
// Segment Lookup Functions
// ============================================

/**
 * Finds the segment containing a given timestamp
 * Property 6: Segment Lookup by Timestamp
 * 
 * For any timestamp t within the transcript duration, the segment lookup 
 * function SHALL return the segment where segment.start <= t < segment.end,
 * or null if no segment contains t.
 * 
 * @param segments - Array of transcript segments
 * @param timestamp - Time in seconds to look up
 * @returns The segment containing the timestamp, or null
 */
export function findSegmentByTimestamp(
  segments: Segment[],
  timestamp: number
): Segment | null {
  if (!segments || segments.length === 0) return null;
  
  for (const segment of segments) {
    if (timestamp >= segment.start && timestamp < segment.end) {
      return segment;
    }
  }
  return null;
}

/**
 * Finds the word containing a given timestamp within a segment
 * @param segment - The segment to search
 * @param timestamp - Time in seconds to look up
 * @returns The word containing the timestamp, or null
 */
export function findWordByTimestamp(
  segment: Segment,
  timestamp: number
): Word | null {
  if (!segment.words || segment.words.length === 0) return null;
  
  for (const word of segment.words) {
    if (timestamp >= word.start && timestamp < word.end) {
      return word;
    }
  }
  return null;
}

// ============================================
// Timestamp Formatting
// ============================================

/**
 * Formats seconds to MM:SS or HH:MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTimestamp(seconds: number): string {
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

/**
 * Formats seconds to SRT timestamp format (HH:MM:SS,mmm)
 * @param seconds - Time in seconds
 * @returns SRT formatted time string
 */
export function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
    .toString()
    .padStart(3, "0")}`;
}
