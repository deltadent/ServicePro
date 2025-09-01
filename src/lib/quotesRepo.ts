/**
 * Offline-first quotes repository
 * Implements network-first strategy with local caching for quotes
 */

import { supabase } from '@/integrations/supabase/client';
import { dbService } from './db';
import {
  Quote,
  QuoteItem,
  QuoteTemplate,
  CreateQuoteRequest,
  UpdateQuoteRequest,
  QuoteListOptions,
  QuoteListResponse,
  QuoteFilters,
  QuoteStatistics,
  QuoteApprovalRequest,
  QuoteDeclineRequest,
  CreateQuoteTemplateRequest,
  UpdateQuoteTemplateRequest
} from './types/quotes';
import { nanoid } from 'nanoid';
import { generateNextDocumentNumber } from './companyRepo';

/**
 * Fetches quotes with offline-first strategy
 */
export async function fetchQuotesList(options: QuoteListOptions = {}): Promise<QuoteListResponse> {
  const {
    filters = {},
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    per_page = 20
  } = options;

  try {
    // Build Supabase query
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, name, email, phone_mobile, phone_work, address, city, state, zip_code),
        quote_items(*),
        template:quote_templates(id, name, category),
        created_by_profile:profiles!quotes_created_by_fkey(id, full_name, email)
      `, { count: 'exact' });

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    if (filters.amount_min) {
      query = query.gte('total_amount', filters.amount_min);
    }
    if (filters.amount_max) {
      query = query.lte('total_amount', filters.amount_max);
    }
    if (filters.search_term) {
      query = query.or(`quotes.title.ilike.%${filters.search_term}%,quotes.quote_number.ilike.%${filters.search_term}%,quotes.description.ilike.%${filters.search_term}%`);
    }

    // Apply sorting and pagination - ensure table prefix for sorting
    const sortColumn = sort_by === 'quote_number' ? 'quotes.quote_number' : sort_by;
    query = query
      .order(sortColumn, { ascending: sort_order === 'asc' })
      .range((page - 1) * per_page, page * per_page - 1);

    const { data: quotes, error, count } = await query;

    if (error) throw error;

    // Cache successful network response
    const db = await dbService.getDB();
    const tx = db.transaction('quotes', 'readwrite');

    for (const quote of quotes || []) {
      await tx.store.put(quote);
    }
    await tx.done;

    return {
      quotes: quotes || [],
      total_count: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
      from_cache: false
    };

  } catch (error) {
    console.warn('Network request failed, falling back to cache:', error);

    // Fallback to IndexedDB cache
    try {
      const db = await dbService.getDB();
      let cachedQuotes = await db.getAll('quotes');

      // Apply filters to cached data
      cachedQuotes = applyFiltersToCache(cachedQuotes, filters);

      // Apply sorting
      cachedQuotes.sort((a, b) => {
        const aVal = a[sort_by as keyof Quote];
        const bVal = b[sort_by as keyof Quote];
        
        if (sort_order === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      // Apply pagination
      const start = (page - 1) * per_page;
      const end = start + per_page;
      const paginatedQuotes = cachedQuotes.slice(start, end);

      return {
        quotes: paginatedQuotes,
        total_count: cachedQuotes.length,
        page,
        per_page,
        total_pages: Math.ceil(cachedQuotes.length / per_page),
        from_cache: true
      };

    } catch (cacheError) {
      console.error('Cache fallback failed:', cacheError);
      return {
        quotes: [],
        total_count: 0,
        page: 1,
        per_page,
        total_pages: 0,
        from_cache: true
      };
    }
  }
}

/**
 * Fetches a single quote with full details
 */
export async function fetchQuoteDetail(quoteId: string): Promise<{ quote: Quote | null; from_cache: boolean }> {
  try {
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, name, email, phone_mobile, phone_work, address, city, state, zip_code),
        quote_items(*),
        template:quote_templates(id, name, category),
        revisions:quote_revisions(*),
        created_by_profile:profiles!quotes_created_by_fkey(id, full_name, email)
      `)
      .eq('id', quoteId)
      .maybeSingle();

    if (error) throw error;

    // If no quote found, try cache fallback without network error
    if (!quote) {
      console.warn(`Quote not found in database: ${quoteId}, falling back to cache`);

      try {
        const db = await dbService.getDB();
        const cachedQuote = await db.get('quotes', quoteId);

        return {
          quote: cachedQuote || null,
          from_cache: true
        };

      } catch (cacheError) {
        console.error('Cache fallback failed:', cacheError);
        return {
          quote: null,
          from_cache: true
        };
      }
    }

    // Cache the quote
    await cacheQuote(quote);

    return {
      quote,
      from_cache: false
    };

  } catch (error) {
    console.warn(`Network request failed for quote ${quoteId}, falling back to cache:`, error);

    try {
      const db = await dbService.getDB();
      const cachedQuote = await db.get('quotes', quoteId);

      return {
        quote: cachedQuote || null,
        from_cache: true
      };

    } catch (cacheError) {
      console.error('Cache fallback failed:', cacheError);
      return {
        quote: null,
        from_cache: true
      };
    }
  }
}

/**
 * Creates a new quote
 */
export async function createQuote(quoteData: CreateQuoteRequest): Promise<Quote> {
  // Import needed functions
  const { generateNextDocumentNumber } = await import('./companyRepo');
  try {
    // Get user authentication first
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication failed. Please log in again.');
    }

    const userId = authData.user?.id;

    if (!userId) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated. Please log in.');
    }

    console.log('Creating quote with user:', userId);

    // Generate quote number using company settings
    const quoteNumber = await generateNextDocumentNumber('quote');
    console.log('Generated quote number:', quoteNumber);

    // First create the quote record
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        customer_id: quoteData.customer_id,
        template_id: quoteData.template_id,
        title: quoteData.title,
        description: quoteData.description,
        valid_until: quoteData.valid_until,
        terms_and_conditions: quoteData.terms_and_conditions,
        notes: quoteData.notes,
        tax_rate: quoteData.tax_rate || 0,
        discount_amount: quoteData.discount_amount || 0,
        created_by: userId
      })
      .select(`
        id, quote_number, customer_id, created_by, template_id, title, description, valid_until,
        terms_and_conditions, notes, status, subtotal, tax_rate, tax_amount,
        discount_amount, total_amount, created_at, updated_at,
        customer:customers(id, name, email),
        template:quote_templates(id, name, category),
        created_by_profile:profiles!quotes_created_by_fkey(id, full_name, email)
      `)
      .single();

    if (quoteError) {
      console.error('Database insert error:', quoteError);
      throw quoteError;
    }

    console.log('Quote created in database:', quote?.id);

    // Then create the quote items
    console.log('Quote data items:', quoteData.items);
    console.log('Items length:', quoteData.items?.length);

    if (quoteData.items && quoteData.items.length > 0) {
      console.log('Creating quote items for quote:', quote.id, 'with items:', quoteData.items.length);

      const quoteItems = quoteData.items.map((item, index) => ({
        quote_id: quote.id,
        item_type: item.item_type,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        inventory_item_id: item.inventory_item_id && item.inventory_item_id.trim() !== "" ? item.inventory_item_id : null,
        sort_order: index + 1
      }));

      console.log('Inserting quote items:', JSON.stringify(quoteItems, null, 2));

      const { data: insertResult, error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)
        .select();

      if (itemsError) {
        console.error('Failed to create quote items:', JSON.stringify(itemsError, null, 2));
        throw itemsError;
      }

      console.log('Quote items insertion result:', insertResult);
      console.log('Quote items created successfully');
    } else {
      console.log('No items to create for this quote');
    }

    // Fetch the complete quote with items
    const { quote: completeQuote } = await fetchQuoteDetail(quote.id);
    
    // Cache the result
    if (completeQuote) {
      await cacheQuote(completeQuote);
    }

    return completeQuote!;

  } catch (error) {
    console.error('Failed to create quote online, queuing for sync:', error);

    // Queue for offline sync
    const offlineQuoteId = nanoid();
    const offlineQuoteItems = quoteData.items?.map((item, index) => ({
      id: nanoid(),
      quote_id: offlineQuoteId,
      item_type: item.item_type,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      inventory_item_id: item.inventory_item_id,
      sort_order: index + 1
    })) || [];

    const offlineQuote: Quote = {
      id: offlineQuoteId,
      quote_number: `QUO-DRAFT-${Date.now()}`, // Temporary number
      customer_id: quoteData.customer_id,
      created_by: (await supabase.auth.getUser()).data.user?.id || '',
      title: quoteData.title,
      description: quoteData.description,
      status: 'draft',
      subtotal: 0,
      tax_rate: quoteData.tax_rate || 0,
      tax_amount: 0,
      discount_amount: quoteData.discount_amount || 0,
      total_amount: 0,
      valid_until: quoteData.valid_until,
      terms_and_conditions: quoteData.terms_and_conditions,
      notes: quoteData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      quote_items: offlineQuoteItems
    };

    // Calculate totals
    const subtotal = offlineQuote.quote_items?.reduce((sum, item) => sum + item.total_price, 0) || 0;
    const discountedSubtotal = subtotal - (quoteData.discount_amount || 0);
    const taxAmount = discountedSubtotal * (quoteData.tax_rate || 0);
    
    offlineQuote.subtotal = subtotal;
    offlineQuote.tax_amount = taxAmount;
    offlineQuote.total_amount = discountedSubtotal + taxAmount;

    // Queue for sync
    await queueQuoteAction('QUOTE_CREATE', offlineQuote, quoteData);

    return offlineQuote;
  }
}

/**
 * Updates an existing quote
 */
export async function updateQuote(quoteId: string, updates: UpdateQuoteRequest): Promise<Quote> {
  try {
    const { data: quote, error } = await supabase
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
      .eq('id', quoteId)
      .select(`
        id, customer_id, template_id, title, description, valid_until, terms_and_conditions, notes, status, subtotal, tax_rate, tax_amount, discount_amount, total_amount, created_at, updated_at, approved_at, declined_reason, converted_at, quote_number, valid_until, sent_at, viewed_at, approved_at, declined_at, declined_reason, converted_to_job_id, converted_at, customer_signature, signature_ip_address, signature_timestamp, signature_device_info
        customer:customers(id, name, email),
        quote_items(*),
        template:quote_templates(id, name, category),
        created_by_profile:profiles!quotes_created_by_fkey(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    // Update items if provided
    if (updates.items) {
      // Delete existing items
      await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId);

      // Insert new items
      if (updates.items.length > 0) {
        await supabase
          .from('quote_items')
          .insert(
            updates.items.map((item, index) => ({
              quote_id: quoteId,
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

    // Fetch updated quote
    const { quote: updatedQuote } = await fetchQuoteDetail(quoteId);
    
    if (updatedQuote) {
      await cacheQuote(updatedQuote);
    }

    return updatedQuote!;

  } catch (error) {
    console.error('Failed to update quote online, queuing for sync:', error);
    await queueQuoteAction('QUOTE_UPDATE', { id: quoteId, ...updates }, updates);
    throw error;
  }
}

/**
 * Sends a quote to customer
 */
export async function sendQuote(quoteId: string): Promise<Quote> {
  return await updateQuote(quoteId, { 
    status: 'sent',
  });
}

/**
 * Deletes a quote from the database
 */
export async function deleteQuote(quoteId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId);

    if (error) throw error;

    // Also delete quote items (cascade delete should handle this in database)
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', quoteId);

    console.log('Quote deleted successfully:', quoteId);
  } catch (error) {
    console.error('Failed to delete quote:', error);
    throw error;
  }
}

/**
 * Customer approves quote with signature
 */
export async function approveQuote(quoteId: string, approval: QuoteApprovalRequest): Promise<Quote> {
  try {
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        customer_signature: {
          signature_data: approval.signature_data,
          timestamp: new Date().toISOString(),
          device_info: approval.device_info
        }
      })
      .eq('id', quoteId)
      .select(`
        *, quote_number,
        customer:customers(id, name, email),
        quote_items(*),
        template:quote_templates(id, name),
        created_by_profile:profiles!quotes_created_by_fkey(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    await cacheQuote(quote);
    return quote;

  } catch (error) {
    console.error('Failed to approve quote online:', error);
    await queueQuoteAction('QUOTE_APPROVE', { quote_id: quoteId, ...approval });
    throw error;
  }
}

/**
 * Customer declines quote
 */
export async function declineQuote(quoteId: string, decline: QuoteDeclineRequest): Promise<Quote> {
  // Update quote to declined status - store declined reason in notes for now
  const updateData: any = {
    status: 'declined',
    declined_reason: decline.reason
  };

  return await updateQuote(quoteId, updateData);
}

/**
 * Converts approved quote to job
 */
export async function convertQuoteToJob(quoteId: string): Promise<{ quote: Quote; job: any }> {
  try {
    const { quote } = await fetchQuoteDetail(quoteId);
    if (!quote) throw new Error('Quote not found');
    
    if (quote.status !== 'approved') {
      throw new Error('Quote must be approved before conversion');
    }

    // Generate job number
    const jobNumber = `JOB-${Date.now()}`;

    // Create job from quote data with enhanced mapping
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        job_number: jobNumber,
        title: quote.title,
        description: quote.description,
        customer_id: quote.customer_id,
        technician_id: quote.created_by,
        quote_id: quoteId, // Link to original quote
        estimated_cost: quote.total_amount,
        total_cost: null, // Will be calculated after job completion
        status: 'scheduled',
        priority: 'medium',
        service_type: 'general',
        scheduled_date: new Date().toISOString(),
        quote_converted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Create job checklist from quote items
    if (quote.quote_items && quote.quote_items.length > 0) {
      const checklistItems = quote.quote_items.map((item, index) => ({
        id: `item-${index + 1}`,
        text: `${item.description || item.name} - ${item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}`,
        required: item.item_type === 'service',
        completed: false
      }));

      const checklistData = {
        job_id: job.id,
        template_name: `Quote #${quote.quote_number} Checklist`,
        items: checklistItems,
        completed_count: 0,
        total_count: checklistItems.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('job_checklists')
        .insert([checklistData]);
    }

    // Update quote to converted status
    const updatedQuote = await updateQuote(quoteId, {
      status: 'converted',
    });

    // Link quote to job
    await supabase
      .from('quotes')
      .update({ 
        converted_to_job_id: job.id, 
        converted_to_job_at: new Date().toISOString() 
      })
      .eq('id', quoteId);

    return { quote: updatedQuote, job };

  } catch (error) {
    console.error('Failed to convert quote to job:', error);
    throw error;
  }
}

/**
 * Quote templates management
 */
export async function fetchQuoteTemplates(activeOnly = true): Promise<QuoteTemplate[]> {
  try {
    let query = supabase
      .from('quote_templates')
      .select(`
        *,
        template_items:quote_template_items(*)
      `)
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: templates, error } = await query;

    if (error) throw error;

    return templates || [];

  } catch (error) {
    console.error('Failed to fetch quote templates:', error);
    return [];
  }
}

export async function createQuoteTemplate(templateData: CreateQuoteTemplateRequest): Promise<QuoteTemplate> {
  const { data: template, error } = await supabase
    .from('quote_templates')
    .insert({
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      default_terms: templateData.default_terms,
      default_notes: templateData.default_notes,
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (error) throw error;

  // Add template items
  if (templateData.template_items.length > 0) {
    await supabase
      .from('quote_template_items')
      .insert(
        templateData.template_items.map((item, index) => ({
          template_id: template.id,
          item_type: item.item_type,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          sort_order: index + 1
        }))
      );
  }

  // Return template with items
  const templates = await fetchQuoteTemplates(false);
  return templates.find(t => t.id === template.id)!;
}

/**
 * Get quote statistics for dashboard
 */
export async function getQuoteStatistics(dateRange?: { from: string; to: string }): Promise<QuoteStatistics> {
  try {
    let query = supabase
      .from('quotes')
      .select('status, total_amount, created_at');

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to);
    }

    const { data: quotes, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const stats: QuoteStatistics = {
      total_quotes: quotes?.length || 0,
      quotes_by_status: {
        draft: 0,
        sent: 0,
        viewed: 0,
        approved: 0,
        declined: 0,
        expired: 0,
        converted: 0
      },
      total_quoted_amount: 0,
      average_quote_value: 0,
      approval_rate: 0,
      conversion_rate: 0,
      monthly_quotes: []
    };

    if (quotes && quotes.length > 0) {
      // Count by status
      quotes.forEach(quote => {
        stats.quotes_by_status[quote.status]++;
        stats.total_quoted_amount += quote.total_amount || 0;
      });

      stats.average_quote_value = stats.total_quoted_amount / quotes.length;

      // Calculate rates
      const sentQuotes = stats.quotes_by_status.sent + stats.quotes_by_status.viewed + 
                       stats.quotes_by_status.approved + stats.quotes_by_status.declined + 
                       stats.quotes_by_status.expired + stats.quotes_by_status.converted;
      
      if (sentQuotes > 0) {
        stats.approval_rate = ((stats.quotes_by_status.approved + stats.quotes_by_status.converted) / sentQuotes) * 100;
      }

      if (stats.quotes_by_status.approved > 0) {
        stats.conversion_rate = (stats.quotes_by_status.converted / stats.quotes_by_status.approved) * 100;
      }
    }

    return stats;

  } catch (error) {
    console.error('Failed to get quote statistics:', error);
    return {
      total_quotes: 0,
      quotes_by_status: {
        draft: 0, sent: 0, viewed: 0, approved: 0, declined: 0, expired: 0, converted: 0
      },
      total_quoted_amount: 0,
      average_quote_value: 0,
      approval_rate: 0,
      conversion_rate: 0,
      monthly_quotes: []
    };
  }
}

// Helper functions
async function cacheQuote(quote: Quote): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.put('quotes', quote);
  } catch (error) {
    console.error('Failed to cache quote:', error);
  }
}

async function queueQuoteAction(type: string, data: any, originalRequest?: any): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.add('queues', {
      id: nanoid(),
      type,
      payload: { data, originalRequest },
      timestamp: new Date().toISOString(),
      jobId: data.quote_id || data.id
    });
  } catch (error) {
    console.error('Failed to queue quote action:', error);
  }
}

function applyFiltersToCache(quotes: Quote[], filters: QuoteFilters): Quote[] {
  return quotes.filter(quote => {
    if (filters.status?.length && !filters.status.includes(quote.status)) return false;
    if (filters.customer_id && quote.customer_id !== filters.customer_id) return false;
    if (filters.created_by && quote.created_by !== filters.created_by) return false;
    if (filters.date_from && quote.created_at < filters.date_from) return false;
    if (filters.date_to && quote.created_at > filters.date_to) return false;
    if (filters.amount_min && quote.total_amount < filters.amount_min) return false;
    if (filters.amount_max && quote.total_amount > filters.amount_max) return false;
    if (filters.search_term) {
      const term = filters.search_term.toLowerCase();
      if (!quote.title.toLowerCase().includes(term) && 
          !quote.quote_number.toLowerCase().includes(term) &&
          !(quote.description?.toLowerCase().includes(term))) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Public quote access (for customer viewing without auth)
 */
export async function getPublicQuote(quoteId: string): Promise<Quote | null> {
  try {
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(name, email, phone_mobile, address, city, state, zip_code),
        quote_items(*),
        created_by_profile:profiles!quotes_created_by_fkey(full_name, email)
      `)
      .eq('id', quoteId)
      .in('status', ['sent', 'viewed', 'approved', 'declined'])
      .maybeSingle();

    if (error) throw error;

    // If no quote found, return null
    if (!quote) {
      console.warn(`Public quote not found: ${quoteId}`);
      return null;
    }

    // Mark as viewed if first time
    if (quote.status === 'sent') {
      await supabase
        .from('quotes')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', quoteId);
    }

    return quote;

  } catch (error) {
    console.error('Failed to fetch public quote:', error);
    return null;
  }
}