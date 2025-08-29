import { supabase } from '@/integrations/supabase/client';
import { queueAction } from './queue';

/**
 * Job documents repository - manages completion PDFs and other job artifacts
 */

export interface JobDocument {
  id: string;
  job_id: string;
  type: 'completion_pdf';
  storage_path: string;
  created_by: string;
  created_at: string;
}

/**
 * Create a new job document record
 */
export async function createJobDocument(doc: {
  job_id: string;
  type: 'completion_pdf';
  storage_path: string;
}): Promise<{ success: boolean; document?: JobDocument; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('job_documents')
      .insert({
        ...doc,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, document: data };
  } catch (error: any) {
    console.error('Error creating job document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all documents for a job
 */
export async function getJobDocuments(jobId: string): Promise<{
  success: boolean;
  documents?: JobDocument[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('job_documents')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, documents: data || [] };
  } catch (error: any) {
    console.error('Error fetching job documents:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the latest completion PDF for a job
 */
export async function getLatestCompletionPdf(jobId: string): Promise<{
  success: boolean;
  document?: JobDocument;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('job_documents')
      .select('*')
      .eq('job_id', jobId)
      .eq('type', 'completion_pdf')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw error;
    }

    return { success: true, document: data };
  } catch (error: any) {
    console.error('Error fetching latest completion PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a job document (admin only)
 */
export async function deleteJobDocument(documentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    const { error } = await supabase
      .from('job_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting job document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete job workflow - generates PDF and updates job status
 */
export async function completeJobWithPdf(params: {
  jobId: string;
  checklistId: string;
  technicianName: string;
  technicianId: string;
  workSummary?: string;
  signatureBlob?: Blob;
  companyInfo?: { name: string; logo?: string };
}): Promise<{
  success: boolean;
  document?: JobDocument;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch all required data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customers (*)
      `)
      .eq('id', params.jobId)
      .single();

    if (jobError) throw jobError;

    const { data: checklist, error: checklistError } = await supabase
      .from('job_checklists')
      .select('*')
      .eq('id', params.checklistId)
      .single();

    if (checklistError) throw checklistError;

    // Prepare PDF data
    const pdfData = {
      job: {
        ...job,
        work_summary: params.workSummary
      },
      checklist,
      technician: {
        name: params.technicianName,
        id: params.technicianId
      },
      companyInfo: params.companyInfo,
      signature: params.signatureBlob ? {
        image: await blobToDataUrl(params.signatureBlob),
        signed_at: new Date().toISOString(),
        signed_by: job.customers?.name || 'Customer'
      } : undefined
    };

    // Generate PDF
    const { buildCompletionPdf } = await import('./pdf');
    const pdfBlob = await buildCompletionPdf(pdfData);

    // Upload to storage
    const { generateCompletionPdfPath, uploadJobDoc } = await import('./storage');
    const storagePath = generateCompletionPdfPath(params.jobId);

    const uploadResult = await uploadJobDoc(pdfBlob, storagePath);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload PDF');
    }

    // Create document record
    const docResult = await createJobDocument({
      job_id: params.jobId,
      type: 'completion_pdf',
      storage_path: storagePath
    });

    if (!docResult.success) {
      throw new Error(docResult.error || 'Failed to create document record');
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        work_summary: params.workSummary
      })
      .eq('id', params.jobId);

    if (updateError) throw updateError;

    return { success: true, document: docResult.document };
  } catch (error: any) {
    console.error('Error completing job with PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper to convert blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}