-- Update seed_default_categories function to use new Notion colors
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.categories (id, user_id, name, icon, color, type, order_index)
  VALUES
    ('food_' || p_user_id::text, p_user_id, 'Food & Drinks', '🍽️', '#FDB022', 'expense', 0),
    ('transport_' || p_user_id::text, p_user_id, 'Transport', '🚗', '#6B9FE8', 'expense', 1),
    ('shopping_' || p_user_id::text, p_user_id, 'Shopping', '🛍️', '#E87BA0', 'expense', 2),
    ('bills_' || p_user_id::text, p_user_id, 'Bills', '💡', '#FFDC49', 'expense', 3),
    ('entertainment_' || p_user_id::text, p_user_id, 'Entertainment', '🎬', '#B08AD8', 'expense', 4),
    ('health_' || p_user_id::text, p_user_id, 'Health', '💊', '#57C4C4', 'expense', 5),
    ('income_' || p_user_id::text, p_user_id, 'Income', '💰', '#5FB05F', 'income', 6),
    ('other_' || p_user_id::text, p_user_id, 'Other', '📦', '#9D9A97', 'expense', 7)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Migrate existing users' default categories to new Notion colors
UPDATE categories SET color = '#FDB022' WHERE name = 'Food & Drinks';
UPDATE categories SET color = '#6B9FE8' WHERE name = 'Transport';
UPDATE categories SET color = '#E87BA0' WHERE name = 'Shopping';
UPDATE categories SET color = '#FFDC49' WHERE name = 'Bills';
UPDATE categories SET color = '#B08AD8' WHERE name = 'Entertainment';
UPDATE categories SET color = '#57C4C4' WHERE name = 'Health';
UPDATE categories SET color = '#5FB05F' WHERE name = 'Income';
UPDATE categories SET color = '#9D9A97' WHERE name = 'Other';