-- migrate:up

CREATE TABLE subtask_active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subtask_id, user_id)
);

CREATE INDEX idx_subtask_active_timers_subtask ON subtask_active_timers(subtask_id);
CREATE INDEX idx_subtask_active_timers_user ON subtask_active_timers(user_id);

-- migrate:down
DROP INDEX IF EXISTS idx_subtask_active_timers_user;
DROP INDEX IF EXISTS idx_subtask_active_timers_subtask;
DROP TABLE IF EXISTS subtask_active_timers;
