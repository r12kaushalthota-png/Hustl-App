import { corsHeaders } from '../_shared/cors.ts';

interface CreateNotificationRequest {
  type: 'TASK_POSTED' | 'TASK_ACCEPTED' | 'TASK_UPDATED';
  taskId: string;
  recipientIds?: string[];
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { type, taskId, recipientIds }: CreateNotificationRequest = await req.json();

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

    // Determine recipients and notification content
    let recipients: string[] = [];
    let title: string;
    let body: string;
    let meta: any = {};

    switch (type) {
      case 'TASK_POSTED':
        // Use provided recipients or get test audience
        if (recipientIds && recipientIds.length > 0) {
          recipients = recipientIds;
        } else {
          recipients = await getTestAudience(task.created_by);
        }
        title = 'New task near you';
        body = `${task.title} • ${task.store}`;
        meta = { category: task.category };
        break;

      case 'TASK_ACCEPTED':
        recipients = [task.created_by];
        title = 'Your task was accepted!';
        body = `Someone picked up your task: ${task.title}`;
        meta = { accepted_by: task.accepted_by };
        break;

      case 'TASK_UPDATED':
        recipients = [task.created_by];
        if (task.accepted_by && task.accepted_by !== task.created_by) {
          recipients.push(task.accepted_by);
        }
        
        const statusText = formatTaskStatus(task.current_status || task.status);
        title = 'Task update';
        body = `${task.title} • ${statusText}`;
        meta = { status: task.status, current_status: task.current_status };
        break;
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create notifications for each recipient
    const notifications = recipients.map(userId => ({
      user_id: userId,
      type,
      title,
      body,
      task_id: taskId,
      meta,
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    // Insert notifications
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(notifications),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      throw new Error(`Failed to create notifications: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications created',
        count: notifications.length,
        recipients: recipients.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in createNotifications function:', error);
    
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
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // For demo: get first 10 users who aren't the task creator
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=neq.${excludeUserId}&select=id&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const profiles = await response.json();
    return profiles.map((p: any) => p.id);
  } catch (error) {
    console.error('Error getting test audience:', error);
    return [];
  }
}

// Helper function to format task status
function formatTaskStatus(status: string): string {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'picked_up':
      return 'Picked Up';
    case 'on_the_way':
      return 'On the Way';
    case 'delivered':
      return 'Delivered';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'open':
      return 'Open';
    default:
      return status;
  }
}