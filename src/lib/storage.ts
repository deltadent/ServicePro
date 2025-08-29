import { supabase } from '@/integrations/supabase/client';

/**
 * Upload a job document to storage
 */
export async function uploadJobDoc(
  file: File | Blob,
  storagePath: string,
  options: { contentType?: string } = {}
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from('job-docs')
      .upload(storagePath, file, {
        contentType: options.contentType || 'application/pdf',
        upsert: false
      });

    if (error) throw error;

    return { success: true, path: data.path };
  } catch (error: any) {
    console.error('Error uploading job document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get signed URL for job document (short-lived URL for viewing/downloading)
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from('job-docs')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) throw error;

    return { success: true, signedUrl: data.signedUrl };
  } catch (error: any) {
    console.error('Error getting signed URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Download job document as blob
 */
export async function downloadJobDoc(
  storagePath: string
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from('job-docs')
      .download(storagePath);

    if (error) throw error;

    return { success: true, blob: data };
  } catch (error: any) {
    console.error('Error downloading job document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate storage path for completion PDF
 */
export function generateCompletionPdfPath(jobId: string): string {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  return `${jobId}/completion_${timestamp}.pdf`;
}

/**
 * List job documents for a specific job
 */
export async function listJobDocs(jobId: string): Promise<{
  success: boolean;
  documents?: Array<{ name: string; id: string; updated_at: string; last_accessed_at: string; metadata: any }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.storage
      .from('job-docs')
      .list(jobId);

    if (error) throw error;

    const documents = data?.map(doc => ({
      name: doc.name,
      id: doc.id || '',
      updated_at: doc.updated_at || '',
      last_accessed_at: doc.last_accessed_at || '',
      metadata: doc.metadata || {}
    })) || [];

    return { success: true, documents };
  } catch (error: any) {
    console.error('Error listing job documents:', error);
    return { success: false, error: error.message };
  }
}