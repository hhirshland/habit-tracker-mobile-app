-- Atomic discount code usage increment.
-- Returns true if the increment succeeded, false if already at max_uses.
CREATE OR REPLACE FUNCTION increment_discount_uses(code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE discount_codes
  SET current_uses = current_uses + 1
  WHERE id = code_id
    AND is_active = true
    AND (max_uses IS NULL OR current_uses < max_uses);

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
