import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseVerificationRequest {
  purchaseToken: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

// Generate JWT for Google API authentication
async function generateGoogleApiJwt(serviceAccount: ServiceAccount): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(60 * 60), // 1 hour
      iat: getNumericDate(0),
    },
    key
  );

  return jwt;
}

// Exchange JWT for access token
async function getGoogleAccessToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get access token:', error);
    throw new Error('Failed to authenticate with Google API');
  }

  const data = await response.json();
  return data.access_token;
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

    console.log(`Verifying purchase for user ${user.id}, token: ${purchaseToken}`);

    // Get service account credentials
    const serviceAccountJson = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('Service account credentials not configured');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);

    // Generate JWT and get access token
    const jwt = await generateGoogleApiJwt(serviceAccount);
    const accessToken = await getGoogleAccessToken(jwt);

    // Verify purchase with Google Play Developer API
    const packageName = 'in.recessclub.piggly';
    const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    
    console.log(`Calling Google Play API: ${apiUrl}`);
    
    const verificationResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verificationResponse.ok) {
      const errorText = await verificationResponse.text();
      console.error('Google Play API error:', errorText);
      throw new Error(`Purchase verification failed: ${verificationResponse.status}`);
    }

    const purchaseData = await verificationResponse.json();
    console.log('Purchase data received:', JSON.stringify(purchaseData, null, 2));

    // Validate subscription state
    if (purchaseData.subscriptionState !== 'SUBSCRIPTION_STATE_ACTIVE') {
      throw new Error(`Subscription not active. State: ${purchaseData.subscriptionState}`);
    }

    // Extract subscription details
    const lineItem = purchaseData.lineItems?.[0];
    if (!lineItem) {
      throw new Error('No line items found in purchase data');
    }

    const productId = lineItem.productId;
    const expiryTime = new Date(lineItem.expiryTime);
    const autoRenewing = lineItem.autoRenewingPlan?.autoRenewEnabled ?? false;
    const purchaseTime = new Date(purchaseData.startTime || Date.now());

    // Validate product ID
    if (productId !== 'premium_monthly') {
      throw new Error(`Invalid product ID: ${productId}`);
    }

    // Validate expiry time is in the future
    if (expiryTime <= new Date()) {
      throw new Error('Subscription has already expired');
    }

    console.log(`Verified subscription: product=${productId}, expiry=${expiryTime.toISOString()}, autoRenew=${autoRenewing}`);

    // Store verified subscription in database
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        purchase_token: purchaseToken,
        product_id: productId,
        purchase_time: purchaseTime.toISOString(),
        expiry_time: expiryTime.toISOString(),
        is_active: true,
        auto_renewing: autoRenewing,
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
