import { supabase } from './supabase';

export interface TaskReview {
  id: string;
  task_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  tags: string[] | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  task?: {
    id: string;
    title: string;
  };
  rater?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface UserRatingAggregate {
  user_id: string;
  average_rating: number;
  ratings_count: number;
  ratings_breakdown: Record<string, number>;
  recent_reviews: any[];
  updated_at: string;
}

export class ReviewRepo {
  /**
   * Get user's rating aggregate data
   */
  static async getUserRatingAggregate(userId: string): Promise<{ data: UserRatingAggregate | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('user_rating_aggregates')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get user's reviews with pagination and filtering
   */
  static async getUserReviews(
    userId: string, 
    limit: number = 20, 
    offset: number = 0, 
    starFilter?: number
  ): Promise<{ data: { reviews: TaskReview[]; has_more: boolean } | null; error: string | null }> {
    try {
      let query = supabase
        .from('task_reviews')
        .select(`
          *,
          task:tasks(id, title),
          rater:profiles!task_reviews_rater_id_fkey(id, full_name, username, avatar_url)
        `)
        .eq('ratee_id', userId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      // Apply star filter if provided
      if (starFilter !== undefined) {
        query = query.eq('stars', starFilter);
      }

      // Apply pagination
      query = query.range(offset, offset + limit);

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      // Check if there are more reviews
      const hasMore = data && data.length === limit + 1;
      const reviews = hasMore ? data.slice(0, -1) : (data || []);

      return { 
        data: { 
          reviews: reviews as TaskReview[], 
          has_more: hasMore || false 
        }, 
        error: null 
      };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Create a new review
   */
  static async createReview(
    taskId: string,
    raterId: string,
    rateeId: string,
    stars: number,
    comment?: string,
    tags?: string[]
  ): Promise<{ data: TaskReview | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('task_reviews')
        .insert({
          task_id: taskId,
          rater_id: raterId,
          ratee_id: rateeId,
          stars,
          comment: comment || '',
          tags: tags || [],
          is_hidden: false,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as TaskReview, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Update an existing review
   */
  static async updateReview(
    reviewId: string,
    raterId: string,
    updates: {
      stars?: number;
      comment?: string;
      tags?: string[];
    }
  ): Promise<{ data: TaskReview | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('task_reviews')
        .update({
          ...updates,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('rater_id', raterId) // Ensure only the rater can update
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as TaskReview, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Delete a review (hide it)
   */
  static async deleteReview(reviewId: string, raterId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('task_reviews')
        .update({ 
          is_hidden: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('rater_id', raterId); // Ensure only the rater can delete

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get reviews for a specific task
   */
  static async getTaskReviews(taskId: string): Promise<{ data: TaskReview[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('task_reviews')
        .select(`
          *,
          rater:profiles!task_reviews_rater_id_fkey(id, full_name, username, avatar_url),
          ratee:profiles!task_reviews_ratee_id_fkey(id, full_name, username, avatar_url)
        `)
        .eq('task_id', taskId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as TaskReview[] || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Check if user can review a task
   */
  static async canUserReviewTask(taskId: string, raterId: string): Promise<{ canReview: boolean; reason?: string }> {
    try {
      // Check if task exists and is completed
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, status, created_by, accepted_by')
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        return { canReview: false, reason: 'Task not found' };
      }

      if (task.status !== 'completed') {
        return { canReview: false, reason: 'Task must be completed to leave a review' };
      }

      // Check if user was involved in the task
      const wasInvolved = task.created_by === raterId || task.accepted_by === raterId;
      if (!wasInvolved) {
        return { canReview: false, reason: 'You can only review tasks you were involved in' };
      }

      // Check if user already reviewed this task
      const { data: existingReview } = await supabase
        .from('task_reviews')
        .select('id')
        .eq('task_id', taskId)
        .eq('rater_id', raterId)
        .maybeSingle();

      if (existingReview) {
        return { canReview: false, reason: 'You have already reviewed this task' };
      }

      return { canReview: true };
    } catch (error) {
      return { canReview: false, reason: 'Unable to verify review eligibility' };
    }
  }
}