import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseVerificationRequest {
  purchaseToken: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { purchaseToken }: PurchaseVerificationRequest = await req.json();

    if (!purchaseToken) {
      throw new Error('Purchase token is required');
    }

    // TODO: Verify with Google Play Developer API
    // For now, we'll create a mock verification
    // You need to implement actual Google Play API verification here
    // using GOOGLE_PLAY_SERVICE_ACCOUNT secret
    
    console.log(`Verifying purchase for user ${user.id}, token: ${purchaseToken}`);

    // Mock verification - replace with actual Google Play API call
    const isValid = true; // This should come from Google Play API verification
    
    if (!isValid) {
      throw new Error('Invalid purchase token');
    }

    // Calculate expiry (30 days from now for monthly subscription)
    const purchaseTime = new Date();
    const expiryTime = new Date();
    expiryTime.setDate(expiryTime.getDate() + 30);

    // Store subscription in database
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        purchase_token: purchaseToken,
        product_id: 'premium_monthly',
        purchase_time: purchaseTime.toISOString(),
        expiry_time: expiryTime.toISOString(),
        is_active: true,
        auto_renewing: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'purchase_token',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store subscription');
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error verifying purchase:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
