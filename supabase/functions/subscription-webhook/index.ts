import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Notification types from Google Play
const NOTIFICATION_TYPES: Record<number, string> = {
  1: 'RECOVERED',
  2: 'RENEWED',
  3: 'CANCELED',
  4: 'PURCHASED',
  5: 'ON_HOLD',
  6: 'IN_GRACE_PERIOD',
  7: 'RESTARTED',
  8: 'PRICE_CHANGE_CONFIRMED',
  9: 'DEFERRED',
  10: 'PAUSED',
  11: 'PAUSE_SCHEDULE_CHANGED',
  12: 'REVOKED',
  13: 'EXPIRED',
  20: 'PENDING_PURCHASE_CANCELED',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

interface PubSubMessage {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface SubscriptionNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
}

// Generate JWT for Google API authentication
async function generateGoogleApiJwt(serviceAccount: ServiceAccount): Promise<string> {
  const pemKey = serviceAccount.private_key;
  const pemContent = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
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
      exp: getNumericDate(60 * 60),
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

// Fetch subscription details from Google Play API
async function getSubscriptionDetails(
  accessToken: string,
  packageName: string,
  purchaseToken: string
): Promise<any> {
  const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  
  console.log(`Fetching subscription details: ${apiUrl}`);
  
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Play API error:', errorText);
    throw new Error(`Failed to fetch subscription: ${response.status}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Subscription Webhook Received ===');
    
    // Parse Pub/Sub message
    const pubSubMessage: PubSubMessage = await req.json();
    console.log('Pub/Sub message ID:', pubSubMessage.message?.messageId);
    
    if (!pubSubMessage.message?.data) {
      console.error('No message data in request');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Decode base64 message
    const decodedData = atob(pubSubMessage.message.data);
    const notification: SubscriptionNotification = JSON.parse(decodedData);
    
    console.log('Decoded notification:', JSON.stringify(notification, null, 2));

    // Validate package name
    if (notification.packageName !== 'in.recessclub.piggly') {
      console.warn(`Ignoring notification for package: ${notification.packageName}`);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Only process subscription notifications
    if (!notification.subscriptionNotification) {
      console.log('Not a subscription notification, ignoring');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const { notificationType, purchaseToken, subscriptionId } = notification.subscriptionNotification;
    const notificationName = NOTIFICATION_TYPES[notificationType] || `UNKNOWN_${notificationType}`;
    
    console.log(`Processing ${notificationName} (type ${notificationType}) for subscription ${subscriptionId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up existing subscription by purchase token
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (!existingSubscription) {
      console.log(`No subscription found for token ${purchaseToken.substring(0, 20)}...`);
      // For PURCHASED notifications, the verify-purchase flow handles this
      if (notificationType === 4) {
        console.log('New purchase - will be handled by verify-purchase flow');
      }
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    console.log(`Found subscription for user ${existingSubscription.user_id}`);

    // Get service account credentials
    const serviceAccountJson = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      console.error('Service account credentials not configured');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);

    // Generate JWT and get access token
    const jwt = await generateGoogleApiJwt(serviceAccount);
    const accessToken = await getGoogleAccessToken(jwt);

    // Fetch current subscription state from Google Play
    const purchaseData = await getSubscriptionDetails(
      accessToken,
      notification.packageName,
      purchaseToken
    );

    console.log('Current subscription state:', JSON.stringify(purchaseData, null, 2));

    // Extract subscription details
    const lineItem = purchaseData.lineItems?.[0];
    const subscriptionState = purchaseData.subscriptionState;
    const expiryTime = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null;
    const autoRenewing = lineItem?.autoRenewingPlan?.autoRenewEnabled ?? false;

    // Determine update values based on notification type and current state
    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    switch (notificationType) {
      case 1: // RECOVERED - Subscription recovered from account hold
        updateData.is_active = subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';
        updateData.purchase_state = 'active';
        if (expiryTime) updateData.expiry_time = expiryTime.toISOString();
        updateData.auto_renewing = autoRenewing;
        console.log('Subscription RECOVERED - reactivating');
        break;

      case 2: // RENEWED - Subscription renewed
        updateData.is_active = true;
        updateData.purchase_state = 'active';
        if (expiryTime) updateData.expiry_time = expiryTime.toISOString();
        updateData.auto_renewing = autoRenewing;
        console.log(`Subscription RENEWED - new expiry: ${expiryTime?.toISOString()}`);
        break;

      case 3: // CANCELED - User canceled, but still active until expiry
        updateData.auto_renewing = false;
        updateData.purchase_state = 'canceled';
        // Keep is_active true until actual expiry
        console.log('Subscription CANCELED - will expire at current expiry time');
        break;

      case 5: // ON_HOLD - Payment issue, subscription suspended
        updateData.is_active = false;
        updateData.purchase_state = 'on_hold';
        console.log('Subscription ON_HOLD - deactivating');
        break;

      case 6: // IN_GRACE_PERIOD - Payment failed but in grace period
        updateData.purchase_state = 'grace_period';
        // Keep active during grace period
        console.log('Subscription IN_GRACE_PERIOD - keeping active');
        break;

      case 7: // RESTARTED - User restarted subscription
        updateData.is_active = true;
        updateData.auto_renewing = true;
        updateData.purchase_state = 'active';
        if (expiryTime) updateData.expiry_time = expiryTime.toISOString();
        console.log('Subscription RESTARTED - reactivating');
        break;

      case 12: // REVOKED - Access revoked (refund, etc.)
        updateData.is_active = false;
        updateData.purchase_state = 'revoked';
        console.log('Subscription REVOKED - deactivating immediately');
        break;

      case 13: // EXPIRED - Subscription expired
        updateData.is_active = false;
        updateData.purchase_state = 'expired';
        console.log('Subscription EXPIRED - deactivating');
        break;

      default:
        // For other notification types, just update from Google's current state
        updateData.is_active = subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';
        if (expiryTime) updateData.expiry_time = expiryTime.toISOString();
        updateData.auto_renewing = autoRenewing;
        console.log(`Handling ${notificationName} - syncing state from Google`);
    }

    // Update subscription in database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('purchase_token', purchaseToken);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
    } else {
      console.log('Subscription updated successfully:', updateData);
    }

    // Always return 200 to acknowledge receipt (prevents retries)
    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 even on error to prevent infinite retries
    // Errors are logged for debugging
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});
