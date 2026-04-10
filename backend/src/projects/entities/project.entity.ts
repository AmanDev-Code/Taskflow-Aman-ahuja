import { Task } from '../../tasks/entities/task.entity';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

export interface ProjectStats {
  total_tasks: number;
  by_status: Record<string, number>;
  by_assignee: Array<{
    assignee_id: string | null;
    assignee_name: string;
    count: number;
  }>;
}
