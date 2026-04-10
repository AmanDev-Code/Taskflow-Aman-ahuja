export type ActivityType =
  | 'comment'
  | 'status_change'
  | 'assignee_change'
  | 'priority_change'
  | 'due_date_change'
  | 'title_change'
  | 'description_change'
  | 'created'
  | 'updated';

export interface Activity {
  id: string;
  task_id: string | null;
  subtask_id?: string | null;
  user_id: string;
  type: ActivityType;
  content: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface ActivityWithUser extends Activity {
  user_name: string;
  user_avatar_url: string | null;
  user_color: string;
}
