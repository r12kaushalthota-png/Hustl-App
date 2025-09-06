export type TaskStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type TaskCategory = string; // Plain text, not enum
export type TaskUrgency = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  store: string;
  dropoff_address: string;
  dropoff_instructions: string;
  urgency: TaskUrgency;
  reward_cents: number;
  estimated_minutes: number;
  status: TaskStatus;
  user_accept_code: string | null;
  created_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  category: TaskCategory;
  store: string;
  dropoff_address: string;
  dropoff_instructions: string;
  urgency: TaskUrgency;
  reward_cents: number;
  estimated_minutes: number;
}

export interface UpdateTaskData {
  status?: TaskStatus;
  accepted_by?: string | null;
  updated_at?: string;
}


export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  major: string | null;
  university: string | null;
  class_year: string | null;
  bio: string | null;
  is_verified: boolean;
  completed_tasks_count: number;
  response_rate: number;
  xp: number;
  level: number;
  credits: number;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  task_id: string | null;
  review_id: string | null;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earned' | 'spent' | 'purchased';
  reason: string;
  task_id: string | null;
  created_at: string;
}

export interface TaskReview {
  id: string;
  task_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string;
  tags: string[];
  created_at: string;
  edited_at: string | null;
  is_hidden: boolean;
  task?: {
    id: string;
    title: string;
    category: TaskCategory;
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
  ratings_breakdown: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  recent_reviews: TaskReview[];
  updated_at: string;
}

export interface CreateReviewData {
  taskId: string;
  stars: number;
  comment?: string;
  tags?: string[];
}

export interface EditReviewData {
  reviewId: string;
  stars: number;
  comment?: string;
  tags?: string[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: 'TASK_POSTED' | 'TASK_ACCEPTED' | 'TASK_UPDATED';
  title: string;
  body: string;
  task_id: string | null;
  meta: Record<string, any>;
  is_read: boolean;
  created_at: string;
}