import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MembersService } from '../members/members.service';
import { TasksService } from '../tasks/tasks.service';
import { Activity, ActivityWithUser, ActivityType } from './entities/activity.entity';
import { CreateActivityDto, CreateCommentDto } from './dto/create-activity.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly membersService: MembersService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
  ) {}

  private async resolveTarget(
    id: string,
    userId: string,
    preferred: 'task' | 'subtask',
  ): Promise<{ kind: 'task' | 'subtask'; id: string }> {
    if (preferred === 'task') {
      const task = await this.tasksService.findById(id);
      if (task) {
        const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
        if (!hasAccess) throw new ForbiddenException('Access denied to this project');
        return { kind: 'task', id };
      }
    }

    const subtask = await this.tasksService.findSubtaskById(id, userId).catch(() => null);
    if (subtask) {
      return { kind: 'subtask', id };
    }

    if (preferred === 'subtask') {
      const task = await this.tasksService.findById(id);
      if (task) {
        const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
        if (!hasAccess) throw new ForbiddenException('Access denied to this project');
        return { kind: 'task', id };
      }
    }

    throw new NotFoundException('Task not found');
  }

  async create(
    taskId: string,
    dto: CreateActivityDto,
    userId: string,
  ): Promise<ActivityWithUser> {
    const target = await this.resolveTarget(taskId, userId, 'task');

    const id = uuidv4();
    const now = new Date();

    await this.db.query(
      `INSERT INTO activities (id, task_id, subtask_id, user_id, type, content, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        target.kind === 'task' ? target.id : null,
        target.kind === 'subtask' ? target.id : null,
        userId,
        dto.type,
        dto.content || null,
        dto.metadata ? JSON.stringify(dto.metadata) : null,
        now,
      ],
    );

    const activity = await this.findById(id);
    return activity!;
  }

  async createComment(
    taskId: string,
    dto: CreateCommentDto,
    userId: string,
  ): Promise<ActivityWithUser> {
    const target = await this.resolveTarget(taskId, userId, 'task');

    const id = uuidv4();
    const now = new Date();

    await this.db.query(
      `INSERT INTO activities (id, task_id, subtask_id, user_id, type, content, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, target.kind === 'task' ? target.id : null, target.kind === 'subtask' ? target.id : null, userId, 'comment', dto.content, null, now],
    );

    const activity = await this.findById(id);
    return activity!;
  }

  async findById(id: string): Promise<ActivityWithUser | null> {
    return this.db.queryOne<ActivityWithUser>(
      `SELECT a.id, a.task_id, a.subtask_id, a.user_id, a.type, a.content, a.metadata, a.created_at,
              u.name as user_name, u.avatar_url as user_avatar_url, u.color as user_color
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [id],
    );
  }

  async findAllByTask(
    taskId: string,
    userId: string,
  ): Promise<ActivityWithUser[]> {
    const target = await this.resolveTarget(taskId, userId, 'task');

    return this.db.queryMany<ActivityWithUser>(
      `SELECT a.id, a.task_id, a.subtask_id, a.user_id, a.type, a.content, a.metadata, a.created_at,
              u.name as user_name, u.avatar_url as user_avatar_url, u.color as user_color
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE ${target.kind === 'task' ? 'a.task_id = $1' : 'a.subtask_id = $1'}
       ORDER BY a.created_at ASC`,
      [target.id],
    );
  }

  async findAllBySubtask(subtaskId: string, userId: string): Promise<ActivityWithUser[]> {
    return this.findAllByTask(subtaskId, userId);
  }

  async createForSubtask(
    subtaskId: string,
    dto: CreateActivityDto,
    userId: string,
  ): Promise<ActivityWithUser> {
    return this.create(subtaskId, dto, userId);
  }

  async createCommentForSubtask(
    subtaskId: string,
    dto: CreateCommentDto,
    userId: string,
  ): Promise<ActivityWithUser> {
    return this.createComment(subtaskId, dto, userId);
  }

  async createSystemActivity(
    taskId: string,
    userId: string,
    type: ActivityType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const target = await this.resolveTarget(taskId, userId, 'task');
    const id = uuidv4();
    const now = new Date();

    await this.db.query(
      `INSERT INTO activities (id, task_id, subtask_id, user_id, type, content, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        target.kind === 'task' ? target.id : null,
        target.kind === 'subtask' ? target.id : null,
        userId,
        type,
        null,
        metadata ? JSON.stringify(metadata) : null,
        now,
      ],
    );
  }

  async getActivitiesByTask(taskId: string): Promise<ActivityWithUser[]> {
    return this.db.queryMany<ActivityWithUser>(
      `SELECT a.id, a.task_id, a.subtask_id, a.user_id, a.type, a.content, a.metadata, a.created_at,
              u.name as user_name, u.avatar_url as user_avatar_url, u.color as user_color
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE a.task_id = $1
       ORDER BY a.created_at ASC`,
      [taskId],
    );
  }
}
