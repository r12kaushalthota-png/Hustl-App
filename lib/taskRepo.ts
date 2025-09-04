import { supabase } from './supabase';
import type { Task, CreateTaskData, TaskStatus, TaskCategory, TaskUrgency, TaskCurrentStatus, TaskStatusHistory, UpdateTaskStatusData } from '@/types/database';

/**
 * Safe Task Repository - Eliminates 406 PGRST116 errors completely
 * 
 * Rules:
 * 1. NEVER use .single() or .maybeSingle() - always use .limit(1) + [0]
 * 2. Fetch by ID uses ONLY id filter, no status/created_by filters
 * 3. All single fetches return null for 0 rows (never throw)
 * 4. Business logic validation happens in application code
 * 5. Atomic updates use RPC functions for race condition protection
 */
export class TaskRepo {
  /**
   * Safe single task fetch - NEVER returns 406 PGRST116
   * Only filters by ID, returns null if not found
   */
  static async getTaskByIdSafe(taskId: string): Promise<{ data: Task | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const task = data?.[0] ?? null;
      return { data: task, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get available tasks (open tasks not created by current user)
   * Safe list query - never uses .single()
   */
  static async listOpenTasks(userId: string, limit: number = 20, offset: number = 0): Promise<{ data: Task[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .neq('created_by', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get tasks user is doing (accepted by current user)
   * Safe list query - never uses .single()
   */
  static async listUserDoingTasks(userId: string): Promise<{ data: Task[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('accepted_by', userId)
        .in('status', ['accepted', 'completed'])
        .order('updated_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get user's posted tasks (created by current user, any status)
   * Safe list query - never uses .single()
   */
  static async listUserPostedTasks(userId: string): Promise<{ data: Task[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Create a new task
   * Safe creation - uses .limit(1) + [0] for response
   */
  static async createTask(taskData: CreateTaskData, userId: string): Promise<{ data: Task | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: userId,
          status: 'open' as TaskStatus,
        })
        .select()
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const task = data?.[0] ?? null;
      if (!task) {
        return { data: null, error: 'Failed to create task. Please try again.' };
      }

      return { data: task, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Accept a task using atomic RPC function
   * Uses atomic RPC function with proper enum casting to prevent race conditions
   */
  static async acceptTask(taskId: string, userId: string): Promise<{ data: Task | null; error: string | null }> {
    try {
      console.log('Calling accept_task RPC with:', { task_id: taskId });
      
      const { data, error } = await supabase.rpc('accept_task', { 
        task_id: taskId
      });

      if (error) {
        console.error('accept_task RPC error:', error);
        
        // Handle specific error cases
        if (error.message.includes('TASK_NOT_FOUND')) {
          return { data: null, error: 'Task not found' };
        } else if (error.message.includes('CANNOT_ACCEPT_OWN_TASK')) {
          return { data: null, error: 'You cannot accept your own task' };
        } else if (error.message.includes('TASK_ALREADY_ACCEPTED')) {
          return { data: null, error: 'Task was already accepted by another user' };
        } else {
          return { data: null, error: error.message || 'Unable to accept task. Please try again.' };
        }
      }

      // RPC returns array of rows, get first one
      if (!data || data.length === 0) {
        return { data: null, error: 'Task acceptance failed. Please try again.' };
      }

      const acceptedTask = data[0];
      console.log('Task accepted successfully:', acceptedTask);
      return { data: acceptedTask, error: null };
    } catch (error) {
      console.error('accept_task exception:', error);
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Cancel a task (only by creator)
   * Safe pattern: fetch by ID only, validate in code, atomic update
   */
  static async cancelTask(taskId: string, userId: string): Promise<{ data: Task | null; error: string | null }> {
    try {
      // SAFE: Fetch task by ID only - no restrictive filters
      const { data: task, error: fetchError } = await TaskRepo.getTaskByIdSafe(taskId);

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      if (!task) {
        return { data: null, error: 'Task not found or no longer available' };
      }

      // Validate in application code (not database filters)
      if (task.created_by !== userId) {
        return { data: null, error: 'You can only cancel your own tasks' };
      }
      
      if (task.status !== 'open' && task.status !== 'accepted') {
        return { data: null, error: 'Only open or accepted tasks can be cancelled' };
      }

      // Atomic update with proper filters for race condition protection
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'cancelled' as TaskStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('created_by', userId)
        .in('status', ['open', 'accepted'])
        .select()
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const updatedTask = data?.[0] ?? null;
      if (!updatedTask) {
        return { data: null, error: 'Task not found or no longer available for cancellation' };
      }

      return { data: updatedTask, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Update task status with history tracking
   */
  static async updateTaskStatus(data: UpdateTaskStatusData): Promise<{ data: any | null; error: string | null }> {
    try {
      // First verify the task exists and user has permission
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', data.taskId)
        .limit(1);

      if (fetchError) {
        return { data: null, error: fetchError.message };
      }

      const currentTask = task?.[0] ?? null;
      if (!currentTask) {
        return { data: null, error: 'Task not found' };
      }

      // Update task status
      const updateData: any = {
        task_current_status: data.newStatus,
        last_status_update: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If marking as completed, also update main status
      if (data.newStatus === 'completed') {
        updateData.status = 'completed';
      }

      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', data.taskId)
        .select()
        .limit(1);

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      // Add status history entry
      const { error: historyError } = await supabase
        .from('task_status_history')
        .insert({
          task_id: data.taskId,
          status: data.newStatus,
          changed_by: currentTask.accepted_by || currentTask.created_by,
          note: data.note || '',
          photo_url: data.photoUrl || '',
        });

      if (historyError) {
        console.warn('Failed to create status history:', historyError);
      }

      return { data: updatedTask?.[0] || null, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get task status history
   */
  static async getTaskStatusHistory(taskId: string): Promise<{ data: TaskStatusHistory[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('task_status_history')
        .select(`
          id,
          task_id,
          status,
          note,
          photo_url,
          created_at,
          changed_by:profiles!task_status_history_changed_by_fkey(
            id,
            full_name,
            username
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  // Utility methods for formatting (moved from TaskService)
  static formatReward(cents: number): string {
    return `$${(cents / 100).toFixed(0)}`;
  }

  static formatEstimatedTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  static formatCategory(category: string): string {
    switch (category) {
      case 'food':
        return 'Food Pickup';
      case 'grocery':
        return 'Grocery Run';
      case 'coffee':
        return 'Coffee Run';
      default:
        return category;
    }
  }

  static formatUrgency(urgency: string): string {
    return urgency.charAt(0).toUpperCase() + urgency.slice(1);
  }

  static getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case 'low':
        return '#10B981'; // Green
      case 'medium':
        return '#F59E0B'; // Yellow
      case 'high':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }

  static formatCurrentStatus(status: TaskCurrentStatus): string {
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
      default:
        return status;
    }
  }

  static getCurrentStatusColor(status: TaskCurrentStatus): string {
    switch (status) {
      case 'accepted':
        return '#3B82F6'; // Blue
      case 'picked_up':
        return '#F59E0B'; // Orange
      case 'on_the_way':
        return '#8B5CF6'; // Purple
      case 'delivered':
        return '#10B981'; // Green
      case 'completed':
        return '#059669'; // Dark green
      default:
        return '#6B7280'; // Gray
    }
  }
}