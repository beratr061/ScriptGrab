/**
 * Property-Based Tests for Queue Management
 * Feature: scriptgrab-transcriber
 * Property 4: Queue FIFO Processing Order
 * Property 5: Queue Reorder Consistency
 * Validates: Queue management requirements
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createQueueItem,
  createQueueItems,
  getNextPendingItem,
  reorderQueueItems,
  updateQueueItemStatus,
  removeQueueItem,
  getQueueStats,
  hasActiveItems,
} from './queue';
import type { QueueItemStatus } from '../types';

// ============================================
// Arbitrary Generators
// ============================================

/**
 * Generate a valid file path
 */
const filePathArbitrary = fc.tuple(
  fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && !s.includes('/') && !s.includes('\\')), { minLength: 0, maxLength: 3 }),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('/') && !s.includes('\\')),
  fc.constantFrom('.mp3', '.wav', '.m4a', '.mp4', '.mkv')
).map(([dirs, name, ext]) => {
  const path = dirs.length > 0 ? `${dirs.join('/')}/${name}${ext}` : `${name}${ext}`;
  return path;
});

/**
 * Generate multiple unique file paths
 */
const filePathsArbitrary = (minLength: number, maxLength: number) =>
  fc.array(filePathArbitrary, { minLength, maxLength })
    .map(paths => [...new Set(paths)]); // Ensure unique paths

/**
 * Generate a queue item status
 */
const queueItemStatusArbitrary = fc.constantFrom<QueueItemStatus>('pending', 'processing', 'completed', 'error');

/**
 * Generate a queue item with specific status
 */
const queueItemArbitrary = fc.tuple(
  filePathArbitrary,
  queueItemStatusArbitrary,
  fc.integer({ min: 0, max: 100 })
).map(([filePath, status, progress]) => {
  const item = createQueueItem(filePath);
  return { ...item, status, progress };
});

/**
 * Generate a queue with multiple items
 */
const queueArbitrary = (minLength: number, maxLength: number) =>
  fc.array(queueItemArbitrary, { minLength, maxLength });

// ============================================
// Property Tests - Property 4: Queue FIFO Processing Order
// ============================================

describe('Property 4: Queue FIFO Processing Order', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 4: Queue FIFO Processing Order
   * 
   * *For any* sequence of files added to the queue, the processing order 
   * SHALL match the insertion order (first-in-first-out).
   * 
   * Validates: Queue FIFO requirements
   */

  it('should return items in FIFO order when getting next pending item', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(2, 10),
        (filePaths) => {
          // Create queue items from file paths
          const queueItems = createQueueItems(filePaths);
          
          // All items should be pending initially
          expect(queueItems.every(item => item.status === 'pending')).toBe(true);
          
          // Get next pending item - should be the first one
          const nextItem = getNextPendingItem(queueItems);
          
          if (queueItems.length > 0) {
            expect(nextItem).not.toBeNull();
            expect(nextItem!.filePath).toBe(queueItems[0].filePath);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should skip non-pending items and return next pending in FIFO order', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(3, 10),
        fc.integer({ min: 0, max: 2 }),
        (filePaths, skipCount) => {
          // Create queue items
          let queueItems = createQueueItems(filePaths);
          
          // Mark first N items as completed
          const actualSkipCount = Math.min(skipCount, queueItems.length - 1);
          for (let i = 0; i < actualSkipCount; i++) {
            queueItems = updateQueueItemStatus(queueItems, queueItems[i].id, 'completed');
          }
          
          // Get next pending item
          const nextItem = getNextPendingItem(queueItems);
          
          if (actualSkipCount < queueItems.length) {
            expect(nextItem).not.toBeNull();
            // Should be the first pending item (at index actualSkipCount)
            expect(nextItem!.filePath).toBe(queueItems[actualSkipCount].filePath);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain insertion order in queue items', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(1, 20),
        (filePaths) => {
          const queueItems = createQueueItems(filePaths);
          
          // Verify order matches input order
          for (let i = 0; i < filePaths.length; i++) {
            expect(queueItems[i].filePath).toBe(filePaths[i]);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null when no pending items exist', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(1, 5),
        fc.constantFrom<QueueItemStatus>('completed', 'error', 'processing'),
        (filePaths, status) => {
          let queueItems = createQueueItems(filePaths);
          
          // Mark all items as non-pending
          for (const item of queueItems) {
            queueItems = updateQueueItemStatus(queueItems, item.id, status);
          }
          
          const nextItem = getNextPendingItem(queueItems);
          expect(nextItem).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property Tests - Property 5: Queue Reorder Consistency
// ============================================

describe('Property 5: Queue Reorder Consistency', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 5: Queue Reorder Consistency
   * 
   * *For any* queue with n items and valid indices (from, to) where 0 ≤ from, to < n,
   * reordering SHALL move the item at 'from' to position 'to' while preserving
   * relative order of other items.
   * 
   * Validates: Queue reorder requirements
   */

  it('should move item from source to destination index', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(2, 10),
        (filePaths) => {
          const queueItems = createQueueItems(filePaths);
          const n = queueItems.length;
          
          // Generate valid indices
          const fromIndex = Math.floor(Math.random() * n);
          const toIndex = Math.floor(Math.random() * n);
          
          if (fromIndex === toIndex) return true;
          
          const movedItem = queueItems[fromIndex];
          const reordered = reorderQueueItems(queueItems, fromIndex, toIndex);
          
          // The moved item should be at the new position
          expect(reordered[toIndex].id).toBe(movedItem.id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all items after reorder (no items lost or duplicated)', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(2, 10),
        fc.nat(),
        fc.nat(),
        (filePaths, fromSeed, toSeed) => {
          const queueItems = createQueueItems(filePaths);
          const n = queueItems.length;
          
          const fromIndex = fromSeed % n;
          const toIndex = toSeed % n;
          
          const reordered = reorderQueueItems(queueItems, fromIndex, toIndex);
          
          // Same length
          expect(reordered.length).toBe(queueItems.length);
          
          // All original IDs should be present
          const originalIds = new Set(queueItems.map(item => item.id));
          const reorderedIds = new Set(reordered.map(item => item.id));
          
          expect(originalIds.size).toBe(reorderedIds.size);
          for (const id of originalIds) {
            expect(reorderedIds.has(id)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve relative order of non-moved items', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(3, 10),
        fc.nat(),
        fc.nat(),
        (filePaths, fromSeed, toSeed) => {
          const queueItems = createQueueItems(filePaths);
          const n = queueItems.length;
          
          const fromIndex = fromSeed % n;
          const toIndex = toSeed % n;
          
          if (fromIndex === toIndex) return true;
          
          const movedItemId = queueItems[fromIndex].id;
          const reordered = reorderQueueItems(queueItems, fromIndex, toIndex);
          
          // Get items excluding the moved one, in their original order
          const originalOthers = queueItems.filter(item => item.id !== movedItemId);
          const reorderedOthers = reordered.filter(item => item.id !== movedItemId);
          
          // Relative order should be preserved
          expect(originalOthers.length).toBe(reorderedOthers.length);
          for (let i = 0; i < originalOthers.length; i++) {
            expect(reorderedOthers[i].id).toBe(originalOthers[i].id);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return unchanged queue for invalid indices', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(1, 5),
        (filePaths) => {
          const queueItems = createQueueItems(filePaths);
          const n = queueItems.length;
          
          // Test with out-of-bounds indices
          const invalidFromIndex = n + 1;
          const invalidToIndex = -1;
          
          const result1 = reorderQueueItems(queueItems, invalidFromIndex, 0);
          const result2 = reorderQueueItems(queueItems, 0, invalidToIndex);
          
          // Should return original queue unchanged
          expect(result1).toEqual(queueItems);
          expect(result2).toEqual(queueItems);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return unchanged queue when from equals to', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(1, 10),
        fc.nat(),
        (filePaths, indexSeed) => {
          const queueItems = createQueueItems(filePaths);
          const index = indexSeed % queueItems.length;
          
          const reordered = reorderQueueItems(queueItems, index, index);
          
          // Should be identical
          expect(reordered).toEqual(queueItems);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Additional Queue Property Tests
// ============================================

describe('Queue Utility Functions', () => {
  it('createQueueItem should generate unique IDs', () => {
    fc.assert(
      fc.property(
        filePathArbitrary,
        fc.integer({ min: 2, max: 10 }),
        (filePath, count) => {
          const items = Array.from({ length: count }, () => createQueueItem(filePath));
          const ids = items.map(item => item.id);
          const uniqueIds = new Set(ids);
          
          // All IDs should be unique
          expect(uniqueIds.size).toBe(count);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removeQueueItem should remove only the specified item', () => {
    fc.assert(
      fc.property(
        filePathsArbitrary(2, 10),
        fc.nat(),
        (filePaths, indexSeed) => {
          const queueItems = createQueueItems(filePaths);
          const indexToRemove = indexSeed % queueItems.length;
          const itemToRemove = queueItems[indexToRemove];
          
          const result = removeQueueItem(queueItems, itemToRemove.id);
          
          // Length should decrease by 1
          expect(result.length).toBe(queueItems.length - 1);
          
          // Removed item should not be present
          expect(result.find(item => item.id === itemToRemove.id)).toBeUndefined();
          
          // All other items should be present
          const otherItems = queueItems.filter(item => item.id !== itemToRemove.id);
          for (const item of otherItems) {
            expect(result.find(r => r.id === item.id)).toBeDefined();
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getQueueStats should correctly count items by status', () => {
    fc.assert(
      fc.property(
        queueArbitrary(0, 20),
        (queueItems) => {
          const stats = getQueueStats(queueItems);
          
          const expectedPending = queueItems.filter(item => item.status === 'pending').length;
          const expectedProcessing = queueItems.filter(item => item.status === 'processing').length;
          const expectedCompleted = queueItems.filter(item => item.status === 'completed').length;
          const expectedError = queueItems.filter(item => item.status === 'error').length;
          
          expect(stats.pending).toBe(expectedPending);
          expect(stats.processing).toBe(expectedProcessing);
          expect(stats.completed).toBe(expectedCompleted);
          expect(stats.error).toBe(expectedError);
          expect(stats.total).toBe(queueItems.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hasActiveItems should return true iff pending or processing items exist', () => {
    fc.assert(
      fc.property(
        queueArbitrary(0, 10),
        (queueItems) => {
          const hasActive = hasActiveItems(queueItems);
          const expectedHasActive = queueItems.some(
            item => item.status === 'pending' || item.status === 'processing'
          );
          
          expect(hasActive).toBe(expectedHasActive);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
