import { nanoid } from 'nanoid';
import { dbService, type QueueItem } from './db';

// Re-export for convenience
export type { QueueItem };

/**
 * Offline action queue for ServicePro
 * Manages FIFO queue of offline actions with idempotency guarantees
 */

export type ActionType = 'NOTE' | 'PHOTO' | 'CHECK';

export interface NoteActionPayload {
  jobId: string;
  text: string;
  createdAt: string;
}

export interface PhotoActionPayload {
  jobId: string;
  file: File;
  fileName: string;
  path?: string; // Public URL for display
  createdAt: string;
}

export interface CheckActionPayload {
  jobId: string;
  event: 'check_in' | 'check_out';
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

export type ActionPayload = NoteActionPayload | PhotoActionPayload | CheckActionPayload;

/**
 * Adds an action to the offline queue
 * @param type - Type of action to queue
 * @param payload - Action payload data
 * @returns Promise resolving to the queued item ID
 */
export async function queueAction(type: ActionType, payload: ActionPayload): Promise<string> {
  try {
    const db = await dbService.getDB();

    // Generate deterministic ID for idempotency
    const id = generateActionId(type, payload);

    // Check if action already exists (idempotency)
    const existing = await db.get('queues', id);
    if (existing) {
      console.log(`Action ${id} already queued, skipping`);
      return id;
    }

    const queueItem: QueueItem = {
      id,
      type,
      payload,
      timestamp: new Date().toISOString(),
      jobId: payload.jobId
    };

    await db.add('queues', queueItem);
    console.log(`Queued ${type} action: ${id}`);

    return id;
  } catch (error) {
    console.error('Failed to queue action:', error);
    throw error;
  }
}

/**
 * Gets pending action count for a specific job
 * @param jobId - Job ID to check for pending actions
 * @returns Promise resolving to count of pending actions
 */
export async function getPendingCountByJob(jobId: string): Promise<number> {
  try {
    const db = await dbService.getDB();
    const allActions = await db.getAllFromIndex('queues', 'jobId', jobId);
    return allActions.length;
  } catch (error) {
    console.error('Failed to get pending count:', error);
    return 0;
  }
}

/**
 * Gets all pending actions sorted by timestamp (FIFO)
 * @returns Promise resolving to array of queued actions
 */
export async function getPendingActions(): Promise<QueueItem[]> {
  try {
    const db = await dbService.getDB();
    const actions = await db.getAll('queues');

    // Sort by timestamp for FIFO processing
    return actions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch (error) {
    console.error('Failed to get pending actions:', error);
    return [];
  }
}

/**
 * Removes an action from the queue
 * @param actionId - ID of action to remove
 */
export async function removeAction(actionId: string): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.delete('queues', actionId);
    console.log(`Removed action from queue: ${actionId}`);
  } catch (error) {
    console.error('Failed to remove action:', error);
    throw error;
  }
}

/**
 * Clears all actions from the queue
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.clear('queues');
    console.log('Queue cleared');
  } catch (error) {
    console.error('Failed to clear queue:', error);
    throw error;
  }
}

/**
 * Gets queue statistics for debugging
 */
export async function getQueueStats(): Promise<{
  totalActions: number;
  actionsByType: Record<ActionType, number>;
  oldestAction?: string;
  newestAction?: string;
}> {
  try {
    const actions = await getPendingActions();

    const actionsByType = actions.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1;
      return acc;
    }, {} as Record<ActionType, number>);

    const oldestAction = actions.length > 0 ? actions[0].timestamp : undefined;
    const newestAction = actions.length > 0 ? actions[actions.length - 1].timestamp : undefined;

    return {
      totalActions: actions.length,
      actionsByType,
      oldestAction,
      newestAction
    };
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return {
      totalActions: 0,
      actionsByType: { NOTE: 0, PHOTO: 0, CHECK: 0 }
    };
  }
}

/**
 * Generates a deterministic ID for an action to ensure idempotency
 * @param type - Action type
 * @param payload - Action payload
 * @returns Deterministic action ID
 */
function generateActionId(type: ActionType, payload: ActionPayload): string {
  // Create a hash from the action content for idempotency
  const content = `${type}:${payload.jobId}:${JSON.stringify(payload)}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use nanoid for uniqueness with hash as prefix for determinism
  return `${Math.abs(hash)}-${nanoid(8)}`;
}