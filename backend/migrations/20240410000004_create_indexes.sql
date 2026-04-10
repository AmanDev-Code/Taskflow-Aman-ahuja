-- migrate:up
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- migrate:down
DROP INDEX idx_users_email;
DROP INDEX idx_projects_owner_id;
DROP INDEX idx_tasks_project_id;
DROP INDEX idx_tasks_assignee_id;
DROP INDEX idx_tasks_status;
DROP INDEX idx_tasks_due_date;
