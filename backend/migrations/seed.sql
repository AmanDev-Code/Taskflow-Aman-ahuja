-- Seed data for TaskFlow
-- Run manually: psql $DATABASE_URL -f backend/migrations/seed.sql
-- Or via docker: docker compose exec db psql -U taskflow -d taskflow -f /seed.sql

-- Seed users (password for all: password123)
-- bcrypt hash generated with cost factor 12
INSERT INTO users (id, email, password_hash, name, color, created_at, updated_at)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'test@example.com',
        '$2b$12$F1FdMX0HC739SD89dgHEZuO/y2bjcXpKy6ofW.aH69pP/c4Yxi5oq',
        'Test User',
        '#6366f1',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440006',
        'alex@example.com',
        '$2b$12$F1FdMX0HC739SD89dgHEZuO/y2bjcXpKy6ofW.aH69pP/c4Yxi5oq',
        'Alex Collaborator',
        '#22c55e',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440007',
        'sam@example.com',
        '$2b$12$F1FdMX0HC739SD89dgHEZuO/y2bjcXpKy6ofW.aH69pP/c4Yxi5oq',
        'Sam Member',
        '#f59e0b',
        NOW(),
        NOW()
    )
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    color = EXCLUDED.color;

-- Test project
INSERT INTO projects (id, name, description, owner_id, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'Sample Project',
    'A sample project for testing TaskFlow',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Alex owns a separate project to validate collaborator-owned project flows
INSERT INTO projects (id, name, description, owner_id, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440016',
    'Alex Personal Project',
    'Owned by a collaborator user',
    '550e8400-e29b-41d4-a716-446655440006',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Membership setup for Sample Project (owner is implicit via projects.owner_id)
INSERT INTO project_members (id, project_id, user_id, role, created_at)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440020',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440006',
        'admin',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440021',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440007',
        'member',
        NOW()
    )
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Three tasks with different statuses (todo, in_progress, done)
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, proposed_by, creator_id, created_at, updated_at)
VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'Set up development environment',
        'Install dependencies and configure local development',
        'done',
        'high',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440006',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440001',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'Implement user authentication',
        'Add login and registration functionality',
        'in_progress',
        'high',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440007',
        NULL,
        '550e8400-e29b-41d4-a716-446655440001',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        'Write API documentation',
        'Document all REST endpoints',
        'todo',
        'medium',
        '550e8400-e29b-41d4-a716-446655440002',
        NULL,
        NULL,
        '550e8400-e29b-41d4-a716-446655440001',
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Multi-assignee links aligned with project onboarding
INSERT INTO task_assignees (task_id, user_id, created_at)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440006',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440006',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440007',
        NOW()
    )
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Predefined tags for the test project
INSERT INTO tags (id, project_id, name, color, created_at)
VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440010',
        '550e8400-e29b-41d4-a716-446655440002',
        'feature',
        '#22c55e',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440011',
        '550e8400-e29b-41d4-a716-446655440002',
        'bug',
        '#ef4444',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440012',
        '550e8400-e29b-41d4-a716-446655440002',
        'frontend',
        '#3b82f6',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440013',
        '550e8400-e29b-41d4-a716-446655440002',
        'backend',
        '#8b5cf6',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440014',
        '550e8400-e29b-41d4-a716-446655440002',
        'urgent',
        '#f97316',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440015',
        '550e8400-e29b-41d4-a716-446655440002',
        'documentation',
        '#6b7280',
        NOW()
    )
ON CONFLICT (project_id, name) DO UPDATE SET color = EXCLUDED.color;

-- Associate some tags with tasks
INSERT INTO task_tags (task_id, tag_id)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440010'),
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440010'),
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440013'),
    ('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440015')
ON CONFLICT (task_id, tag_id) DO NOTHING;
