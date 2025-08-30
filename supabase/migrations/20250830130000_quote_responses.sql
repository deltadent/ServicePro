-- Customer Quote Response System Migration
-- Enables customers to respond to quotes with scheduling preferences

-- Create enum types for responses
CREATE TYPE response_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE payment_preference AS ENUM ('pay_now', 'pay_later');
CREATE TYPE time_slot AS ENUM ('morning', 'afternoon', 'evening');

-- Quote responses table
CREATE TABLE quote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Response details
  status response_status DEFAULT 'pending' NOT NULL,
  customer_notes TEXT,
  internal_notes TEXT, -- For admin use
  
  -- Payment preference
  payment_preference payment_preference,
  
  -- Scheduling preferences (customer selects 2+ time slots)
  preferred_dates JSONB, -- Array of date strings: ["2025-01-15", "2025-01-16"]
  preferred_times JSONB, -- Array of time slots: ["morning", "afternoon"]
  
  -- Response tracking
  responded_at TIMESTAMP WITH TIME ZONE,
  response_ip INET, -- Track IP for security
  response_device_info JSONB, -- Browser/device info
  
  -- Admin follow-up
  scheduled_date TIMESTAMP WITH TIME ZONE,
  scheduled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_preferred_dates CHECK (
    preferred_dates IS NULL OR 
    (jsonb_typeof(preferred_dates) = 'array' AND jsonb_array_length(preferred_dates) >= 1)
  ),
  CONSTRAINT valid_preferred_times CHECK (
    preferred_times IS NULL OR 
    (jsonb_typeof(preferred_times) = 'array' AND jsonb_array_length(preferred_times) >= 2)
  )
);

-- Indexes for performance
CREATE INDEX idx_quote_responses_quote_id ON quote_responses(quote_id);
CREATE INDEX idx_quote_responses_status ON quote_responses(status);
CREATE INDEX idx_quote_responses_created_at ON quote_responses(created_at);
CREATE INDEX idx_quote_responses_scheduled_date ON quote_responses(scheduled_date);

-- Row Level Security
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;

-- Admins can manage all quote responses
CREATE POLICY "Admins can manage all quote responses"
  ON quote_responses FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Workers can view responses for their quotes
CREATE POLICY "Workers can view responses for their quotes"
  ON quote_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_responses.quote_id 
      AND quotes.created_by = auth.uid()
    )
  );

-- Public can insert responses (customer responding)
CREATE POLICY "Public can create quote responses"
  ON quote_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public can view their own responses
CREATE POLICY "Public can view quote responses for public quotes"
  ON quote_responses FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_responses.quote_id 
      AND quotes.status IN ('sent', 'viewed', 'approved', 'declined')
    )
  );

-- Function to automatically update quote status when response is created
CREATE OR REPLACE FUNCTION update_quote_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update quote status based on response
  UPDATE quotes 
  SET 
    status = CASE 
      WHEN NEW.status = 'accepted' THEN 'approved'::quote_status
      WHEN NEW.status = 'rejected' THEN 'declined'::quote_status
      ELSE quotes.status
    END,
    approved_at = CASE WHEN NEW.status = 'accepted' THEN NEW.responded_at ELSE quotes.approved_at END,
    declined_at = CASE WHEN NEW.status = 'rejected' THEN NEW.responded_at ELSE quotes.declined_at END,
    declined_reason = CASE WHEN NEW.status = 'rejected' THEN NEW.customer_notes ELSE quotes.declined_reason END,
    updated_at = NOW()
  WHERE id = NEW.quote_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update quote status
CREATE TRIGGER trigger_update_quote_on_response
  AFTER INSERT OR UPDATE ON quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_on_response();

-- Update timestamps trigger
CREATE TRIGGER update_quote_responses_updated_at
  BEFORE UPDATE ON quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get customer response summary for admin dashboard
CREATE OR REPLACE FUNCTION get_quote_response_stats(date_from DATE DEFAULT NULL, date_to DATE DEFAULT NULL)
RETURNS TABLE (
  total_responses BIGINT,
  accepted_responses BIGINT,
  rejected_responses BIGINT,
  pending_responses BIGINT,
  response_rate NUMERIC(5,2),
  avg_response_time_hours NUMERIC(10,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_responses,
    COUNT(*) FILTER (WHERE qr.status = 'accepted')::BIGINT as accepted_responses,
    COUNT(*) FILTER (WHERE qr.status = 'rejected')::BIGINT as rejected_responses,
    COUNT(*) FILTER (WHERE qr.status = 'pending')::BIGINT as pending_responses,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE qr.status IN ('accepted', 'rejected')) * 100.0 / COUNT(*))::NUMERIC(5,2)
      ELSE 0::NUMERIC(5,2)
    END as response_rate,
    AVG(
      CASE 
        WHEN qr.responded_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (qr.responded_at - q.sent_at)) / 3600
        ELSE NULL
      END
    )::NUMERIC(10,2) as avg_response_time_hours
  FROM quote_responses qr
  JOIN quotes q ON q.id = qr.quote_id
  WHERE 
    (date_from IS NULL OR qr.created_at >= date_from) AND
    (date_to IS NULL OR qr.created_at <= date_to + INTERVAL '1 day');
END;
$$;

-- Comment on tables and columns
COMMENT ON TABLE quote_responses IS 'Customer responses to quotes with scheduling preferences';
COMMENT ON COLUMN quote_responses.preferred_dates IS 'Array of preferred dates in YYYY-MM-DD format';
COMMENT ON COLUMN quote_responses.preferred_times IS 'Array of preferred time slots (minimum 2 required)';
COMMENT ON COLUMN quote_responses.payment_preference IS 'Customer payment preference: pay_now or pay_later';
COMMENT ON COLUMN quote_responses.response_device_info IS 'Browser and device information for security tracking';