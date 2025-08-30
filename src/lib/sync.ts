import { supabase } from '@/integrations/supabase/client';
import { getPendingActions, removeAction, type QueueItem, type ActionType } from './queue';
import { updateJobCache } from './jobsRepo';

/**
 * Sync engine for ServicePro offline actions
 * Processes queued actions when online, with robust error handling
 */

export interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Runs the sync engine to process all pending offline actions
 * @returns Promise resolving to sync results
 */
export async function runSync(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processedCount: 0,
    failedCount: 0,
    errors: []
  };

  try {
    console.log('Starting sync process...');
    const pendingActions = await getPendingActions();

    if (pendingActions.length === 0) {
      console.log('No pending actions to sync');
      return result;
    }

    console.log(`Processing ${pendingActions.length} pending actions`);

    for (const action of pendingActions) {
      try {
        await processAction(action);
        await removeAction(action.id);
        result.processedCount++;
        console.log(`Successfully processed action: ${action.id}`);
      } catch (error) {
        result.failedCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Action ${action.id} (${action.type}): ${errorMsg}`);
        console.error(`Failed to process action ${action.id}:`, error);

        // Stop processing on first failure to maintain order
        result.success = false;
        break;
      }
    }

    console.log(`Sync completed: ${result.processedCount} processed, ${result.failedCount} failed`);

    // Dispatch general sync completion event
    window.dispatchEvent(new CustomEvent('syncCompleted', {
      detail: { result }
    }));

    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Sync failed: ${errorMsg}`);
    result.success = false;
    console.error('Sync process failed:', error);
    return result;
  }
}

/**
 * Processes a single queued action
 * @param action - The action to process
 */
async function processAction(action: QueueItem): Promise<void> {
  switch (action.type) {
    case 'NOTE':
      await processNoteAction(action);
      break;
    case 'PHOTO':
      await processPhotoAction(action);
      break;
    case 'CHECK':
      await processCheckAction(action);
      break;
    case 'QUOTE_CREATE':
      await processQuoteCreateAction(action);
      break;
    case 'QUOTE_UPDATE':
      await processQuoteUpdateAction(action);
      break;
    case 'QUOTE_APPROVE':
      await processQuoteApproveAction(action);
      break;
    case 'QUOTE_DECLINE':
      await processQuoteDeclineAction(action);
      break;
    case 'QUOTE_SEND':
      await processQuoteSendAction(action);
      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Processes a note action
 * @param action - The note action to process
 */
async function processNoteAction(action: QueueItem): Promise<void> {
  const payload = action.payload as any;

  if (!payload.jobId || !payload.text) {
    throw new Error('Invalid note payload: missing jobId or text');
  }

  const { data, error } = await supabase
    .from('job_notes')
    .insert({
      job_id: payload.jobId,
      text: payload.text,
      created_at: payload.createdAt || new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Update local cache if job detail is cached
  await updateJobCacheWithNote(payload.jobId, data);
}

/**
 * Processes a photo action
 * @param action - The photo action to process
 */
async function processPhotoAction(action: QueueItem): Promise<void> {
  const payload = action.payload as any;

  if (!payload.jobId || !payload.file || !payload.fileName) {
    throw new Error('Invalid photo payload: missing jobId, file, or fileName');
  }

  // Upload file to Supabase Storage
  const filePath = `job-photos/${payload.jobId}/${Date.now()}-${payload.fileName}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(filePath, payload.file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('job-photos')
    .getPublicUrl(filePath);

  if (!urlData.publicUrl) {
    throw new Error('Failed to get public URL for uploaded photo');
  }

  // Save photo reference to database
  const validPhotoTypes = ['before', 'during', 'after'];
  const photoType = payload.photo_type && validPhotoTypes.includes(payload.photo_type)
    ? payload.photo_type
    : 'during'; // Default to 'during' if invalid or missing

  const { data, error } = await supabase
    .from('job_photos')
    .insert({
      job_id: payload.jobId,
      path: urlData.publicUrl,
      photo_type: photoType, // Ensure valid photo_type
      description: payload.description || 'Job photo', // Use queued description
      storage_path: filePath, // Save storage path for signed URL generation
      created_at: payload.createdAt || new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Update local cache if job detail is cached
  await updateJobCacheWithPhoto(payload.jobId, data);
}

/**
 * Processes a check-in/check-out action
 * @param action - The check action to process
 */
async function processCheckAction(action: QueueItem): Promise<void> {
  const payload = action.payload as any;

  if (!payload.jobId || !payload.event || !payload.timestamp) {
    throw new Error('Invalid check payload: missing jobId, event, or timestamp');
  }

  // First, get or create a visit record for this job
  let { data: visit, error: visitError } = await supabase
    .from('job_visits')
    .select('id')
    .eq('job_id', payload.jobId)
    .single();

  if (visitError && visitError.code !== 'PGRST116') { // Not found error
    throw visitError;
  }

  if (!visit) {
    // Get current user for technician_id
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unable to get current user for job visit creation');
    }

    // Create a new visit record
    const { data: newVisit, error: newVisitError } = await supabase
      .from('job_visits')
      .insert({
        job_id: payload.jobId,
        technician_id: user.id,
        started_at: payload.event === 'check_in' ? payload.timestamp : null,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (newVisitError) throw newVisitError;
    visit = newVisit;
  }

  // Insert timesheet entry
  const { data, error } = await supabase
    .from('timesheets')
    .insert({
      job_visit_id: visit.id,
      event: payload.event,
      ts: payload.timestamp,
      lat: payload.latitude,
      lng: payload.longitude
    })
    .select()
    .single();

  if (error) throw error;

  // Update local cache if job detail is cached
  await updateJobCacheWithTimesheet(payload.jobId, data);
}

/**
 * Updates local job cache with new note
 * @param jobId - Job ID
 * @param note - Note data
 */
async function updateJobCacheWithNote(jobId: string, note: any): Promise<void> {
  try {
    // Dispatch custom event to refresh notes in UI
    window.dispatchEvent(new CustomEvent('noteSynced', {
      detail: { jobId, note }
    }));
    console.log(`Note added to job ${jobId}:`, note);
  } catch (error) {
    console.warn('Failed to update cache with note:', error);
  }
}

/**
 * Updates local job cache with new photo
 * @param jobId - Job ID
 * @param photo - Photo data
 */
async function updateJobCacheWithPhoto(jobId: string, photo: any): Promise<void> {
  try {
    // Dispatch custom event to refresh photos in UI
    window.dispatchEvent(new CustomEvent('photoSynced', {
      detail: { jobId, photo }
    }));
    console.log(`Photo added to job ${jobId}:`, photo);
  } catch (error) {
    console.warn('Failed to update cache with photo:', error);
  }
}

/**
 * Updates local job cache with new timesheet entry
 * @param jobId - Job ID
 * @param timesheet - Timesheet data
 */
async function updateJobCacheWithTimesheet(jobId: string, timesheet: any): Promise<void> {
  try {
    // This would update the job detail cache with the new timesheet entry
    // Implementation depends on how job details are cached
    console.log(`Timesheet entry added to job ${jobId}:`, timesheet);
  } catch (error) {
    console.warn('Failed to update cache with timesheet:', error);
  }
}

/**
 * Processes a quote creation action
 * @param action - The quote creation action to process
 */
async function processQuoteCreateAction(action: QueueItem): Promise<void> {
  const { data: offlineQuote, originalRequest } = action.payload;

  if (!originalRequest) {
    throw new Error('Invalid quote create payload: missing original request');
  }

  // Create the quote using the original request data
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      customer_id: originalRequest.customer_id,
      template_id: originalRequest.template_id,
      title: originalRequest.title,
      description: originalRequest.description,
      valid_until: originalRequest.valid_until,
      terms_and_conditions: originalRequest.terms_and_conditions,
      notes: originalRequest.notes,
      tax_rate: originalRequest.tax_rate,
      discount_amount: originalRequest.discount_amount,
      created_by: offlineQuote.created_by
    })
    .select()
    .single();

  if (quoteError) throw quoteError;

  // Create quote items if any
  if (originalRequest.items && originalRequest.items.length > 0) {
    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(
        originalRequest.items.map((item: any, index: number) => ({
          quote_id: quote.id,
          item_type: item.item_type,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          inventory_item_id: item.inventory_item_id,
          sort_order: index + 1
        }))
      );

    if (itemsError) throw itemsError;
  }

  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('quoteSynced', {
    detail: { type: 'create', quote, offlineId: offlineQuote.id }
  }));

  console.log(`Quote created from offline action: ${quote.id}`);
}

/**
 * Processes a quote update action
 * @param action - The quote update action to process
 */
async function processQuoteUpdateAction(action: QueueItem): Promise<void> {
  const { data: updates, originalRequest } = action.payload;

  if (!updates.id) {
    throw new Error('Invalid quote update payload: missing quote ID');
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      title: updates.title,
      description: updates.description,
      valid_until: updates.valid_until,
      terms_and_conditions: updates.terms_and_conditions,
      notes: updates.notes,
      tax_rate: updates.tax_rate,
      discount_amount: updates.discount_amount,
      status: updates.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', updates.id);

  if (error) throw error;

  // Update items if provided
  if (originalRequest?.items) {
    // Delete existing items
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', updates.id);

    // Insert new items
    if (originalRequest.items.length > 0) {
      await supabase
        .from('quote_items')
        .insert(
          originalRequest.items.map((item: any, index: number) => ({
            quote_id: updates.id,
            item_type: item.item_type,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            inventory_item_id: item.inventory_item_id,
            sort_order: index + 1
          }))
        );
    }
  }

  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('quoteSynced', {
    detail: { type: 'update', quoteId: updates.id }
  }));

  console.log(`Quote updated from offline action: ${updates.id}`);
}

/**
 * Processes a quote approval action
 * @param action - The quote approval action to process
 */
async function processQuoteApproveAction(action: QueueItem): Promise<void> {
  const { quote_id, signature_data, device_info } = action.payload;

  if (!quote_id || !signature_data) {
    throw new Error('Invalid quote approval payload: missing quote_id or signature_data');
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      customer_signature: {
        signature_data,
        timestamp: new Date().toISOString(),
        device_info
      }
    })
    .eq('id', quote_id);

  if (error) throw error;

  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('quoteSynced', {
    detail: { type: 'approve', quoteId: quote_id }
  }));

  console.log(`Quote approved from offline action: ${quote_id}`);
}

/**
 * Processes a quote decline action
 * @param action - The quote decline action to process
 */
async function processQuoteDeclineAction(action: QueueItem): Promise<void> {
  const { quote_id, reason } = action.payload;

  if (!quote_id) {
    throw new Error('Invalid quote decline payload: missing quote_id');
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
      declined_reason: reason
    })
    .eq('id', quote_id);

  if (error) throw error;

  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('quoteSynced', {
    detail: { type: 'decline', quoteId: quote_id }
  }));

  console.log(`Quote declined from offline action: ${quote_id}`);
}

/**
 * Processes a quote send action
 * @param action - The quote send action to process
 */
async function processQuoteSendAction(action: QueueItem): Promise<void> {
  const { quote_id } = action.payload;

  if (!quote_id) {
    throw new Error('Invalid quote send payload: missing quote_id');
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', quote_id);

  if (error) throw error;

  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('quoteSynced', {
    detail: { type: 'send', quoteId: quote_id }
  }));

  console.log(`Quote sent from offline action: ${quote_id}`);
}