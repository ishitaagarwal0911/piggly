-- Add columns to track purchase acknowledgment and state
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS purchase_state TEXT DEFAULT 'active';