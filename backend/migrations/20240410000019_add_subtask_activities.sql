-- migrate:up
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE;

ALTER TABLE activities
  ALTER COLUMN task_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activities_parent_check'
  ) THEN
    ALTER TABLE activities
      ADD CONSTRAINT activities_parent_check
      CHECK (
        (task_id IS NOT NULL AND subtask_id IS NULL)
        OR (task_id IS NULL AND subtask_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activities_subtask ON activities(subtask_id);

-- migrate:down
DROP INDEX IF EXISTS idx_activities_subtask;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_parent_check;
ALTER TABLE activities DROP COLUMN IF EXISTS subtask_id;
ALTER TABLE activities ALTER COLUMN task_id SET NOT NULL;
