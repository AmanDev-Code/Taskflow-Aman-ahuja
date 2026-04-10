import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MembersService } from '../members/members.service';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TagsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly membersService: MembersService,
  ) {}

  async findAllByProject(projectId: string, userId: string): Promise<Tag[]> {
    const hasAccess = await this.membersService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    return this.db.queryMany<Tag>(
      `SELECT id, project_id, name, color, created_at
       FROM tags
       WHERE project_id = $1
       ORDER BY name ASC`,
      [projectId],
    );
  }

  async findById(id: string): Promise<Tag | null> {
    return this.db.queryOne<Tag>(
      `SELECT id, project_id, name, color, created_at
       FROM tags
       WHERE id = $1`,
      [id],
    );
  }

  async create(projectId: string, dto: CreateTagDto, userId: string): Promise<Tag> {
    const hasAccess = await this.membersService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    const existingTag = await this.db.queryOne<Tag>(
      `SELECT id FROM tags WHERE project_id = $1 AND name = $2`,
      [projectId, dto.name],
    );
    if (existingTag) {
      throw new ConflictException(`Tag "${dto.name}" already exists in this project`);
    }

    const id = uuidv4();
    const now = new Date();
    const color = dto.color || '#6366f1';

    const result = await this.db.queryOne<Tag>(
      `INSERT INTO tags (id, project_id, name, color, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, project_id, name, color, created_at`,
      [id, projectId, dto.name, color, now],
    );

    return result!;
  }

  async update(id: string, dto: UpdateTagDto, userId: string): Promise<Tag> {
    const tag = await this.findById(id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(tag.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    if (dto.name && dto.name !== tag.name) {
      const existingTag = await this.db.queryOne<Tag>(
        `SELECT id FROM tags WHERE project_id = $1 AND name = $2 AND id != $3`,
        [tag.project_id, dto.name, id],
      );
      if (existingTag) {
        throw new ConflictException(`Tag "${dto.name}" already exists in this project`);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }

    if (dto.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(dto.color);
    }

    if (updates.length === 0) {
      return tag;
    }

    values.push(id);

    const result = await this.db.queryOne<Tag>(
      `UPDATE tags
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, project_id, name, color, created_at`,
      values,
    );

    return result!;
  }

  async delete(id: string, userId: string): Promise<void> {
    const tag = await this.findById(id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(tag.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.query('DELETE FROM tags WHERE id = $1', [id]);
  }

  async addTagToTask(taskId: string, tagId: string, userId: string): Promise<void> {
    const tag = await this.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(tag.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const task = await this.db.queryOne<{ id: string; project_id: string }>(
      `SELECT id, project_id FROM tasks WHERE id = $1`,
      [taskId],
    );
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.project_id !== tag.project_id) {
      throw new ForbiddenException('Tag does not belong to the same project as the task');
    }

    const existing = await this.db.queryOne(
      `SELECT 1 FROM task_tags WHERE task_id = $1 AND tag_id = $2`,
      [taskId, tagId],
    );
    if (existing) {
      return;
    }

    await this.db.query(
      `INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)`,
      [taskId, tagId],
    );
  }

  async removeTagFromTask(taskId: string, tagId: string, userId: string): Promise<void> {
    const tag = await this.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(tag.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.query(
      `DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2`,
      [taskId, tagId],
    );
  }

  async getTagsForTask(taskId: string): Promise<Tag[]> {
    return this.db.queryMany<Tag>(
      `SELECT t.id, t.project_id, t.name, t.color, t.created_at
       FROM tags t
       JOIN task_tags tt ON t.id = tt.tag_id
       WHERE tt.task_id = $1
       ORDER BY t.name ASC`,
      [taskId],
    );
  }
}
