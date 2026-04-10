-- migrate:up
ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE;

ALTER TABLE attachments
  ALTER COLUMN task_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_parent_check'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_parent_check
      CHECK (
        (task_id IS NOT NULL AND subtask_id IS NULL)
        OR (task_id IS NULL AND subtask_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attachments_subtask ON attachments(subtask_id);

-- migrate:down
DROP INDEX IF EXISTS idx_attachments_subtask;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_parent_check;
ALTER TABLE attachments DROP COLUMN IF EXISTS subtask_id;
ALTER TABLE attachments ALTER COLUMN task_id SET NOT NULL;
