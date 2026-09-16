-- Invoice number sequence starting at 50
-- Numbers will be formatted as KC-00050, KC-00051, etc.

CREATE SEQUENCE IF NOT EXISTS kc_invoice_number_seq
  START WITH 50
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- RPC callable from Edge Functions (SECURITY DEFINER so service role can call it)
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'KC-' || LPAD(nextval('kc_invoice_number_seq')::TEXT, 5, '0');
$$;
