import { supabase } from '@/integrations/supabase/client';
import { dbService } from './db';
import { queueAction } from './queue';

/**
 * Offline-first checklists repository
 * Implements network-first strategy with local caching
 */

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  photoRequired?: boolean;
  noteRequired?: boolean;
  completed?: boolean;
  completed_at?: string;
  note?: string;
  photos?: Array<{
    path: string;
    created_at: string;
    created_by: string;
  }>;
}

export interface JobChecklist {
  id: string;
  job_id: string;
  template_id?: string;
  template_name?: string;
  items: ChecklistItem[];
  completed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch checklists for a specific job with offline-first strategy
 */
export async function fetchJobChecklist(jobId: string): Promise<{ checklist: JobChecklist | null; fromCache: boolean }> {
  try {
    // Try network first
    const { data: checklist, error } = await supabase
      .from('job_checklists')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error) throw error;

    if (checklist) {
      // Cache successful network response
      const db = await dbService.getDB();
      await db.put('jobChecklists', checklist);
    }

    return {
      checklist,
      fromCache: false
    };
  } catch (error) {
    console.warn('Network request failed for job checklist, falling back to cache:', error);

    // Fallback to cache
    try {
      const db = await dbService.getDB();
      const cachedChecklist = await db.get('jobChecklists', jobId);

      return {
        checklist: cachedChecklist || null,
        fromCache: true
      };
    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
      return {
        checklist: null,
        fromCache: true
      };
    }
  }
}

/**
 * Create or update a checklist for a job
 */
export async function saveJobChecklist(checklist: Partial<JobChecklist>): Promise<JobChecklist> {
  try {
    const checklistData = {
      ...checklist,
      updated_at: new Date().toISOString()
    };

    // Try network first
    const { data, error } = await supabase
      .from('job_checklists')
      .upsert(checklistData, { onConflict: 'job_id' })
      .select()
      .single();

    if (error) throw error;

    // Cache the updated checklist
    const db = await dbService.getDB();
    await db.put('jobChecklists', data);

    return data;
  } catch (error) {
    console.warn('Network request failed for saving checklist, will retry when online:', error);

    // Update in cache only for offline mode
    const db = await dbService.getDB();
    const cachedChecklist = {
      ...checklist,
      id: checklist.id || `temp-${Date.now()}`,
      updated_at: new Date().toISOString()
    } as JobChecklist;

    await db.put('jobChecklists', cachedChecklist);
    return cachedChecklist;
  }
}

/**
 * Update checklist item completion status
 */
export async function updateChecklistItem(
  checklistId: string,
  itemId: string,
  completed: boolean
): Promise<{ success: boolean; checklist?: JobChecklist }> {
  try {
    // Fetch current checklist
    const { checklist } = await fetchJobChecklistById(checklistId);
    if (!checklist) return { success: false };

    // Update item
    const updatedItems = checklist.items.map(item =>
      item.id === itemId
        ? {
            ...item,
            completed,
            completed_at: completed ? new Date().toISOString() : undefined
          }
        : item
    );

    // Update completion counts
    const completedCount = updatedItems.filter(item => item.completed).length;
    const totalCount = updatedItems.length;

    // Save updated checklist
    const updatedChecklist = await saveJobChecklist({
      ...checklist,
      items: updatedItems,
      completed_count: completedCount,
      total_count: totalCount
    });

    return { success: true, checklist: updatedChecklist };
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return { success: false };
  }
}

/**
 * Fetch checklist by ID
 */
export async function fetchJobChecklistById(checklistId: string): Promise<{ checklist: JobChecklist | null; fromCache: boolean }> {
  try {
    // Try network first
    const { data: checklist, error } = await supabase
      .from('job_checklists')
      .select('*')
      .eq('id', checklistId)
      .single();

    if (error) throw error;

    if (checklist) {
      const db = await dbService.getDB();
      await db.put('jobChecklists', checklist);
    }

    return {
      checklist,
      fromCache: false
    };
  } catch (error) {
    // Fallback to cache
    try {
      const db = await dbService.getDB();
      const cachedChecklist = await db.get('jobChecklists', checklistId);
      return {
        checklist: cachedChecklist || null,
        fromCache: true
      };
    } catch (cacheError) {
      return { checklist: null, fromCache: true };
    }
  }
}

/**
 * Validates and sanitizes checklist template data
 */
function sanitizeChecklistTemplate(template: any): any | null {
  if (!template || typeof template !== 'object') {
    console.warn('Invalid template object:', template);
    return null;
  }

  // Ensure items is a valid array
  let items = [];
  if (template.items && typeof template.items === 'string') {
    try {
      items = JSON.parse(template.items);
    } catch (parseError) {
      console.error('Failed to parse template items JSON:', parseError, 'for template:', template.id);
      items = [];
    }
  } else if (Array.isArray(template.items)) {
    items = template.items;
  }

  // Validate each item in the array
  const validItems = items.filter((item: any) => {
    return item &&
           typeof item === 'object' &&
           typeof item.id === 'string' &&
           typeof item.text === 'string' &&
           typeof item.required === 'boolean';
  });

  return {
    ...template,
    items: validItems
  };
}

/**
 * Get all active checklist templates
 */
export async function fetchChecklistTemplates(): Promise<{ templates: any[]; fromCache: boolean }> {
  try {
    console.log('📋 Fetching checklist templates...');

    const { data: rawTemplates, error } = await supabase
      .from('job_checklist_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    console.log('📊 Raw templates fetched:', rawTemplates?.length || 0);
    console.log('📋 Raw template data:', rawTemplates);

    if (error) {
      console.error('❌ Error fetching templates:', error);
      throw error;
    }

    // Sanitize and validate template data
    const sanitizedTemplates = (rawTemplates || [])
      .map(sanitizeChecklistTemplate)
      .filter(Boolean)
      .map(template => ({
        ...template,
        items_count: template.items?.length || 0,
        required_count: template.items?.filter((item: any) => item.required)?.length || 0
      }));

    console.log('✅ Sanitized templates:', sanitizedTemplates.length);
    console.log('📋 Sanitized template data:', sanitizedTemplates);

    // Cache cleaned templates
    const db = await dbService.getDB();
    for (const template of sanitizedTemplates) {
      await db.put('checklistTemplates', template);
    }

    return {
      templates: sanitizedTemplates,
      fromCache: false
    };
  } catch (error) {
    console.warn('Network request failed for templates, falling back to cache:', error);

    // Fallback to cache with sanitization
    try {
      const db = await dbService.getDB();
      const cachedTemplates = await db.getAll('checklistTemplates');

      if (cachedTemplates.length > 0) {
        // Re-sanitize cached data in case of corruption
        const sanitizedCachedTemplates = cachedTemplates
          .map(sanitizeChecklistTemplate)
          .filter(Boolean);

        console.log('📊 Fallback cache templates:', sanitizedCachedTemplates.length);
        return {
          templates: sanitizedCachedTemplates,
          fromCache: true
        };
      } else {
        console.log('📊 No cache data available');
        return { templates: [], fromCache: true };
      }
    } catch (cacheError) {
      console.error('❌ Cache fallback also failed:', cacheError);
      return { templates: [], fromCache: true };
    }
  }
}

/**
 * Safe item mapper that handles potential data corruption
 */
function createChecklistItemsFromTemplate(items: any[]): ChecklistItem[] {
  if (!Array.isArray(items)) {
    console.warn('Template items is not an array:', items);
    return [];
  }

  return items
    .filter((item: any) => item && typeof item === 'object' && item.id && item.text)
    .map((item: any) => ({
      id: item.id,
      text: item.text,
      required: Boolean(item.required),
      photoRequired: Boolean(item.photoRequired),
      noteRequired: Boolean(item.noteRequired),
      completed: false,
      completed_at: undefined,
      note: '',
      photos: []
    }));
}

/**
 * Create checklist from template
 */
export async function createChecklistFromTemplate(jobId: string, templateId: string): Promise<JobChecklist | null> {
  try {
    // Fetch template
    const { data: rawTemplate, error: templateError } = await supabase
      .from('job_checklist_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !rawTemplate) throw templateError;

    // Sanitize template data
    const template = sanitizeChecklistTemplate(rawTemplate);
    if (!template) {
      console.error('Invalid template data for template:', templateId);
      throw new Error('Invalid template data');
    }

    console.log('📋 Creating checklist from template:', { name: template.name, itemsCount: template.items?.length || 0 });

    // Create checklist items with validation
    const checklistItems = createChecklistItemsFromTemplate(template.items || []);

    // Create checklist from validated template
    const checklistData: Partial<JobChecklist> = {
      job_id: jobId,
      template_id: templateId,
      template_name: template.name || 'Unknown Template',
      items: checklistItems,
      completed_count: 0,
      total_count: checklistItems.length
    };

    console.log('✅ Checklist data prepared:', {
      jobId,
      templateId,
      templateName: checklistData.template_name,
      itemsCount: checklistItems.length
    });

    return await saveJobChecklist(checklistData);
  } catch (error) {
    console.error('Error creating checklist from template:', error);

    // For offline mode, create a temporary checklist in cache
    try {
      const db = await dbService.getDB();
      const tempChecklist: JobChecklist = {
        id: `temp-${Date.now()}`,
        job_id: jobId,
        template_id: templateId,
        template_name: 'Template (Offline)',
        items: [],
        completed_count: 0,
        total_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.put('jobChecklists', tempChecklist);
      console.log('📦 Created temporary offline checklist');
      return tempChecklist;
    } catch (cacheError) {
      console.error('Failed to create offline checklist:', cacheError);
      return null;
    }
  }
}

// Type definitions for template item validation
export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  completed?: boolean;
  completed_at?: string;
}

/**
 * Clear cached checklist data
 */
export async function clearChecklistCache(): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.clear('jobChecklists');
    await db.clear('checklistTemplates');
    console.log('✅ Checklist cache cleared');
  } catch (error) {
    console.error('❌ Failed to clear checklist cache:', error);
  }
}

/**
 * Re-sync templates from network to fix any cached corruption
 */
export async function resyncChecklistTemplates(): Promise<void> {
  console.log('🔄 Resyncing checklist templates...');

  try {
    // Clear cache first
    await clearChecklistCache();

    // Force fresh fetch
    const { templates, fromCache } = await fetchChecklistTemplates();

    if (fromCache) {
      console.warn('⚠️ Still using cache after resync - check network connection');
    } else {
      console.log('✅ Template resync complete:', templates.length, 'templates');
    }
  } catch (error) {
    console.error('❌ Failed to resync templates:', error);
  }
}

/**
 * Add a photo to a checklist item
 */
export async function addPhotoToChecklistItem(
  checklistId: string,
  itemId: string,
  file: File,
  description?: string
): Promise<{ success: boolean; photo?: { path: string; created_at: string; created_by: string } }> {
  try {
    // Upload photo to storage (reuse existing photo upload logic)
    const fileName = `${checklistId}_${itemId}_${Date.now()}.jpg`;
    const storagePath = `checklist-photos/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-photos')
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('job-photos')
      .getPublicUrl(storagePath);

    const photoEntry = {
      path: urlData.publicUrl,
      created_at: new Date().toISOString(),
      created_by: (await supabase.auth.getUser()).data.user?.id || 'unknown'
    };

    if (description) {
      (photoEntry as any).description = description;
    }

    // Update the checklist item
    const result = await updateChecklistItemPhotos(checklistId, itemId, [photoEntry]);

    return { success: true, photo: photoEntry };
  } catch (error) {
    console.error('Error adding photo to checklist item:', error);
    return { success: false };
  }
}

/**
 * Update checklist item note
 */
export async function updateChecklistItemNote(
  checklistId: string,
  itemId: string,
  note: string
): Promise<{ success: boolean }> {
  try {
    const { checklist } = await fetchJobChecklistById(checklistId);
    if (!checklist) return { success: false };

    const updatedItems = checklist.items.map(item =>
      item.id === itemId
        ? { ...item, note }
        : item
    );

    await saveJobChecklist({
      ...checklist,
      items: updatedItems
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating checklist item note:', error);
    return { success: false };
  }
}

/**
 * Update checklist item photos array
 */
export async function updateChecklistItemPhotos(
  checklistId: string,
  itemId: string,
  newPhotos: Array<{ path: string; created_at: string; created_by: string }>
): Promise<{ success: boolean }> {
  try {
    const { checklist } = await fetchJobChecklistById(checklistId);
    if (!checklist) return { success: false };

    const updatedItems = checklist.items.map(item =>
      item.id === itemId
        ? { ...item, photos: [...(item.photos || []), ...newPhotos] }
        : item
    );

    await saveJobChecklist({
      ...checklist,
      items: updatedItems
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating checklist item photos:', error);
    return { success: false };
  }
}

/**
 * Set checklist item as done with requirement enforcement
 */
export async function setChecklistItemDone(
  checklistId: string,
  itemId: string,
  done: boolean
): Promise<{ success: boolean; checklist?: JobChecklist; requirements?: string[] }> {
  try {
    const { checklist } = await fetchJobChecklistById(checklistId);
    if (!checklist) return { success: false };

    const item = checklist.items.find(item => item.id === itemId);
    if (!item) return { success: false };

    const requirements: string[] = [];

    if (done) {
      // Check if all requirements are met
      if (item.noteRequired && !item.note?.trim()) {
        requirements.push('note');
      }
      if (item.photoRequired && (!item.photos || item.photos.length === 0)) {
        requirements.push('photo');
      }

      if (requirements.length > 0) {
        return { success: false, requirements };
      }
    }

    // Update the item
    const updatedItems = checklist.items.map(i =>
      i.id === itemId
        ? {
            ...i,
            completed: done,
            completed_at: done ? new Date().toISOString() : undefined
          }
        : i
    );

    // Update counts
    const completedCount = updatedItems.filter(i => i.completed).length;

    const updatedChecklist = await saveJobChecklist({
      ...checklist,
      items: updatedItems,
      completed_count: completedCount
    });

    return { success: true, checklist: updatedChecklist };
  } catch (error) {
    console.error('Error setting checklist item done:', error);
    return { success: false };
  }
}

/**
 * Diagnostic function to check checklist data integrity
 * Call this from browser console: window.checklistDiagnostics()
 */
export async function runChecklistDiagnostics(): Promise<void> {
  console.group('🔍 Checklist Data Diagnostics');

  try {
    const db = await dbService.getDB();

    // Check templates in IndexedDB
    const cachedTemplates = await db.getAll('checklistTemplates');
    console.log('📋 Cached templates:', cachedTemplates.length);
    cachedTemplates.forEach((template, idx) => {
      console.log(`  ${idx + 1}. ${template.name} (${Array.isArray(template.items) ? template.items.length : '❌ no items'} items)`);
      if (!Array.isArray(template.items)) {
        console.error(`    🚨 Template ${template.id} items is not an array:`, template.items);
      }
    });

    // Check job checklists
    const cachedChecklists = await db.getAll('jobChecklists');
    console.log('📝 Job checklists:', cachedChecklists.length);
    cachedChecklists.forEach((checklist, idx) => {
      console.log(`  ${idx + 1}. Job ${checklist.job_id} (${Array.isArray(checklist.items) ? checklist.items.length : '❌ no items'} items)`);
      if (!Array.isArray(checklist.items)) {
        console.error(`    🚨 Checklist ${checklist.id} items is not an array:`, checklist.items);
      }
    });

    // Check network status
    console.log('🌐 Online status:', navigator.onLine ? '✅' : '❌');

    // Suggest fixes if issues found
    const invalidTemplates = cachedTemplates.filter(t => !Array.isArray(t.items));
    const invalidChecklists = cachedChecklists.filter(c => !Array.isArray(c.items));

    if (invalidTemplates.length > 0 || invalidChecklists.length > 0) {
      console.log('🔧 Suggested fixes:');
      if (invalidTemplates.length > 0) {
        console.log(`  - Run: window.resyncChecklistTemplates() to fix ${invalidTemplates.length} corrupt templates`);
      }
      if (invalidChecklists.length > 0) {
        console.log(`  - ${invalidChecklists.length} job checklists have invalid data`);
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }

  console.groupEnd();
}

// Make diagnostics available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).checklistDiagnostics = runChecklistDiagnostics;
  (window as any).resyncChecklistTemplates = resyncChecklistTemplates;
}