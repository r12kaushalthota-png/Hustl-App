export type TaskStatus = 'open' | 'accepted' | 'completed' | 'cancelled';
export type TaskCategory = 'food' | 'grocery' | 'coffee';
export type TaskUrgency = 'low' | 'medium' | 'high';

export interface Task {
  long_pickup: number;
  lat_pickup: number;
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
  created_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  user_accept_code: string | null;
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

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  major: string | null;
  university: string | null;
  created_at: string;
  updated_at: string;
}