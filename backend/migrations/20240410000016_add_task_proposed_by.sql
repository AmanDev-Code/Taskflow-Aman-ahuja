-- migrate:up
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_proposed_by ON tasks(proposed_by);

-- migrate:down
DROP INDEX IF EXISTS idx_tasks_proposed_by;

ALTER TABLE tasks
DROP COLUMN IF EXISTS proposed_by;
