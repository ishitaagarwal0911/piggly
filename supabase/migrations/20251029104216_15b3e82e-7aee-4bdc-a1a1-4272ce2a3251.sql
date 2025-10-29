-- Fix security warning: Set search_path for validation function
CREATE OR REPLACE FUNCTION validate_transaction_category()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE id = NEW.category 
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Invalid category: % does not exist for user %', NEW.category, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;