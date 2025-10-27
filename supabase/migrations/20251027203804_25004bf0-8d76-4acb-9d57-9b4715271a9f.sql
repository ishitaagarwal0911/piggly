-- Fix security warning: Set search_path on seed_default_categories function
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.categories (id, user_id, name, icon, color, type, order_index)
  VALUES
    ('food_' || p_user_id::text, p_user_id, 'Food & Drinks', '🍽️', 'rgba(255, 212, 178, 0.70)', 'expense', 0),
    ('transport_' || p_user_id::text, p_user_id, 'Transport', '🚗', 'rgba(163, 196, 243, 0.70)', 'expense', 1),
    ('shopping_' || p_user_id::text, p_user_id, 'Shopping', '🛍️', 'rgba(255, 179, 217, 0.70)', 'expense', 2),
    ('bills_' || p_user_id::text, p_user_id, 'Bills', '💡', 'rgba(255, 245, 186, 0.70)', 'expense', 3),
    ('entertainment_' || p_user_id::text, p_user_id, 'Entertainment', '🎬', 'rgba(212, 187, 255, 0.70)', 'expense', 4),
    ('health_' || p_user_id::text, p_user_id, 'Health', '💊', 'rgba(212, 244, 221, 0.70)', 'expense', 5),
    ('income_' || p_user_id::text, p_user_id, 'Income', '💰', 'rgba(178, 235, 180, 0.70)', 'income', 6),
    ('other_' || p_user_id::text, p_user_id, 'Other', '📦', 'rgba(212, 212, 212, 0.70)', 'expense', 7)
  ON CONFLICT DO NOTHING;
END;
$$;