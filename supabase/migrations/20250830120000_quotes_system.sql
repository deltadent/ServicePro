-- Professional Quoting System Migration
-- Creates tables for quotes, quote items, templates, and supporting functions

-- Create enum types first
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired', 'converted');
CREATE TYPE quote_item_type AS ENUM ('service', 'part', 'labor', 'fee', 'discount');

-- Quote templates for reusability
CREATE TABLE quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'hvac', 'plumbing', 'electrical', etc.
  default_terms TEXT,
  default_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template line items (reusable services/parts for templates)
CREATE TABLE quote_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES quote_templates(id) ON DELETE CASCADE,
  item_type quote_item_type NOT NULL DEFAULT 'service',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(8,2) DEFAULT 1.0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sort_order INTEGER DEFAULT 0,
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT non_negative_price CHECK (unit_price >= 0)
);

-- Main quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(50) UNIQUE NOT NULL, -- QUO-2024-0001 format
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  template_id UUID REFERENCES quote_templates(id) ON DELETE SET NULL,
  
  -- Quote details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status quote_status DEFAULT 'draft' NOT NULL,
  
  -- Pricing
  subtotal DECIMAL(10,2) DEFAULT 0.00,
  tax_rate DECIMAL(5,4) DEFAULT 0.0000, -- e.g., 0.0825 for 8.25%
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Terms and conditions
  valid_until DATE,
  terms_and_conditions TEXT,
  notes TEXT,
  
  -- Customer interaction
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  declined_reason TEXT,
  
  -- E-signature data
  customer_signature JSONB, -- Store signature as base64 image + metadata
  signature_ip_address INET,
  signature_timestamp TIMESTAMP WITH TIME ZONE,
  signature_device_info JSONB,
  
  -- Conversion tracking
  converted_to_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_subtotal CHECK (subtotal >= 0),
  CONSTRAINT non_negative_tax_rate CHECK (tax_rate >= 0),
  CONSTRAINT non_negative_tax_amount CHECK (tax_amount >= 0),
  CONSTRAINT non_negative_discount CHECK (discount_amount >= 0),
  CONSTRAINT non_negative_total CHECK (total_amount >= 0),
  CONSTRAINT valid_until_future CHECK (valid_until >= CURRENT_DATE OR valid_until IS NULL)
);

-- Quote line items
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  item_type quote_item_type NOT NULL DEFAULT 'service',
  
  -- Item details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(8,2) DEFAULT 1.0 NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Optional inventory link
  inventory_item_id UUID REFERENCES parts_inventory(id) ON DELETE SET NULL,
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT non_negative_price CHECK (unit_price >= 0)
);

-- Quote revisions (track changes for audit)
CREATE TABLE quote_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  changes_summary TEXT,
  previous_total DECIMAL(10,2),
  new_total DECIMAL(10,2),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT positive_revision CHECK (revision_number > 0)
);

-- Create indexes for performance
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until);

CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_sort_order ON quote_items(quote_id, sort_order);

CREATE INDEX idx_quote_templates_active ON quote_templates(is_active);
CREATE INDEX idx_quote_templates_category ON quote_templates(category);

CREATE INDEX idx_quote_template_items_template ON quote_template_items(template_id);
CREATE INDEX idx_quote_template_items_sort ON quote_template_items(template_id, sort_order);

-- Function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  quote_number TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequential number for this year
  SELECT COALESCE(MAX(
    CASE
      WHEN quotes.quote_number LIKE 'QUO-' || current_year || '-%'
      THEN (SPLIT_PART(quotes.quote_number, '-', 3))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM quotes;
  
  -- Format as QUO-YYYY-XXXX
  quote_number := 'QUO-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN quote_number;
END;
$$;

-- Function to update quote totals when items change
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  quote_id_to_update UUID;
  new_subtotal DECIMAL(10,2);
  new_tax_amount DECIMAL(10,2);
  new_total DECIMAL(10,2);
  current_tax_rate DECIMAL(5,4);
  current_discount DECIMAL(10,2);
BEGIN
  -- Determine which quote to update
  IF TG_OP = 'DELETE' THEN
    quote_id_to_update := OLD.quote_id;
  ELSE
    quote_id_to_update := NEW.quote_id;
  END IF;

  -- Calculate new subtotal from quote items
  SELECT COALESCE(SUM(total_price), 0.00)
  INTO new_subtotal
  FROM quote_items
  WHERE quote_id = quote_id_to_update;

  -- Get current tax rate and discount from quotes table
  SELECT tax_rate, discount_amount
  INTO current_tax_rate, current_discount
  FROM quotes
  WHERE id = quote_id_to_update;

  -- Calculate tax amount (after discount)
  new_tax_amount := (new_subtotal - COALESCE(current_discount, 0)) * COALESCE(current_tax_rate, 0);
  
  -- Calculate total
  new_total := new_subtotal - COALESCE(current_discount, 0) + new_tax_amount;

  -- Update quote totals
  UPDATE quotes
  SET 
    subtotal = new_subtotal,
    tax_amount = new_tax_amount,
    total_amount = new_total,
    updated_at = NOW()
  WHERE id = quote_id_to_update;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to automatically set quote number on insert
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers for automatic calculations
CREATE TRIGGER trigger_set_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();

CREATE TRIGGER trigger_update_quote_totals_on_items
  AFTER INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_totals();

-- Update timestamps trigger
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at
  BEFORE UPDATE ON quote_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

-- Quotes policies
CREATE POLICY "Admins can manage all quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Workers can manage their own quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Allow public read access for customer quote viewing (with specific conditions)
CREATE POLICY "Public can view quotes with valid link"
  ON quotes FOR SELECT
  TO anon, authenticated
  USING (status IN ('sent', 'viewed', 'approved', 'declined'));

-- Quote items policies
CREATE POLICY "Quote items follow parent quote permissions"
  ON quote_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_items.quote_id 
      AND (public.is_admin() OR quotes.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_items.quote_id 
      AND (public.is_admin() OR quotes.created_by = auth.uid())
    )
  );

-- Public read access for quote items
CREATE POLICY "Public can view quote items for public quotes"
  ON quote_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_items.quote_id 
      AND quotes.status IN ('sent', 'viewed', 'approved', 'declined')
    )
  );

-- Quote templates policies
CREATE POLICY "Admins can manage all quote templates"
  ON quote_templates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Workers can read active templates"
  ON quote_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Quote template items policies
CREATE POLICY "Template items follow parent template permissions"
  ON quote_template_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_templates 
      WHERE quote_templates.id = quote_template_items.template_id 
      AND (public.is_admin() OR quote_templates.is_active = true)
    )
  )
  WITH CHECK (public.is_admin());

-- Quote revisions policies
CREATE POLICY "Quote revisions follow parent quote permissions"
  ON quote_revisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_revisions.quote_id 
      AND (public.is_admin() OR quotes.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_revisions.quote_id 
      AND (public.is_admin() OR quotes.created_by = auth.uid())
    )
  );

-- Insert some default quote templates
INSERT INTO quote_templates (name, description, category, default_terms, created_by) VALUES
(
  'Basic Service Call',
  'Standard service call template with labor and trip charge',
  'general',
  'Payment is due upon completion of work. We accept cash, check, and major credit cards.',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
),
(
  'HVAC Maintenance',
  'Annual HVAC system maintenance and inspection',
  'hvac',
  'Annual maintenance agreement includes priority scheduling and 10% discount on repairs.',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
),
(
  'Plumbing Repair',
  'Common plumbing repair services',
  'plumbing',
  'All work guaranteed for 90 days. Emergency service available 24/7.',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- Insert template items for the basic service call
INSERT INTO quote_template_items (template_id, item_type, name, description, quantity, unit_price, sort_order)
SELECT 
  t.id,
  'service',
  'Service Call',
  'Diagnostic and initial labor (first hour)',
  1.0,
  95.00,
  1
FROM quote_templates t WHERE t.name = 'Basic Service Call';

INSERT INTO quote_template_items (template_id, item_type, name, description, quantity, unit_price, sort_order)
SELECT 
  t.id,
  'fee',
  'Trip Charge',
  'Travel and equipment transport',
  1.0,
  25.00,
  2
FROM quote_templates t WHERE t.name = 'Basic Service Call';

-- Comment to explain the schema design
COMMENT ON TABLE quotes IS 'Professional quotes with e-signature support and conversion tracking';
COMMENT ON TABLE quote_items IS 'Line items for quotes with automatic total calculation';
COMMENT ON TABLE quote_templates IS 'Reusable quote templates for common services';
COMMENT ON COLUMN quotes.customer_signature IS 'JSON containing signature image data, timestamp, and device info';
COMMENT ON COLUMN quotes.quote_number IS 'Auto-generated unique quote number in QUO-YYYY-XXXX format';