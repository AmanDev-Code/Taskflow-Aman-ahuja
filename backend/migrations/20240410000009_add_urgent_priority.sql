-- migrate:up
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'urgent' BEFORE 'high';

-- migrate:down
-- Note: PostgreSQL doesn't support removing enum values
-- This migration is intentionally not reversible
