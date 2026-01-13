/**
 * Queue Management Utilities
 * Provides FIFO queue operations and reordering functionality
 * Requirements: Queue FIFO Processing Order, Queue Reorder Consistency
 */

import type { QueueItem, QueueItemStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new queue item from a file path
 */
export function createQueueItem(filePath: string): QueueItem {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  return {
    id: uuidv4(),
    filePath,
    fileName,
    status: 'pending' as QueueItemStatus,
    progress: 0,
    addedAt: new Date().toISOString(),
  };
}

/**
 * Creates multiple queue items from file paths
 * Items are added in the order they are provided (FIFO)
 */
export function createQueueItems(filePaths: string[]): QueueItem[] {
  return filePaths.map(createQueueItem);
}

/**
 * Gets the next pending item from the queue (FIFO order)
 * Property 4: Queue FIFO Processing Order
 * For any sequence of files added to the queue, the processing order
 * SHALL match the insertion order (first-in-first-out).
 */
export function getNextPendingItem(queue: QueueItem[]): QueueItem | null {
  return queue.find(item => item.status === 'pending') || null;
}

/**
 * Reorders queue items by moving an item from one index to another
 * Property 5: Queue Reorder Consistency
 * For any queue with n items and valid indices (from, to) where 0 ≤ from, to < n,
 * reordering SHALL move the item at 'from' to position 'to' while preserving
 * relative order of other items.
 */
export function reorderQueueItems(
  queue: QueueItem[],
  fromIndex: number,
  toIndex: number
): QueueItem[] {
  // Validate indices
  if (fromIndex < 0 || fromIndex >= queue.length) {
    return queue;
  }
  if (toIndex < 0 || toIndex >= queue.length) {
    return queue;
  }
  if (fromIndex === toIndex) {
    return queue;
  }

  const newQueue = [...queue];
  const [removed] = newQueue.splice(fromIndex, 1);
  if (removed) {
    newQueue.splice(toIndex, 0, removed);
  }
  return newQueue;
}

/**
 * Updates a queue item's status
 */
export function updateQueueItemStatus(
  queue: QueueItem[],
  id: string,
  status: QueueItemStatus,
  progress?: number
): QueueItem[] {
  return queue.map(item =>
    item.id === id
      ? { ...item, status, progress: progress ?? item.progress }
      : item
  );
}

/**
 * Removes a queue item by ID
 */
export function removeQueueItem(queue: QueueItem[], id: string): QueueItem[] {
  return queue.filter(item => item.id !== id);
}

/**
 * Gets the count of items by status
 */
export function getQueueStats(queue: QueueItem[]): {
  pending: number;
  processing: number;
  completed: number;
  error: number;
  total: number;
} {
  return {
    pending: queue.filter(item => item.status === 'pending').length,
    processing: queue.filter(item => item.status === 'processing').length,
    completed: queue.filter(item => item.status === 'completed').length,
    error: queue.filter(item => item.status === 'error').length,
    total: queue.length,
  };
}

/**
 * Checks if the queue has any pending or processing items
 */
export function hasActiveItems(queue: QueueItem[]): boolean {
  return queue.some(item => item.status === 'pending' || item.status === 'processing');
}

/**
 * Gets all items in processing order (FIFO based on addedAt)
 */
export function getItemsInProcessingOrder(queue: QueueItem[]): QueueItem[] {
  return [...queue].sort((a, b) => 
    new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
  );
}
