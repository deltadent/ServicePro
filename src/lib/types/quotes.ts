/**
 * TypeScript interfaces for the Professional Quoting System
 * Matches the database schema from the migration
 */

// Enums matching database types
export type QuoteStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'approved' 
  | 'declined' 
  | 'expired' 
  | 'converted';

export type QuoteItemType = 
  | 'service' 
  | 'part' 
  | 'labor' 
  | 'fee' 
  | 'discount';

// Customer signature data structure
export interface CustomerSignature {
  signature_data: string; // Base64 encoded signature image
  timestamp: string;
  ip_address?: string;
  device_info?: {
    user_agent: string;
    screen_resolution: string;
    device_type: 'mobile' | 'tablet' | 'desktop';
  };
}

// Quote template interfaces
export interface QuoteTemplateItem {
  id: string;
  template_id: string;
  item_type: QuoteItemType;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  default_terms?: string;
  default_notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Related data
  template_items?: QuoteTemplateItem[];
}

// Quote item interface
export interface QuoteItem {
  id: string;
  quote_id: string;
  item_type: QuoteItemType;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number; // Calculated field
  inventory_item_id?: string;
  sort_order: number;
}

// Quote revision tracking
export interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  changes_summary?: string;
  previous_total?: number;
  new_total?: number;
  created_by?: string;
  created_at: string;
}

// Main quote interface
export interface Quote {
  id: string;
  quote_number: string; // QUO-YYYY-XXXX format
  customer_id: string;
  created_by: string;
  template_id?: string;
  
  // Quote details
  title: string;
  description?: string;
  status: QuoteStatus;
  
  // Pricing
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Terms and validity
  valid_until?: string; // ISO date string
  terms_and_conditions?: string;
  notes?: string;
  
  // Customer interaction timestamps
  sent_at?: string;
  viewed_at?: string;
  approved_at?: string;
  declined_at?: string;
  declined_reason?: string;
  
  // E-signature data
  customer_signature?: CustomerSignature;
  signature_ip_address?: string;
  signature_timestamp?: string;
  signature_device_info?: any;
  
  // Conversion tracking
  converted_to_job_id?: string;
  converted_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Related data (populated via joins)
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone_mobile?: string;
    phone_work?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  quote_items?: QuoteItem[];
  template?: QuoteTemplate;
  revisions?: QuoteRevision[];
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// DTOs for API operations
export interface CreateQuoteRequest {
  customer_id: string;
  template_id?: string;
  title: string;
  description?: string;
  valid_until?: string;
  terms_and_conditions?: string;
  notes?: string;
  tax_rate?: number;
  discount_amount?: number;
  items: Omit<QuoteItem, 'id' | 'quote_id' | 'total_price'>[];
}

export interface UpdateQuoteRequest {
  title?: string;
  description?: string;
  valid_until?: string;
  terms_and_conditions?: string;
  notes?: string;
  tax_rate?: number;
  discount_amount?: number;
  status?: QuoteStatus;
  items?: Omit<QuoteItem, 'id' | 'quote_id' | 'total_price'>[];
}

export interface QuoteApprovalRequest {
  signature_data: string;
  device_info?: {
    user_agent: string;
    screen_resolution: string;
    device_type: 'mobile' | 'tablet' | 'desktop';
  };
}

export interface QuoteDeclineRequest {
  reason?: string;
}

// Template creation/update DTOs
export interface CreateQuoteTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  default_terms?: string;
  default_notes?: string;
  template_items: Omit<QuoteTemplateItem, 'id' | 'template_id'>[];
}

export interface UpdateQuoteTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  default_terms?: string;
  default_notes?: string;
  is_active?: boolean;
  template_items?: Omit<QuoteTemplateItem, 'id' | 'template_id'>[];
}

// Search and filter interfaces
export interface QuoteFilters {
  status?: QuoteStatus[];
  customer_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search_term?: string; // Search in title, description, quote_number
}

export interface QuoteListOptions {
  filters?: QuoteFilters;
  sort_by?: 'created_at' | 'updated_at' | 'total_amount' | 'quote_number';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

// Response interfaces
export interface QuoteListResponse {
  quotes: Quote[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
  from_cache?: boolean; // For offline-first functionality
}

// Statistics and analytics
export interface QuoteStatistics {
  total_quotes: number;
  quotes_by_status: {
    draft: number;
    sent: number;
    viewed: number;
    approved: number;
    declined: number;
    expired: number;
    converted: number;
  };
  total_quoted_amount: number;
  average_quote_value: number;
  approval_rate: number; // Percentage of sent quotes that are approved
  conversion_rate: number; // Percentage of approved quotes converted to jobs
  monthly_quotes: {
    month: string; // YYYY-MM format
    count: number;
    total_amount: number;
  }[];
}

// Form validation schemas (for use with react-hook-form + zod)
export interface QuoteFormData {
  customer_id: string;
  template_id?: string;
  title: string;
  description?: string;
  valid_until?: Date;
  terms_and_conditions?: string;
  notes?: string;
  tax_rate: number;
  discount_amount: number;
  items: {
    item_type: QuoteItemType;
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    inventory_item_id?: string;
  }[];
}

// Error types
export class QuoteError extends Error {
  constructor(
    message: string,
    public code: string,
    public quote_id?: string
  ) {
    super(message);
    this.name = 'QuoteError';
  }
}

// Offline sync types
export interface QuoteQueueItem {
  id: string;
  type: 'QUOTE_CREATE' | 'QUOTE_UPDATE' | 'QUOTE_APPROVE' | 'QUOTE_DECLINE' | 'QUOTE_SEND';
  payload: any;
  quote_id?: string;
  timestamp: string;
  retry_count: number;
}

// PDF generation options
export interface QuotePDFOptions {
  include_signature?: boolean;
  include_terms?: boolean;
  company_logo?: string;
  brand_colors?: {
    primary: string;
    secondary: string;
  };
}

// Mobile app specific types
export interface MobileQuoteData {
  id: string;
  quote_number: string;
  customer_name: string;
  total_amount: number;
  status: QuoteStatus;
  created_at: string;
  expires_soon?: boolean; // Helper for UI
  can_sign?: boolean; // Helper for UI
}

export interface SignaturePadProps {
  onSignatureComplete: (signature: string) => void;
  onClear: () => void;
  width?: number;
  height?: number;
  background_color?: string;
  pen_color?: string;
  pen_size?: number;
}

// Quote Response System Types
export type ResponseStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type PaymentPreference = 'pay_now' | 'pay_later';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface QuoteResponse {
  id: string;
  quote_id: string;
  status: ResponseStatus;
  customer_notes?: string;
  internal_notes?: string;
  payment_preference?: PaymentPreference;
  preferred_dates?: string[]; // Array of YYYY-MM-DD dates
  preferred_times?: TimeSlot[]; // Array of time slots
  responded_at?: string;
  response_ip?: string;
  response_device_info?: any;
  scheduled_date?: string;
  scheduled_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteResponseRequest {
  quote_id: string;
  status: 'accepted' | 'rejected';
  customer_notes?: string;
  payment_preference?: PaymentPreference;
  preferred_dates?: string[];
  preferred_times?: TimeSlot[];
  response_device_info?: any;
}

export interface QuoteResponseStats {
  total_responses: number;
  accepted_responses: number;
  rejected_responses: number;
  pending_responses: number;
  response_rate: number;
  avg_response_time_hours: number;
}

// Enhanced Quote type with response information
export interface QuoteWithResponse extends Quote {
  quote_responses?: QuoteResponse[];
  latest_response?: QuoteResponse;
}