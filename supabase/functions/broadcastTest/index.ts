import { corsHeaders } from '../_shared/cors.ts';

interface TestNotificationRequest {
  message?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message = 'Test notification from Hustl!' }: TestNotificationRequest = await req.json();

    // Get current user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract user ID from JWT (simplified - in production use proper JWT parsing)
    const token = authHeader.replace('Bearer ', '');
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify token and get user ID
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': token,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = await userResponse.json();
    const userId = user.id;

    // Get user's push tokens
    const tokensResponse = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tokensResponse.ok) {
      throw new Error('Failed to fetch push tokens');
    }

    const subscriptions = await tokensResponse.json();

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No push tokens found for user' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create test messages
    const messages = subscriptions.map((sub: any) => ({
      to: sub.expo_token,
      title: 'Hustl Test Notification',
      body: message,
      data: {
        taskId: 'test',
        type: 'TEST',
      },
      sound: 'default',
      ...(sub.platform === 'android' && { channelId: 'default' }),
    }));

    // Send to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      throw new Error(`Expo Push API error: ${response.statusText}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ 
        message: 'Test notification sent',
        recipients: subscriptions.length,
        result: result.data
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in broadcastTest function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});