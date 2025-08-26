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

export interface NotificationFilters {
  limit?: number;
  cursor?: string;
  type?: NotificationItem['type'];
  is_read?: boolean;
}

export interface NotificationResponse {
  data: NotificationItem[];
  hasMore: boolean;
  nextCursor?: string;
}