-- migrate:up
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'backlog' BEFORE 'todo';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'bugs' AFTER 'backlog';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'pipeline_ready' AFTER 'bugs';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'ux_bugs' AFTER 'pipeline_ready';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'dev_done' AFTER 'in_progress';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'testing' AFTER 'dev_done';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'deployed' AFTER 'done';

-- migrate:down
-- Note: PostgreSQL doesn't support removing enum values
