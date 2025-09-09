import { supabase } from './supabase';
import type { Task, CreateTaskData, TaskStatus } from '@/types/database';

export class TaskRepo {
  /**
   * Get task by ID safely
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
   * List open tasks available for acceptance
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
   * List tasks user is doing (accepted by user)
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
   * List user's posted tasks
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
   * Accept a task - generates unique code and assigns to user
   */
  static async acceptTask(taskId: string, userId: string): Promise<{ data: Task | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('accept_task_atomic', { 
        p_task_id: taskId,
        p_user_id: userId
      });

      if (error) {
        console.error('accept_task_atomic RPC error:', error);
        
        // Handle specific error cases
        if (error.message.includes('TASK_NOT_FOUND')) {
          return { data: null, error: 'Task not found or no longer available' };
        } else if (error.message.includes('CANNOT_ACCEPT_OWN_TASK')) {
          return { data: null, error: 'You cannot accept your own task' };
        } else if (error.message.includes('TASK_ALREADY_ACCEPTED')) {
          return { data: null, error: 'This task was just accepted by someone else' };
        } else {
          return { data: null, error: error.message || 'Unable to accept task. Please try again.' };
        }
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        return { data: null, error: 'Task acceptance failed. Please try again.' };
      }

      const acceptedTask = data[0] as Task;
      return { data: acceptedTask, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Update task status (for basic status changes)
   */
  static async updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<{ data: Task | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('accepted_by', userId)
        .select()
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const task = data?.[0] ?? null;
      if (!task) {
        return { data: null, error: 'Task not found or you do not have permission to update it' };
      }

      return { data: task, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  // Utility formatting methods
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
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'high':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  }

  static formatStatus(status: TaskStatus): string {
    switch (status) {
      case 'open':
        return 'Open';
      case 'accepted':
        return 'Accepted';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  static getStatusColor(status: TaskStatus): string {
    switch (status) {
      case 'open':
        return '#3B82F6';
      case 'accepted':
        return '#F59E0B';
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  }
}