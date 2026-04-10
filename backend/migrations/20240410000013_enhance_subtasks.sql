-- migrate:up

-- Add task-like fields to subtasks
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS status task_status NOT NULL DEFAULT 'todo';
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS priority task_priority NOT NULL DEFAULT 'medium';
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS time_estimate INTEGER;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS sprint_points INTEGER;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id);

-- Create subtask assignees table (similar to task_assignees)
CREATE TABLE IF NOT EXISTS subtask_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subtask_id, user_id)
);

-- Create subtask tags table (similar to task_tags)
CREATE TABLE IF NOT EXISTS subtask_tags (
    subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (subtask_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subtask_assignees_subtask ON subtask_assignees(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignees_user ON subtask_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_subtask_tags_subtask ON subtask_tags(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_tags_tag ON subtask_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_priority ON subtasks(priority);
CREATE INDEX IF NOT EXISTS idx_subtasks_due_date ON subtasks(due_date);

-- migrate:down
DROP INDEX IF EXISTS idx_subtasks_due_date;
DROP INDEX IF EXISTS idx_subtasks_priority;
DROP INDEX IF EXISTS idx_subtasks_status;
DROP INDEX IF EXISTS idx_subtask_tags_tag;
DROP INDEX IF EXISTS idx_subtask_tags_subtask;
DROP INDEX IF EXISTS idx_subtask_assignees_user;
DROP INDEX IF EXISTS idx_subtask_assignees_subtask;

DROP TABLE IF EXISTS subtask_tags;
DROP TABLE IF EXISTS subtask_assignees;

ALTER TABLE subtasks DROP COLUMN IF EXISTS creator_id;
ALTER TABLE subtasks DROP COLUMN IF EXISTS sprint_points;
ALTER TABLE subtasks DROP COLUMN IF EXISTS time_spent;
ALTER TABLE subtasks DROP COLUMN IF EXISTS time_estimate;
ALTER TABLE subtasks DROP COLUMN IF EXISTS start_date;
ALTER TABLE subtasks DROP COLUMN IF EXISTS due_date;
ALTER TABLE subtasks DROP COLUMN IF EXISTS priority;
ALTER TABLE subtasks DROP COLUMN IF EXISTS status;
ALTER TABLE subtasks DROP COLUMN IF EXISTS description;
