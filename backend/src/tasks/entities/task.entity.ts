export type TaskStatus =
  | 'backlog'
  | 'bugs'
  | 'pipeline_ready'
  | 'ux_bugs'
  | 'todo'
  | 'in_progress'
  | 'dev_done'
  | 'testing'
  | 'done'
  | 'deployed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  start_date: Date | null;
  time_estimate: number | null;
  time_spent: number;
  sprint_points: number | null;
  position: number;
  parent_task_id: string | null;
  assignee_id: string | null;
  proposed_by: string | null;
  creator_id: string;
  project_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskAssignee {
  task_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar_url: string | null;
  user_color: string;
  created_at: Date;
}

export interface TaskWithAssignee extends Task {
  assignee_name: string | null;
  proposer_id: string | null;
  proposer_name: string | null;
  proposer_avatar_url: string | null;
  proposer_color: string | null;
}

export interface TaskWithDetails extends Task {
  assignee_name: string | null;
  proposer: {
    user_id: string;
    user_name: string;
    user_avatar_url: string | null;
    user_color: string | null;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  assignees: Array<{
    user_id: string;
    user_name: string;
    user_avatar_url: string | null;
    user_color: string;
  }>;
  subtask_count: number;
  completed_subtask_count: number;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  start_date: Date | null;
  time_estimate: number | null;
  time_spent: number;
  sprint_points: number | null;
  position: number;
  creator_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubtaskWithDetails extends Subtask {
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  assignees: Array<{
    user_id: string;
    user_name: string;
    user_avatar_url: string | null;
    user_color: string;
  }>;
  parent_task_title: string;
  project_id: string;
}
