import { supabase } from '@/lib/supabase';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  accepted_by: string | null;
  created_at: string;
  accepted_at: string | null;
  updated_at: string;
  store: string;
  dropoff_address: string;
  dropoff_instructions: string;
  urgency: string;
  reward_cents: number;
  estimated_minutes: number;
  price_cents: number;
  location_text: string;
  task_current_status: string;
  last_status_update: string;
  assignee_id: string | null;
  phase: string;
  moderation_status: string;
  moderation_reason: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
}

/**
 * Accept a task atomically - only one user can win
 */
export async function acceptTask(taskId: string): Promise<Task> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  
  if (authErr) {
    throw new Error('Authentication error. Please sign in again.');
  }
  
  if (!user) {
    throw new Error('You must be signed in to accept tasks.');
  }

  const { data, error } = await supabase.rpc('accept_task', {
    p_task_id: taskId
  });

  if (error) {
    console.error('Accept task RPC error:', error);
    
    // Handle specific error cases
    if (String(error.message || '').includes('TASK_ALREADY_ACCEPTED')) {
      throw new Error('This task was just accepted by someone else.');
    } else if (String(error.message || '').includes('CANNOT_ACCEPT_OWN_TASK')) {
      throw new Error('You cannot accept your own task.');
    } else if (String(error.message || '').includes('TASK_NOT_FOUND')) {
      throw new Error('Task not found or no longer available.');
    } else if (String(error.message || '').includes('USER_NOT_AUTHENTICATED')) {
      throw new Error('Please sign in to accept tasks.');
    } else {
      throw new Error('Unable to accept task. Please try again.');
    }
  }

  // RPC returns array, get first item
  if (!data || data.length === 0) {
    throw new Error('Task acceptance failed. Please try again.');
  }

  return data[0] as Task;
}

/**
 * Fetch all open tasks (available for acceptance)
 */
export async function fetchOpenTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch open tasks error:', error);
    throw new Error('Failed to load available tasks. Please try again.');
  }

  return data ?? [];
}

/**
 * Fetch tasks the current user is doing (accepted by them)
 */
export async function fetchDoingTasks(): Promise<Task[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('accepted_by', user.id)
    .in('status', ['accepted', 'in_progress'])
    .order('accepted_at', { ascending: false });

  if (error) {
    console.error('Fetch doing tasks error:', error);
    throw new Error('Failed to load your tasks. Please try again.');
  }

  return data ?? [];
}

/**
 * Fetch tasks created by the current user
 */
export async function fetchMyPostedTasks(): Promise<Task[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch posted tasks error:', error);
    throw new Error('Failed to load your posted tasks. Please try again.');
  }

  return data ?? [];
}

/**
 * Create a new task
 */
export async function createTask(taskData: Partial<Task>): Promise<Task> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  
  if (authErr) {
    throw new Error('Authentication error. Please sign in again.');
  }
  
  if (!user) {
    throw new Error('You must be signed in to create tasks.');
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...taskData,
      created_by: user.id,
      status: 'open'
    })
    .select()
    .single();

  if (error) {
    console.error('Create task error:', error);
    throw new Error('Failed to create task. Please try again.');
  }

  return data as Task;
}

/**
 * Update task status (for task progression)
 */
export async function updateTaskStatus(
  taskId: string, 
  status: Task['status']
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Update task status error:', error);
    throw new Error('Failed to update task status. Please try again.');
  }

  return data as Task;
}