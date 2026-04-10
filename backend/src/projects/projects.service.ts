import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Project, ProjectWithTasks, ProjectStats } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { v4 as uuidv4 } from 'uuid';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateProjectDto, userId: string): Promise<Project> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.db.queryOne<Project>(
      `INSERT INTO projects (id, name, description, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, owner_id, created_at, updated_at`,
      [id, dto.name, dto.description || null, userId, now, now],
    );

    return result!;
  }

  async findAllByUser(
    userId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Project>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT p.id) as count
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE p.owner_id = $1 OR pm.user_id = $1`,
      [userId],
    );
    const total = parseInt(countResult?.count || '0', 10);

    const items = await this.db.queryMany<Project>(
      `SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at, p.updated_at
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Project | null> {
    return this.db.queryOne<Project>(
      `SELECT id, name, description, owner_id, created_at, updated_at
       FROM projects
       WHERE id = $1`,
      [id],
    );
  }

  async findByIdWithTasks(
    id: string,
    userId: string,
  ): Promise<ProjectWithTasks> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const hasAccess = await this.hasProjectAccess(id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const tasks = await this.db.queryMany(
      `SELECT t.id, t.title, t.description, t.status, t.priority, 
              t.due_date, t.assignee_id, t.creator_id, t.project_id,
              t.created_at, t.updated_at,
              u.name as assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [id],
    );

    return {
      ...project,
      tasks,
    };
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.owner_id !== userId) {
      throw new ForbiddenException('Only the owner can update this project');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }

    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }

    if (updates.length === 0) {
      return project;
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const result = await this.db.queryOne<Project>(
      `UPDATE projects
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, owner_id, created_at, updated_at`,
      values,
    );

    return result!;
  }

  async delete(id: string, userId: string): Promise<void> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.owner_id !== userId) {
      throw new ForbiddenException('Only the owner can delete this project');
    }

    await this.db.transaction(async (client) => {
      await client.query('DELETE FROM tasks WHERE project_id = $1', [id]);
      await client.query('DELETE FROM projects WHERE id = $1', [id]);
    });
  }

  async isOwner(projectId: string, userId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ is_owner: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
       ) as is_owner`,
      [projectId, userId],
    );
    return result?.is_owner ?? false;
  }

  async getStats(projectId: string, userId: string): Promise<ProjectStats> {
    const project = await this.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const hasAccess = await this.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const byStatus = await this.db.queryMany<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM tasks
       WHERE project_id = $1
       GROUP BY status`,
      [projectId],
    );

    const byAssignee = await this.db.queryMany<{
      assignee_id: string | null;
      assignee_name: string | null;
      count: string;
    }>(
      `SELECT t.assignee_id, u.name as assignee_name, COUNT(*) as count
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.project_id = $1
       GROUP BY t.assignee_id, u.name`,
      [projectId],
    );

    const totalResult = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tasks WHERE project_id = $1`,
      [projectId],
    );

    const statusCounts: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
    };

    byStatus.forEach((row) => {
      statusCounts[row.status] = parseInt(row.count, 10);
    });

    const assigneeCounts = byAssignee.map((row) => ({
      assignee_id: row.assignee_id,
      assignee_name: row.assignee_name || 'Unassigned',
      count: parseInt(row.count, 10),
    }));

    return {
      total_tasks: parseInt(totalResult?.count || '0', 10),
      by_status: statusCounts,
      by_assignee: assigneeCounts,
    };
  }

  private async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ has_access: boolean }>(
      `SELECT EXISTS(
         SELECT 1
         FROM projects p
         LEFT JOIN project_members pm ON pm.project_id = p.id
         WHERE p.id = $1
           AND (p.owner_id = $2 OR pm.user_id = $2)
       ) as has_access`,
      [projectId, userId],
    );
    return result?.has_access ?? false;
  }
}
