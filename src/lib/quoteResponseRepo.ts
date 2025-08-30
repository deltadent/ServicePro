/**
 * Quote Response Repository
 * Handles customer responses to quotes with scheduling preferences
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  QuoteResponse, 
  CreateQuoteResponseRequest, 
  QuoteResponseStats,
  ResponseStatus,
  PaymentPreference,
  TimeSlot
} from './types/quotes';

/**
 * Create a new quote response from customer
 */
export async function createQuoteResponse(
  request: CreateQuoteResponseRequest
): Promise<QuoteResponse> {
  // Get device info for tracking
  const deviceInfo = {
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  const responseData = {
    quote_id: request.quote_id,
    status: request.status,
    customer_notes: request.customer_notes,
    payment_preference: request.payment_preference,
    preferred_dates: request.preferred_dates,
    preferred_times: request.preferred_times,
    responded_at: new Date().toISOString(),
    response_device_info: {
      ...deviceInfo,
      ...request.response_device_info
    }
  };

  const { data, error } = await supabase
    .from('quote_responses')
    .insert(responseData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get quote response by quote ID
 */
export async function getQuoteResponse(quoteId: string): Promise<QuoteResponse | null> {
  const { data, error } = await supabase
    .from('quote_responses')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  return data || null;
}

/**
 * Get all responses for a quote (admin view)
 */
export async function getQuoteResponses(quoteId: string): Promise<QuoteResponse[]> {
  const { data, error } = await supabase
    .from('quote_responses')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update quote response (admin only)
 */
export async function updateQuoteResponse(
  responseId: string, 
  updates: Partial<QuoteResponse>
): Promise<QuoteResponse> {
  const { data, error } = await supabase
    .from('quote_responses')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', responseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Schedule job based on customer response
 */
export async function scheduleFromResponse(
  responseId: string,
  scheduledDate: string,
  scheduledBy: string,
  internalNotes?: string
): Promise<QuoteResponse> {
  const { data, error } = await supabase
    .from('quote_responses')
    .update({
      scheduled_date: scheduledDate,
      scheduled_by: scheduledBy,
      internal_notes: internalNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', responseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get response statistics for admin dashboard
 */
export async function getQuoteResponseStats(
  dateFrom?: string,
  dateTo?: string
): Promise<QuoteResponseStats> {
  const { data, error } = await supabase
    .rpc('get_quote_response_stats', {
      date_from: dateFrom || null,
      date_to: dateTo || null
    });

  if (error) throw error;
  
  return data?.[0] || {
    total_responses: 0,
    accepted_responses: 0,
    rejected_responses: 0,
    pending_responses: 0,
    response_rate: 0,
    avg_response_time_hours: 0
  };
}

/**
 * Get pending responses (admin view)
 */
export async function getPendingResponses(): Promise<(QuoteResponse & {
  quote: {
    quote_number: string;
    customer?: { name: string; email?: string; phone_mobile?: string };
    total_amount: number;
    created_at: string;
  }
})[]> {
  const { data, error } = await supabase
    .from('quote_responses')
    .select(`
      *,
      quote:quotes(
        quote_number,
        total_amount,
        created_at,
        customer:customers(name, email, phone_mobile)
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Check if customer can respond to quote
 */
export async function canRespondToQuote(quoteId: string): Promise<boolean> {
  // Check if quote exists and is in a respondable state
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('status, valid_until')
    .eq('id', quoteId)
    .maybeSingle();

  if (error) {
    console.error('Error checking quote response ability:', error);
    return false;
  }

  // If quote not found, customer cannot respond
  if (!quote) {
    console.warn(`Quote not found for response check: ${quoteId}`);
    return false;
  }

  // Check if quote is in valid status
  if (!['sent', 'viewed'].includes(quote.status)) return false;

  // Check if quote hasn't expired
  if (quote.valid_until && new Date(quote.valid_until) < new Date()) return false;

  // Check if there's already a response
  const existingResponse = await getQuoteResponse(quoteId);
  return !existingResponse || existingResponse.status === 'pending';
}

/**
 * Validate response data before submission
 */
export function validateQuoteResponse(request: CreateQuoteResponseRequest): string[] {
  const errors: string[] = [];

  if (!request.quote_id) {
    errors.push('Quote ID is required');
  }

  if (!['accepted', 'rejected'].includes(request.status)) {
    errors.push('Response status must be accepted or rejected');
  }

  if (request.status === 'accepted') {
    if (!request.payment_preference) {
      errors.push('Payment preference is required when accepting');
    }

    if (!request.preferred_dates || request.preferred_dates.length < 1) {
      errors.push('At least 1 preferred date is required when accepting');
    }

    if (!request.preferred_times || request.preferred_times.length < 2) {
      errors.push('At least 2 preferred time slots are required when accepting');
    }

    // Validate date format
    if (request.preferred_dates) {
      for (const date of request.preferred_dates) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errors.push(`Invalid date format: ${date}. Use YYYY-MM-DD`);
        }
        
        // Check if date is in the future
        if (new Date(date) <= new Date()) {
          errors.push(`Date must be in the future: ${date}`);
        }
      }
    }

    // Validate time slots
    const validTimeSlots: TimeSlot[] = ['morning', 'afternoon', 'evening'];
    if (request.preferred_times) {
      for (const time of request.preferred_times) {
        if (!validTimeSlots.includes(time)) {
          errors.push(`Invalid time slot: ${time}`);
        }
      }
    }
  }

  if (request.status === 'rejected' && (!request.customer_notes || request.customer_notes.trim().length < 10)) {
    errors.push('Please provide a reason for rejecting (at least 10 characters)');
  }

  return errors;
}

/**
 * Helper function to get user's IP address for security tracking
 */
export async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not fetch IP address:', error);
    return 'unknown';
  }
}

/**
 * Format time slots for display
 */
export function formatTimeSlots(timeSlots: TimeSlot[]): string {
  const labels = {
    morning: 'Morning (8AM - 12PM)',
    afternoon: 'Afternoon (12PM - 5PM)',
    evening: 'Evening (5PM - 8PM)'
  };
  
  return timeSlots.map(slot => labels[slot]).join(', ');
}

/**
 * Format dates for display
 */
export function formatPreferredDates(dates: string[]): string {
  return dates.map(date => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }).join(', ');
}