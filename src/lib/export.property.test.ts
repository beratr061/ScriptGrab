/**
 * Property-Based Tests for Export Functions
 * Feature: scriptgrab-transcriber
 * - Property 8: TXT Export Content Preservation (Validates: Requirements 5.2)
 * - Property 9: SRT Export Format Validity (Validates: Requirements 5.3)
 * - Property 10: JSON Export Round-Trip (Validates: Requirements 5.4)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { exportToJson, parseJsonTranscript, transcriptsEqual, exportToTxt, exportToSrt } from './export';
import type { Transcript, Segment, Word } from '../types';

// ============================================
// Arbitrary Generators
// ============================================

/**
 * Generate a valid Word with timestamps
 */
const wordArbitrary = (minStart: number, maxEnd: number): fc.Arbitrary<Word> => {
  return fc.record({
    word: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    start: fc.double({ min: minStart, max: maxEnd, noNaN: true }),
    end: fc.double({ min: minStart, max: maxEnd, noNaN: true }),
  }).map(w => ({
    ...w,
    // Ensure start <= end
    start: Math.min(w.start, w.end),
    end: Math.max(w.start, w.end),
  }));
};

/**
 * Generate a valid Segment with words
 */
const segmentArbitrary = (minStart: number, maxEnd: number): fc.Arbitrary<Segment> => {
  return fc.record({
    id: fc.uuid(),
    start: fc.double({ min: minStart, max: maxEnd, noNaN: true }),
    end: fc.double({ min: minStart, max: maxEnd, noNaN: true }),
    text: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    words: fc.array(wordArbitrary(minStart, maxEnd), { minLength: 0, maxLength: 10 }),
  }).map(seg => ({
    ...seg,
    // Ensure start <= end
    start: Math.min(seg.start, seg.end),
    end: Math.max(seg.start, seg.end),
  }));
};

/**
 * Generate a valid Transcript
 */
const transcriptArbitrary: fc.Arbitrary<Transcript> = fc.record({
  segments: fc.array(segmentArbitrary(0, 3600), { minLength: 0, maxLength: 20 }),
  language: fc.constantFrom('en', 'tr', 'de', 'fr', 'es', 'ja', 'zh'),
  duration: fc.double({ min: 0, max: 7200, noNaN: true }),
});

// ============================================
// Property Tests
// ============================================

describe('Property 10: JSON Export Round-Trip', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 10: JSON Export Round-Trip
   * 
   * *For any* valid transcript, exporting to JSON and then parsing the JSON 
   * SHALL produce a transcript equivalent to the original (same segments, 
   * words, timestamps, language, duration).
   * 
   * Validates: Requirements 5.4
   */
  it('should preserve transcript data through JSON export and parse cycle', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        // Export to JSON
        const json = exportToJson(transcript);
        
        // Parse back
        const parsed = parseJsonTranscript(json);
        
        // Verify equivalence
        return transcriptsEqual(transcript, parsed);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce valid JSON output', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const json = exportToJson(transcript);
        
        // Should not throw when parsing
        expect(() => JSON.parse(json)).not.toThrow();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve segment count through round-trip', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const json = exportToJson(transcript);
        const parsed = parseJsonTranscript(json);
        
        return transcript.segments.length === parsed.segments.length;
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve language through round-trip', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const json = exportToJson(transcript);
        const parsed = parseJsonTranscript(json);
        
        return transcript.language === parsed.language;
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve duration through round-trip', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const json = exportToJson(transcript);
        const parsed = parseJsonTranscript(json);
        
        return transcript.duration === parsed.duration;
      }),
      { numRuns: 100 }
    );
  });
});


// ============================================
// Property 8: TXT Export Content Preservation
// ============================================

describe('Property 8: TXT Export Content Preservation', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 8: TXT Export Content Preservation
   * 
   * *For any* valid transcript, the TXT export SHALL contain all segment text 
   * concatenated with spaces, and SHALL NOT contain any timestamp information.
   * 
   * Validates: Requirements 5.2
   */
  it('should contain all segment text concatenated with spaces', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const txt = exportToTxt(transcript);
        
        // Each segment's text should appear in the output
        for (const segment of transcript.segments) {
          if (!txt.includes(segment.text)) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should not contain timestamp patterns (HH:MM:SS format)', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const txt = exportToTxt(transcript);
        
        // SRT timestamp pattern: HH:MM:SS,mmm --> HH:MM:SS,mmm
        const srtTimestampPattern = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;
        
        // Should not contain SRT-style timestamps
        return !srtTimestampPattern.test(txt);
      }),
      { numRuns: 100 }
    );
  });

  it('should not contain sequential numbering like SRT format', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const txt = exportToTxt(transcript);
        
        // SRT format has lines that are just numbers (1, 2, 3, etc.)
        // followed by timestamp lines - check for this pattern
        const srtNumberPattern = /^\d+\n\d{2}:\d{2}:\d{2}/m;
        
        return !srtNumberPattern.test(txt);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce output that equals segments joined by spaces', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        const txt = exportToTxt(transcript);
        const expected = transcript.segments.map(s => s.text).join(' ');
        
        return txt === expected;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 9: SRT Export Format Validity
// ============================================

describe('Property 9: SRT Export Format Validity', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 9: SRT Export Format Validity
   * 
   * *For any* valid transcript with n segments, the SRT export SHALL produce 
   * n subtitle blocks with sequential numbering (1 to n), valid timestamp 
   * format (HH:MM:SS,mmm --> HH:MM:SS,mmm), and matching segment text.
   * 
   * Validates: Requirements 5.3
   */
  it('should produce n subtitle blocks for n segments', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        if (transcript.segments.length === 0) {
          // Empty transcript should produce empty output
          const srt = exportToSrt(transcript);
          return srt === '';
        }
        
        const srt = exportToSrt(transcript);
        // Split by double newline to get blocks
        const blocks = srt.split('\n\n').filter(b => b.trim().length > 0);
        
        return blocks.length === transcript.segments.length;
      }),
      { numRuns: 100 }
    );
  });

  it('should have sequential numbering starting from 1', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        if (transcript.segments.length === 0) {
          return true;
        }
        
        const srt = exportToSrt(transcript);
        const blocks = srt.split('\n\n').filter(b => b.trim().length > 0);
        
        for (let i = 0; i < blocks.length; i++) {
          const lines = blocks[i].split('\n');
          const expectedNumber = i + 1;
          const actualNumber = parseInt(lines[0], 10);
          
          if (actualNumber !== expectedNumber) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should have valid timestamp format (HH:MM:SS,mmm --> HH:MM:SS,mmm)', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        if (transcript.segments.length === 0) {
          return true;
        }
        
        const srt = exportToSrt(transcript);
        const blocks = srt.split('\n\n').filter(b => b.trim().length > 0);
        
        // Valid SRT timestamp pattern
        const timestampPattern = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;
        
        for (const block of blocks) {
          const lines = block.split('\n');
          if (lines.length < 2) {
            return false;
          }
          
          // Second line should be the timestamp
          if (!timestampPattern.test(lines[1])) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should contain matching segment text in each block', () => {
    fc.assert(
      fc.property(transcriptArbitrary, (transcript) => {
        if (transcript.segments.length === 0) {
          return true;
        }
        
        const srt = exportToSrt(transcript);
        const blocks = srt.split('\n\n').filter(b => b.trim().length > 0);
        
        for (let i = 0; i < blocks.length; i++) {
          const lines = blocks[i].split('\n');
          // Third line onwards is the text
          const text = lines.slice(2).join('\n');
          
          if (text !== transcript.segments[i].text) {
            return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
