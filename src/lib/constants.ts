/**
 * Constants for ServicePro offline functionality
 * Strings are i18n-ready for future AR/EN support
 */

export const OFFLINE_MESSAGES = {
  // Banner messages
  OFFLINE_BANNER: "You're offline — changes will sync automatically.",

  // Status messages
  ONLINE_STATUS: 'Online',
  OFFLINE_STATUS: 'Offline',

  // Action messages
  SYNC_SUCCESS: 'Sync Complete',
  SYNC_SUCCESS_DESCRIPTION: (count: number) => `Synced ${count} items successfully`,
  SYNC_FAILED: 'Sync Failed',
  SYNC_ERROR: 'Sync Error',
  SYNC_ERROR_DESCRIPTION: 'Failed to sync data',

  // Queue messages
  ACTION_QUEUED: 'Queued',
  ACTION_QUEUED_DESCRIPTION: (action: string) => `${action} will sync when online`,
  ACTION_FAILED: 'Failed to queue action',

  // Job status messages
  JOB_STARTED: 'Job started successfully',
  JOB_UPDATED: (status: string) => `Job ${status.replace('_', ' ')} successfully`,
  JOB_UPDATE_FAILED: 'Failed to update job status',

  // Photo messages
  PHOTO_UPLOADED: 'Photo uploaded successfully',
  PHOTO_UPLOAD_FAILED: 'Failed to upload photo',

  // Note messages
  NOTE_ADDED: 'Note added successfully',
  NOTE_ADD_FAILED: 'Failed to add note',

  // Sync button
  SYNC_BUTTON: 'Sync',
  SYNCING_BUTTON: 'Syncing...',

  // Pending badges
  PENDING_BADGE: (count: number) => `${count} pending`,
  OFFLINE_BUTTON_TITLE: 'Offline - changes will sync when online',

  // Cache messages
  CACHE_LOADED: 'Loaded jobs from cache',
  CACHE_ERROR: "You're offline - showing cached data",

} as const;

/**
 * Action types for queue system
 */
export const ACTION_TYPES = {
  NOTE: 'NOTE',
  PHOTO: 'PHOTO',
  CHECK: 'CHECK',
} as const;

/**
 * Check events for timesheets
 */
export const CHECK_EVENTS = {
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out',
} as const;

/**
 * Photo types
 */
export const PHOTO_TYPES = {
  BEFORE: 'before',
  DURING: 'during',
  AFTER: 'after',
} as const;