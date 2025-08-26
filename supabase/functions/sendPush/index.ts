import { corsHeaders } from '../_shared/cors.ts';

interface PushNotificationRequest {
  type: 'TASK_POSTED' | 'TASK_ACCEPTED' | 'TASK_UPDATED';
  taskId: string;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: {
    taskId: string;
    type: string;
    status?: string;
  };
  sound: string;
  channelId?: string;
}

interface PushSubscription {
  user_id: string;
  expo_token: string;
  platform: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  current_status: string;
  created_by: string;
  accepted_by: string | null;
  category: string;
  store: string;
}

interface NotificationPreferences {
  user_id: string;
  new_tasks: boolean;
  task_accepted: boolean;
  task_updates: boolean;
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
    const { type, taskId }: PushNotificationRequest = await req.json();

    if (!type || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing type or taskId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch task details
    const taskResponse = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${taskId}&select=*`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
    });

    if (!taskResponse.ok) {
      throw new Error('Failed to fetch task');
    }

    const tasks = await taskResponse.json();
    const task: Task = tasks[0];

    if (!task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine recipients based on notification type
    let recipientIds: string[] = [];

    switch (type) {
      case 'TASK_POSTED':
        // For now, send to a test audience (exclude task owner)
        // In production, this could be geo-filtered or subscription-based
        recipientIds = await getTestAudience(task.created_by);
        break;

      case 'TASK_ACCEPTED':
        // Notify task owner
        recipientIds = [task.created_by];
        break;

      case 'TASK_UPDATED':
        // Notify both owner and accepted doer
        recipientIds = [task.created_by];
        if (task.accepted_by) {
          recipientIds.push(task.accepted_by);
        }
        break;
    }

    if (recipientIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Filter recipients based on notification preferences
    const filteredRecipients = await filterByPreferences(recipientIds, type);

    if (filteredRecipients.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients with enabled preferences' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get push tokens for recipients
    const tokensResponse = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?user_id=in.(${filteredRecipients.join(',')})&select=*`,
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

    const subscriptions: PushSubscription[] = await tokensResponse.json();

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for recipients' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create notification messages
    const messages: ExpoMessage[] = subscriptions.map(sub => {
      const { title, body } = getNotificationContent(type, task);
      
      return {
        to: sub.expo_token,
        title,
        body,
        data: {
          taskId: task.id,
          type,
          status: task.current_status || task.status,
        },
        sound: 'default',
        ...(sub.platform === 'android' && { channelId: 'default' }),
      };
    });

    // Send notifications in chunks of 100
    const results = await sendNotificationsInChunks(messages);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent',
        sent: results.successful,
        failed: results.failed,
        total: messages.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in sendPush function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to get test audience (replace with geo-filtering later)
async function getTestAudience(excludeUserId: string): Promise<string[]> {
  // For now, return empty array to avoid spam
  // In production, implement geo-filtering or subscription logic
  return [];
}

// Helper function to filter recipients by notification preferences
async function filterByPreferences(userIds: string[], notificationType: string): Promise<string[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/notification_preferences?user_id=in.(${userIds.join(',')})&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return userIds; // Fallback to all users if preferences can't be fetched
    }

    const preferences: NotificationPreferences[] = await response.json();
    
    return userIds.filter(userId => {
      const userPrefs = preferences.find(p => p.user_id === userId);
      
      // If no preferences found, default to enabled
      if (!userPrefs) return true;
      
      // Check specific preference based on notification type
      switch (notificationType) {
        case 'TASK_POSTED':
          return userPrefs.new_tasks;
        case 'TASK_ACCEPTED':
          return userPrefs.task_accepted;
        case 'TASK_UPDATED':
          return userPrefs.task_updates;
        default:
          return true;
      }
    });
  } catch (error) {
    console.error('Error filtering by preferences:', error);
    return userIds; // Fallback to all users
  }
}

// Helper function to generate notification content
function getNotificationContent(type: string, task: Task): { title: string; body: string } {
  switch (type) {
    case 'TASK_POSTED':
      return {
        title: 'New task near you',
        body: `${task.title} • ${task.store}`,
      };

    case 'TASK_ACCEPTED':
      return {
        title: 'Your task was accepted!',
        body: `Someone picked up your task: ${task.title}`,
      };

    case 'TASK_UPDATED':
      const statusText = formatTaskStatus(task.current_status || task.status);
      return {
        title: 'Task update',
        body: `${task.title} • ${statusText}`,
      };

    default:
      return {
        title: 'Hustl notification',
        body: `Update for task: ${task.title}`,
      };
  }
}

// Helper function to format task status for notifications
function formatTaskStatus(status: string): string {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'picked_up':
      return 'Picked up';
    case 'on_the_way':
      return 'On the way';
    case 'delivered':
      return 'Delivered';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

// Helper function to send notifications in chunks
async function sendNotificationsInChunks(messages: ExpoMessage[]): Promise<{
  successful: number;
  failed: number;
}> {
  const CHUNK_SIZE = 100;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error(`Failed to send chunk ${i / CHUNK_SIZE + 1}:`, response.statusText);
        failed += chunk.length;
        continue;
      }

      const result = await response.json();
      
      // Count successful and failed sends
      if (Array.isArray(result.data)) {
        result.data.forEach((receipt: any) => {
          if (receipt.status === 'ok') {
            successful++;
          } else {
            failed++;
            console.error('Push notification failed:', receipt);
          }
        });
      } else {
        successful += chunk.length;
      }

    } catch (error) {
      console.error(`Error sending chunk ${i / CHUNK_SIZE + 1}:`, error);
      failed += chunk.length;
    }
  }

  return { successful, failed };
}