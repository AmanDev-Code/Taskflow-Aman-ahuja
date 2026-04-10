-- migrate:up

CREATE TABLE active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

CREATE INDEX idx_active_timers_task ON active_timers(task_id);
CREATE INDEX idx_active_timers_user ON active_timers(user_id);

-- migrate:down
DROP INDEX IF EXISTS idx_active_timers_user;
DROP INDEX IF EXISTS idx_active_timers_task;
DROP TABLE IF EXISTS active_timers;
