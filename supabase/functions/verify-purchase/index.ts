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
  // Parse PEM-formatted private key
  const pemKey = serviceAccount.private_key;
  const pemContent = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, ''); // Remove all whitespace and newlines
  
  // Convert from base64 to binary
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer, // Use binary buffer instead of text
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

// Acknowledge purchase with Google Play
async function acknowledgePurchase(
  accessToken: string,
  packageName: string,
  subscriptionId: string,
  purchaseToken: string
): Promise<void> {
  const acknowledgeUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  
  console.log(`Acknowledging purchase: ${acknowledgeUrl}`);
  
  const response = await fetch(acknowledgeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to acknowledge purchase:', errorText);
    throw new Error(`Purchase acknowledgment failed: ${response.status}`);
  }
  
  console.log('Purchase acknowledged successfully');
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

    // Extract subscription details first
    const lineItem = purchaseData.lineItems?.[0];
    const productId = lineItem?.productId || 'premium_monthly';

    // Check subscription state
    const subscriptionState = purchaseData.subscriptionState;

    if (subscriptionState === 'SUBSCRIPTION_STATE_PENDING') {
      // Store as pending in database - don't unlock premium yet
      const { error: pendingError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          purchase_token: purchaseToken,
          product_id: productId,
          purchase_time: new Date().toISOString(),
          expiry_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Placeholder
          is_active: false, // Not active yet!
          auto_renewing: false,
          purchase_state: 'pending',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'purchase_token',
        });
        
      if (pendingError) {
        console.error('Failed to store pending purchase:', pendingError);
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          pending: true,
          message: 'Payment is pending approval. Please check back in a few minutes.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate subscription state
    if (subscriptionState !== 'SUBSCRIPTION_STATE_ACTIVE') {
      throw new Error(`Subscription not active. State: ${subscriptionState}`);
    }
    if (!lineItem) {
      throw new Error('No line items found in purchase data');
    }
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

    // CRITICAL: Check if purchase token is already linked to another account
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (existingSubscription && existingSubscription.user_id !== user.id) {
      console.error(`Purchase token already linked to user ${existingSubscription.user_id}, requested by ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'This purchase is already linked to another account',
          code: 'PURCHASE_ALREADY_LINKED'
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // CRITICAL: Acknowledge the purchase with Google Play
    // If we don't do this within 3 days, Google will refund the user
    await acknowledgePurchase(accessToken, packageName, productId, purchaseToken);

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
        acknowledged_at: new Date().toISOString(),
        purchase_state: 'active',
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
    
    // Convert technical errors to user-friendly messages
    let userMessage = 'Unable to verify your purchase. Please try again.';
    
    if (error instanceof Error) {
      const technicalMsg = error.message.toLowerCase();
      
      if (technicalMsg.includes('unauthorized')) {
        userMessage = 'Please sign in again to complete your purchase.';
      } else if (technicalMsg.includes('expired')) {
        userMessage = 'This subscription has expired. Please purchase a new one.';
      } else if (technicalMsg.includes('invalid product')) {
        userMessage = 'This product is not available. Please contact support.';
      } else if (technicalMsg.includes('not active')) {
        userMessage = 'This subscription is not active yet. Please wait a moment and try again.';
      } else if (technicalMsg.includes('failed to store')) {
        userMessage = 'Purchase verified but failed to save. Please contact support.';
      }
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
