-- Remove gen_random_uuid() default from categories.id since it's now TEXT
-- This fixes the silent failure when inserting categories with explicit string IDs
ALTER TABLE categories ALTER COLUMN id DROP DEFAULT;