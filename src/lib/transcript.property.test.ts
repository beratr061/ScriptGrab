/**
 * Property-Based Tests for Transcript Functions
 * Feature: scriptgrab-transcriber
 * 
 * Property 3: Word Timestamps Within Segment Bounds
 * Validates: Requirements 2.7
 * 
 * Property 6: Segment Lookup by Timestamp
 * Validates: Requirements 3.3
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { 
  validateWordTimestamps, 
  findSegmentByTimestamp 
} from './transcript';
import type { Segment, Word } from '../types';

// ============================================
// Arbitrary Generators
// ============================================

/**
 * Generate a valid Word with timestamps within given bounds
 */
const wordArbitrary = (segStart: number, segEnd: number): fc.Arbitrary<Word> => {
  const range = segEnd - segStart;
  return fc.tuple(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.nat({ max: 100 }),
    fc.nat({ max: 100 })
  ).map(([word, p1, p2]) => {
    const t1 = segStart + (p1 / 100) * range;
    const t2 = segStart + (p2 / 100) * range;
    return {
      word: word || 'word',
      start: Math.min(t1, t2),
      end: Math.max(t1, t2),
    };
  });
};

/**
 * Generate a valid Segment with words within bounds
 */
const validSegmentArbitrary: fc.Arbitrary<Segment> = fc.tuple(
  fc.uuid(),
  fc.nat({ max: 3600 }),
  fc.nat({ max: 60 }),
  fc.string({ minLength: 1, maxLength: 100 })
).chain(([id, startBase, duration, text]) => {
  const start = startBase;
  const end = start + duration + 1; // Ensure end > start
  
  return fc.array(wordArbitrary(start, end), { minLength: 0, maxLength: 5 })
    .map(words => ({
      id,
      start,
      end,
      text: text || 'text',
      words,
    }));
});

/**
 * Generate a Segment with at least one word outside bounds
 */
const invalidSegmentArbitrary: fc.Arbitrary<Segment> = fc.tuple(
  fc.uuid(),
  fc.integer({ min: 10, max: 100 }),
  fc.integer({ min: 10, max: 60 }),
  fc.string({ minLength: 1, maxLength: 100 }),
  fc.boolean()
).map(([id, start, duration, text, beforeOrAfter]) => {
  const end = start + duration;
  
  // Create an invalid word
  const invalidWord: Word = beforeOrAfter
    ? { word: 'invalid', start: start - 5, end: start - 1 } // Before segment
    : { word: 'invalid', start: end + 1, end: end + 5 }; // After segment
  
  return {
    id,
    start,
    end,
    text: text || 'text',
    words: [invalidWord],
  };
});

/**
 * Generate non-overlapping segments
 */
const segmentsArbitrary = (count: number): fc.Arbitrary<Segment[]> => {
  return fc.array(
    fc.tuple(
      fc.uuid(),
      fc.integer({ min: 1, max: 10 }),
      fc.string({ minLength: 1, maxLength: 50 })
    ),
    { minLength: count, maxLength: count }
  ).map(items => {
    let time = 0;
    return items.map(([id, dur, text]) => {
      const start = time;
      const end = time + dur;
      time = end + 0.5; // Gap between segments
      return { id, start, end, text: text || 'text', words: [] };
    });
  });
};

// ============================================
// Property Tests: Word Timestamps Within Segment Bounds
// ============================================

describe('Property 3: Word Timestamps Within Segment Bounds', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 3: Word Timestamps Within Segment Bounds
   * 
   * *For any* valid transcript segment, all word timestamps SHALL satisfy:
   * segment.start <= word.start <= word.end <= segment.end
   * 
   * Validates: Requirements 2.7
   */

  it('should return true for segments with words within bounds', () => {
    fc.assert(
      fc.property(validSegmentArbitrary, (segment) => {
        return validateWordTimestamps(segment) === true;
      }),
      { numRuns: 100 }
    );
  });

  it('should return true for segments with no words', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.nat({ max: 3600 }),
        fc.nat({ max: 60 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (id, start, duration, text) => {
          const segment: Segment = {
            id,
            start,
            end: start + duration + 1,
            text: text || 'text',
            words: [],
          };
          return validateWordTimestamps(segment) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false for segments with words outside bounds', () => {
    fc.assert(
      fc.property(invalidSegmentArbitrary, (segment) => {
        return validateWordTimestamps(segment) === false;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property Tests: Segment Lookup by Timestamp
// ============================================

describe('Property 6: Segment Lookup by Timestamp', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 6: Segment Lookup by Timestamp
   * 
   * *For any* timestamp t within the transcript duration, the segment lookup 
   * function SHALL return the segment where segment.start <= t < segment.end,
   * or null if no segment contains t.
   * 
   * Validates: Requirements 3.3
   */

  it('should find segment when timestamp is within bounds', () => {
    fc.assert(
      fc.property(
        segmentsArbitrary(3),
        fc.integer({ min: 0, max: 2 }),
        (segments, idx) => {
          const seg = segments[idx];
          const timestamp = seg.start + (seg.end - seg.start) / 2;
          const found = findSegmentByTimestamp(segments, timestamp);
          return found !== null && found.id === seg.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null for timestamp before all segments', () => {
    fc.assert(
      fc.property(
        segmentsArbitrary(2),
        (segments) => {
          if (segments[0].start <= 0) return true; // Skip if no room before
          const timestamp = segments[0].start - 0.1;
          return findSegmentByTimestamp(segments, timestamp) === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null for timestamp after all segments', () => {
    fc.assert(
      fc.property(
        segmentsArbitrary(2),
        (segments) => {
          const last = segments[segments.length - 1];
          const timestamp = last.end + 1;
          return findSegmentByTimestamp(segments, timestamp) === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null for empty segments array', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1000 }),
        (timestamp) => findSegmentByTimestamp([], timestamp) === null
      ),
      { numRuns: 100 }
    );
  });

  it('should include start but exclude end (half-open interval)', () => {
    fc.assert(
      fc.property(
        segmentsArbitrary(1),
        (segments) => {
          const seg = segments[0];
          const atStart = findSegmentByTimestamp(segments, seg.start);
          const atEnd = findSegmentByTimestamp(segments, seg.end);
          return atStart !== null && atStart.id === seg.id && atEnd === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
