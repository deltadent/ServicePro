-- Fix ambiguous column reference in generate_quote_number() function
-- This prevents the "column reference 'quote_number' is ambiguous" error

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

COMMENT ON FUNCTION generate_quote_number() IS 'Generates unique quote numbers in format QUO-YYYY-XXXX - Fixed to avoid ambiguous column references';