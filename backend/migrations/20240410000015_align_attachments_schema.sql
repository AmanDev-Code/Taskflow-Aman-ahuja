-- migrate:up
-- Legacy 00007 used original_name, size_bytes, url; service expects original_filename, size (no url).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attachments' AND column_name = 'original_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attachments' AND column_name = 'original_filename'
  ) THEN
    ALTER TABLE attachments RENAME COLUMN original_name TO original_filename;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attachments' AND column_name = 'size_bytes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attachments' AND column_name = 'size'
  ) THEN
    ALTER TABLE attachments RENAME COLUMN size_bytes TO size;
  END IF;
END $$;

ALTER TABLE attachments DROP COLUMN IF EXISTS url;

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes if they don't exist (00007 creates idx_attachments_task, service may need idx_attachments_task_id)
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);

-- migrate:down
-- Non-reversible data migration; no-op down
