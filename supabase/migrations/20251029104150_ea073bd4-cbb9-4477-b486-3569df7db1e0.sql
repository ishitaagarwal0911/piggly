-- Step 1: Ensure all users have an 'Other' category for both expense and income
INSERT INTO categories (id, user_id, name, icon, color, type, order_index)
SELECT 
  'other_expense_' || u.id::text,
  u.id,
  'Other',
  '📦',
  '#9B9A97',
  'expense',
  999
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.user_id = u.id 
  AND c.name = 'Other' 
  AND c.type = 'expense'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, user_id, name, icon, color, type, order_index)
SELECT 
  'other_income_' || u.id::text,
  u.id,
  'Other',
  '📦',
  '#9B9A97',
  'income',
  999
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.user_id = u.id 
  AND c.name = 'Other' 
  AND c.type = 'income'
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create a function to migrate transaction categories
CREATE OR REPLACE FUNCTION migrate_transaction_categories()
RETURNS void AS $$
DECLARE
  trans RECORD;
  target_category_id TEXT;
BEGIN
  -- Loop through transactions that need migration
  FOR trans IN 
    SELECT id, user_id, category, type
    FROM transactions
    WHERE category NOT SIMILAR TO '[a-z_]+\_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  LOOP
    -- Try to find matching category by name
    SELECT c.id INTO target_category_id
    FROM categories c
    WHERE c.user_id = trans.user_id
      AND c.name = trans.category
      AND c.type = trans.type
    LIMIT 1;
    
    -- If not found, use 'Other' category
    IF target_category_id IS NULL THEN
      SELECT c.id INTO target_category_id
      FROM categories c
      WHERE c.user_id = trans.user_id
        AND c.name = 'Other'
        AND c.type = trans.type
      LIMIT 1;
    END IF;
    
    -- Update the transaction
    IF target_category_id IS NOT NULL THEN
      UPDATE transactions
      SET category = target_category_id
      WHERE id = trans.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Execute the migration
SELECT migrate_transaction_categories();

-- Step 4: Drop the temporary function
DROP FUNCTION migrate_transaction_categories();

-- Step 5: Add validation trigger
CREATE OR REPLACE FUNCTION validate_transaction_category()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_transaction_category_trigger ON transactions;
CREATE TRIGGER validate_transaction_category_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_category();