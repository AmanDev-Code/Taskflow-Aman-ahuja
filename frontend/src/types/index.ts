export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  color: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  time_spent?: number;
  sprint_points?: number;
  position: number;
  creator_id?: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  assignees: TaskAssignee[];
  parent_task_title?: string;
  project_id?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberResponse {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
  user_name: string;
  user_email: string;
  user_avatar_url?: string;
  user_color?: string;
}

export interface ProjectMember {
  id: string;
  user: User;
  role: 'owner' | 'member';
}

export function mapProjectMember(response: ProjectMemberResponse): ProjectMember {
  return {
    id: response.id,
    role: response.role,
    user: {
      id: response.user_id,
      name: response.user_name,
      email: response.user_email,
      avatar_url: response.user_avatar_url,
      color: response.user_color || '#6366F1',
      created_at: response.created_at,
    },
  };
}

export type TaskStatus = 
  | 'todo'
  | 'backlog' 
  | 'bugs' 
  | 'pipeline_ready' 
  | 'ux_bugs' 
  | 'in_progress' 
  | 'dev_done' 
  | 'testing' 
  | 'done'
  | 'deployed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface StatusConfig {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
  dotColor: string;
}

export const STATUS_CONFIG: StatusConfig[] = [
  { id: 'todo', title: 'TO DO', color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.1)', dotColor: '#6366F1' },
  { id: 'backlog', title: 'BACKLOG', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)', dotColor: '#6B7280' },
  { id: 'bugs', title: 'BUGS', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)', dotColor: '#EF4444' },
  { id: 'pipeline_ready', title: 'PIPELINE READY', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)', dotColor: '#8B5CF6' },
  { id: 'ux_bugs', title: 'UX BUGS', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.1)', dotColor: '#F97316' },
  { id: 'in_progress', title: 'IN PROGRESS', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)', dotColor: '#3B82F6' },
  { id: 'dev_done', title: 'DEV DONE', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)', dotColor: '#10B981' },
  { id: 'testing', title: 'TESTING', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)', dotColor: '#F59E0B' },
  { id: 'done', title: 'DONE', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.1)', dotColor: '#22C55E' },
  { id: 'deployed', title: 'DEPLOYED', color: '#059669', bgColor: 'rgba(5, 150, 105, 0.1)', dotColor: '#059669' },
];

export const getStatusConfig = (status: TaskStatus): StatusConfig => {
  return STATUS_CONFIG.find(s => s.id === status) || STATUS_CONFIG[0];
};

export interface TaskAssignee {
  user_id: string;
  user_name: string;
  user_avatar_url?: string;
  user_color?: string;
}

export interface TaskProposer {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  creator_id: string;
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  time_spent?: number;
  sprint_points?: number;
  position: number;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  assignees: TaskAssignee[];
  proposed_by?: string;
  proposer?: TaskProposer | null;
  subtasks?: Subtask[];
  subtask_count?: number;
  completed_subtask_count?: number;
  attachment_count?: number;
  comment_count?: number;
  // Legacy fields for backwards compatibility
  assignee_id?: string;
  assignee_name?: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
  uploader_email?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_ids?: string[];
  tag_ids?: string[];
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  sprint_points?: number;
  proposed_by?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_ids?: string[];
  tag_ids?: string[];
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  time_spent?: number;
  sprint_points?: number;
  position?: number;
  proposed_by?: string;
}

export interface CreateSubtaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  sprint_points?: number;
  assignee_ids?: string[];
  tag_ids?: string[];
}

export interface UpdateSubtaskInput {
  title?: string;
  description?: string;
  completed?: boolean;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  time_spent?: number;
  sprint_points?: number;
  position?: number;
  assignee_ids?: string[];
  tag_ids?: string[];
}

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

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
  metadata: {
    old_value?: string | null;
    new_value?: string | null;
    field?: string;
  } | null;
  created_at: string;
  user_name: string;
  user_avatar_url: string | null;
  user_color: string;
}

export interface CreateActivityInput {
  type: ActivityType;
  content?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserInput {
  name?: string;
  color?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TimerStatus {
  isRunning: boolean;
  startedAt: string | null;
  elapsedMinutes: number;
  totalTimeSpent: number;
}
