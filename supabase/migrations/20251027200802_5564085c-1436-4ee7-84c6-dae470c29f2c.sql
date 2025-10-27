-- Change categories.id from UUID to TEXT to support string IDs for default categories
-- This fixes the data model mismatch where transactions.category is TEXT but categories.id was UUID

ALTER TABLE categories ALTER COLUMN id TYPE TEXT;