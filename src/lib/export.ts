/**
 * Export utilities for transcript data
 * Supports SRT, VTT, TXT, and JSON formats
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import type { Transcript, Segment } from '../types';

/**
 * Formats seconds to SRT timestamp format (HH:MM:SS,mmm)
 */
function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Formats seconds to VTT timestamp format (HH:MM:SS.mmm)
 */
function formatVttTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Export transcript to SRT format (segment-based)
 * Each segment becomes one subtitle entry
 */
export function exportToSrt(transcript: Transcript): string {
  return transcript.segments
    .map((segment, index) => {
      const startTime = formatSrtTimestamp(segment.start);
      const endTime = formatSrtTimestamp(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
}

/**
 * Export transcript to word-level SRT format
 * Each word becomes a separate subtitle entry - perfect for Premiere Pro karaoke effect
 * Requirements: 5.1 (enhanced)
 */
export function exportToWordSrt(transcript: Transcript): string {
  let index = 1;
  const entries: string[] = [];
  
  for (const segment of transcript.segments) {
    if (segment.words && segment.words.length > 0) {
      for (const word of segment.words) {
        const startTime = formatSrtTimestamp(word.start);
        const endTime = formatSrtTimestamp(word.end);
        entries.push(`${index}\n${startTime} --> ${endTime}\n${word.word}\n`);
        index++;
      }
    } else {
      // Fallback to segment if no words
      const startTime = formatSrtTimestamp(segment.start);
      const endTime = formatSrtTimestamp(segment.end);
      entries.push(`${index}\n${startTime} --> ${endTime}\n${segment.text}\n`);
      index++;
    }
  }
  
  return entries.join('\n');
}

/**
 * Export transcript to VTT format (segment-based)
 */
export function exportToVtt(transcript: Transcript): string {
  const header = 'WEBVTT\n\n';
  const cues = transcript.segments
    .map((segment) => {
      const startTime = formatVttTimestamp(segment.start);
      const endTime = formatVttTimestamp(segment.end);
      return `${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
  
  return header + cues;
}

/**
 * Export transcript to word-level VTT format
 */
export function exportToWordVtt(transcript: Transcript): string {
  const header = 'WEBVTT\n\n';
  const cues: string[] = [];
  
  for (const segment of transcript.segments) {
    if (segment.words && segment.words.length > 0) {
      for (const word of segment.words) {
        const startTime = formatVttTimestamp(word.start);
        const endTime = formatVttTimestamp(word.end);
        cues.push(`${startTime} --> ${endTime}\n${word.word}\n`);
      }
    } else {
      const startTime = formatVttTimestamp(segment.start);
      const endTime = formatVttTimestamp(segment.end);
      cues.push(`${startTime} --> ${endTime}\n${segment.text}\n`);
    }
  }
  
  return header + cues.join('\n');
}

/**
 * Export transcript to plain text
 * Requirements: 5.3
 */
export function exportToTxt(transcript: Transcript, includeTimestamps: boolean = false): string {
  if (includeTimestamps) {
    return transcript.segments
      .map((segment) => {
        const mins = Math.floor(segment.start / 60);
        const secs = Math.floor(segment.start % 60);
        const timestamp = `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
        return `${timestamp} ${segment.text}`;
      })
      .join('\n');
  }
  
  return transcript.segments.map((segment) => segment.text).join('\n');
}

/**
 * Export transcript to JSON format
 * Requirements: 5.4
 */
export function exportToJson(transcript: Transcript): string {
  return JSON.stringify(transcript, null, 2);
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy content to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}

export type ExportFormat = 'srt' | 'srt-word' | 'vtt' | 'vtt-word' | 'txt' | 'json';

/**
 * Export transcript in specified format
 */
export function exportTranscript(
  transcript: Transcript,
  format: ExportFormat,
  baseFilename: string = 'transcript'
): void {
  let content: string;
  let extension: string;
  let mimeType: string;
  
  switch (format) {
    case 'srt':
      content = exportToSrt(transcript);
      extension = 'srt';
      mimeType = 'text/plain';
      break;
    case 'srt-word':
      content = exportToWordSrt(transcript);
      extension = 'srt';
      mimeType = 'text/plain';
      break;
    case 'vtt':
      content = exportToVtt(transcript);
      extension = 'vtt';
      mimeType = 'text/vtt';
      break;
    case 'vtt-word':
      content = exportToWordVtt(transcript);
      extension = 'vtt';
      mimeType = 'text/vtt';
      break;
    case 'txt':
      content = exportToTxt(transcript, true);
      extension = 'txt';
      mimeType = 'text/plain';
      break;
    case 'json':
      content = exportToJson(transcript);
      extension = 'json';
      mimeType = 'application/json';
      break;
  }
  
  // Add suffix for word-level exports
  const suffix = format.includes('-word') ? '_kelime' : '';
  downloadFile(content, `${baseFilename}${suffix}.${extension}`, mimeType);
}
