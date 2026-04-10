export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: Date;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}
