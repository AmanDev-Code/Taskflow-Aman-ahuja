import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MembersService } from '../members/members.service';
import { EventsService } from '../events/events.service';
import { ActivitiesService } from '../activities/activities.service';
import { Task, TaskWithAssignee, TaskWithDetails, Subtask, SubtaskWithDetails, TaskAssignee } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TasksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly membersService: MembersService,
    private readonly eventsService: EventsService,
    @Inject(forwardRef(() => ActivitiesService))
    private readonly activitiesService: ActivitiesService,
  ) {}

  async create(
    projectId: string,
    dto: CreateTaskDto,
    userId: string,
  ): Promise<Task> {
    const hasAccess = await this.membersService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    const id = uuidv4();
    const now = new Date();

    const primaryAssigneeId =
      dto.assignee_id ||
      (dto.assignee_ids && dto.assignee_ids.length > 0 ? dto.assignee_ids[0] : null);

    await this.validateProjectAssignees(projectId, [
      ...(primaryAssigneeId ? [primaryAssigneeId] : []),
      ...(dto.assignee_ids || []),
    ]);

    const result = await this.db.queryOne<Task>(
      `INSERT INTO tasks (
         id, title, description, status, priority, due_date, start_date,
         time_estimate, sprint_points, parent_task_id,
         assignee_id, proposed_by, creator_id, project_id, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id, title, description, status, priority, due_date, start_date,
                 time_estimate, time_spent, sprint_points, position, parent_task_id,
                 assignee_id, proposed_by, creator_id, project_id, created_at, updated_at`,
      [
        id,
        dto.title,
        dto.description || null,
        dto.status || 'todo',
        dto.priority || 'medium',
        dto.due_date || null,
        dto.start_date || null,
        dto.time_estimate || null,
        dto.sprint_points || null,
        dto.parent_task_id || null,
        primaryAssigneeId,
        dto.proposed_by || null,
        userId,
        projectId,
        now,
        now,
      ],
    );

    if (dto.assignee_ids !== undefined) {
      for (const assigneeId of dto.assignee_ids) {
        await this.db.query(
          `INSERT INTO task_assignees (task_id, user_id, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (task_id, user_id) DO NOTHING`,
          [id, assigneeId],
        );
      }
    }

    if (dto.tag_ids !== undefined) {
      for (const tagId of dto.tag_ids) {
        await this.db.query(
          `INSERT INTO task_tags (task_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (task_id, tag_id) DO NOTHING`,
          [id, tagId],
        );
      }
    }

    this.eventsService.emit({
      type: 'task_created',
      projectId,
      taskId: id,
      data: result,
      userId,
    });

    await this.activitiesService.createSystemActivity(id, userId, 'created');

    return this.findByIdWithDetails(id, userId);
  }

  async findAllByProject(
    projectId: string,
    userId: string,
    filters: TaskFilterDto,
  ): Promise<{
    items: TaskWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const hasAccess = await this.membersService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['t.project_id = $1'];
    const values: any[] = [projectId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`t.status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.assignee) {
      conditions.push(`t.assignee_id = $${paramIndex++}`);
      values.push(filters.assignee);
    }

    if (filters.priority) {
      conditions.push(`t.priority = $${paramIndex++}`);
      values.push(filters.priority);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tasks t WHERE ${whereClause}`,
      values.slice(0, paramIndex - 1),
    );
    const total = parseInt(countResult?.count || '0', 10);

    const tasks = await this.db.queryMany<TaskWithAssignee>(
      `SELECT t.id, t.title, t.description, t.status, t.priority,
              t.due_date, t.start_date, t.time_estimate, t.time_spent,
              t.sprint_points, t.position, t.parent_task_id,
              t.assignee_id, t.proposed_by, t.creator_id, t.project_id,
              t.created_at, t.updated_at,
              u.name as assignee_name,
              pu.id as proposer_id,
              pu.name as proposer_name,
              pu.avatar_url as proposer_avatar_url,
              pu.color as proposer_color
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users pu ON t.proposed_by = pu.id
       WHERE ${whereClause}
       ORDER BY t.position ASC, t.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    const items: TaskWithDetails[] = await Promise.all(
      tasks.map(async (task) => {
        const [tags, assignees, subtaskCounts] = await Promise.all([
          this.getTagsForTask(task.id),
          this.getAssigneesForTask(task.id),
          this.getSubtaskCounts(task.id),
        ]);

        return {
          ...task,
          proposer: task.proposer_id
            ? {
                user_id: task.proposer_id,
                user_name: task.proposer_name || '',
                user_avatar_url: task.proposer_avatar_url,
                user_color: task.proposer_color,
              }
            : null,
          tags,
          assignees,
          subtask_count: subtaskCounts.total,
          completed_subtask_count: subtaskCounts.completed,
        };
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Task | null> {
    return this.db.queryOne<Task>(
      `SELECT id, title, description, status, priority, due_date, start_date,
              time_estimate, time_spent, sprint_points, position, parent_task_id,
              assignee_id, proposed_by, creator_id, project_id, created_at, updated_at
       FROM tasks
       WHERE id = $1`,
      [id],
    );
  }

  async findByIdWithDetails(id: string, userId: string): Promise<TaskWithDetails> {
    const task = await this.db.queryOne<TaskWithAssignee>(
      `SELECT t.id, t.title, t.description, t.status, t.priority,
              t.due_date, t.start_date, t.time_estimate, t.time_spent,
              t.sprint_points, t.position, t.parent_task_id,
              t.assignee_id, t.proposed_by, t.creator_id, t.project_id,
              t.created_at, t.updated_at,
              u.name as assignee_name,
              pu.id as proposer_id,
              pu.name as proposer_name,
              pu.avatar_url as proposer_avatar_url,
              pu.color as proposer_color
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users pu ON t.proposed_by = pu.id
       WHERE t.id = $1`,
      [id],
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const [tags, assignees, subtaskCounts] = await Promise.all([
      this.getTagsForTask(task.id),
      this.getAssigneesForTask(task.id),
      this.getSubtaskCounts(task.id),
    ]);

    return {
      ...task,
      proposer: task.proposer_id
        ? {
            user_id: task.proposer_id,
            user_name: task.proposer_name || '',
            user_avatar_url: task.proposer_avatar_url,
            user_color: task.proposer_color,
          }
        : null,
      tags,
      assignees,
      subtask_count: subtaskCounts.total,
      completed_subtask_count: subtaskCounts.completed,
    };
  }

  async update(id: string, dto: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const normalizedPrimaryAssignee =
      dto.assignee_ids !== undefined && dto.assignee_id === undefined
        ? (dto.assignee_ids[0] || null)
        : dto.assignee_id;

    await this.validateProjectAssignees(task.project_id, [
      ...(normalizedPrimaryAssignee ? [normalizedPrimaryAssignee] : []),
      ...(dto.assignee_ids || []),
    ]);

    const [oldAssigneesSnapshot, oldTagsSnapshot] = await Promise.all([
      this.getAssigneesForTask(id),
      this.getTagsForTask(id),
    ]);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(dto.title);
    }

    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }

    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(dto.status);
    }

    if (dto.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(dto.priority);
    }

    if (dto.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(dto.due_date);
    }

    if (dto.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(dto.start_date);
    }

    if (dto.time_estimate !== undefined) {
      updates.push(`time_estimate = $${paramIndex++}`);
      values.push(dto.time_estimate);
    }

    if (dto.time_spent !== undefined) {
      updates.push(`time_spent = $${paramIndex++}`);
      values.push(dto.time_spent);
    }

    if (dto.sprint_points !== undefined) {
      updates.push(`sprint_points = $${paramIndex++}`);
      values.push(dto.sprint_points);
    }

    if (dto.position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      values.push(dto.position);
    }

    if (normalizedPrimaryAssignee !== undefined) {
      updates.push(`assignee_id = $${paramIndex++}`);
      values.push(normalizedPrimaryAssignee);
    }

    if (dto.proposed_by !== undefined) {
      updates.push(`proposed_by = $${paramIndex++}`);
      values.push(dto.proposed_by);
    }

    if (dto.parent_task_id !== undefined) {
      updates.push(`parent_task_id = $${paramIndex++}`);
      values.push(dto.parent_task_id);
    }

    let result: Task;

    if (updates.length > 0) {
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

      result = (await this.db.queryOne<Task>(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
         RETURNING id, title, description, status, priority, due_date, start_date,
                   time_estimate, time_spent, sprint_points, position, parent_task_id,
                 assignee_id, proposed_by, creator_id, project_id, created_at, updated_at`,
      values,
      ))!;
    } else {
      result = task;
    }

    // Handle assignee_ids - bulk update task assignees
    if (dto.assignee_ids !== undefined) {
      // Remove all existing assignees
      await this.db.query('DELETE FROM task_assignees WHERE task_id = $1', [id]);
      
      // Add new assignees
      for (const assigneeId of dto.assignee_ids) {
        await this.db.query(
          `INSERT INTO task_assignees (task_id, user_id, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (task_id, user_id) DO NOTHING`,
          [id, assigneeId],
        );
      }
    }

    // Handle tag_ids - bulk update task tags
    if (dto.tag_ids !== undefined) {
      // Remove all existing tags
      await this.db.query('DELETE FROM task_tags WHERE task_id = $1', [id]);
      
      // Add new tags
      for (const tagId of dto.tag_ids) {
        await this.db.query(
          `INSERT INTO task_tags (task_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (task_id, tag_id) DO NOTHING`,
          [id, tagId],
        );
      }
    }

    this.eventsService.emit({
      type: 'task_updated',
      projectId: task.project_id,
      taskId: id,
      data: result,
      userId,
    });

    // Create activity records for tracked changes
    await this.createChangeActivities(
      id,
      task,
      dto,
      userId,
      oldAssigneesSnapshot,
      oldTagsSnapshot,
    );

    return this.findByIdWithDetails(id, userId);
  }

  private async createChangeActivities(
    taskId: string,
    oldTask: Task,
    dto: UpdateTaskDto,
    userId: string,
    oldAssigneesSnapshot: Array<{
      user_id: string;
      user_name: string;
      user_avatar_url: string | null;
      user_color: string;
    }>,
    oldTagsSnapshot: Array<{ id: string; name: string; color: string }>,
  ): Promise<void> {
    const activityPromises: Promise<void>[] = [];

    const createFieldActivity = (field: string, oldValue: unknown, newValue: unknown): void => {
      activityPromises.push(
        this.activitiesService.createSystemActivity(taskId, userId, 'updated', {
          field,
          old_value: oldValue === undefined ? null : oldValue,
          new_value: newValue === undefined ? null : newValue,
        }),
      );
    };

    if (dto.title !== undefined && dto.title !== oldTask.title) {
      createFieldActivity('title', oldTask.title, dto.title);
    }

    if (dto.description !== undefined && dto.description !== oldTask.description) {
      createFieldActivity('description', oldTask.description, dto.description);
    }

    if (dto.status !== undefined && dto.status !== oldTask.status) {
      activityPromises.push(
        this.activitiesService.createSystemActivity(taskId, userId, 'status_change', {
          old_value: oldTask.status,
          new_value: dto.status,
        }),
      );
    }

    if (dto.priority !== undefined && dto.priority !== oldTask.priority) {
      activityPromises.push(
        this.activitiesService.createSystemActivity(taskId, userId, 'priority_change', {
          old_value: oldTask.priority,
          new_value: dto.priority,
        }),
      );
    }

    if (dto.due_date !== undefined) {
      const oldDate = oldTask.due_date ? new Date(oldTask.due_date).toISOString().split('T')[0] : null;
      const newDate = dto.due_date ? new Date(dto.due_date).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) {
        activityPromises.push(
          this.activitiesService.createSystemActivity(taskId, userId, 'due_date_change', {
            old_value: oldDate,
            new_value: newDate,
          }),
        );
      }
    }

    if (dto.start_date !== undefined) {
      const oldDate = oldTask.start_date ? new Date(oldTask.start_date).toISOString().split('T')[0] : null;
      const newDate = dto.start_date ? new Date(dto.start_date).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) {
        createFieldActivity('start_date', oldDate, newDate);
      }
    }

    if (dto.time_estimate !== undefined && dto.time_estimate !== oldTask.time_estimate) {
      createFieldActivity('time_estimate', oldTask.time_estimate, dto.time_estimate);
    }

    if (dto.time_spent !== undefined && dto.time_spent !== oldTask.time_spent) {
      createFieldActivity('time_spent', oldTask.time_spent, dto.time_spent);
    }

    if (dto.sprint_points !== undefined && dto.sprint_points !== oldTask.sprint_points) {
      createFieldActivity('sprint_points', oldTask.sprint_points, dto.sprint_points);
    }

    if (dto.proposed_by !== undefined && dto.proposed_by !== oldTask.proposed_by) {
      createFieldActivity('proposed_by', oldTask.proposed_by, dto.proposed_by);
    }

    if (dto.parent_task_id !== undefined && dto.parent_task_id !== oldTask.parent_task_id) {
      createFieldActivity('parent_task_id', oldTask.parent_task_id, dto.parent_task_id);
    }

    if (dto.position !== undefined && dto.position !== oldTask.position) {
      createFieldActivity('position', oldTask.position, dto.position);
    }

    if (dto.assignee_ids !== undefined) {
      const oldAssigneeIds = oldAssigneesSnapshot.map(a => a.user_id).sort();
      const newAssigneeIds = [...dto.assignee_ids].sort();
      
      if (JSON.stringify(oldAssigneeIds) !== JSON.stringify(newAssigneeIds)) {
        const oldNames = oldAssigneesSnapshot.map(a => a.user_name);
        const newAssigneeNames = await this.getAssigneeNames(dto.assignee_ids);
        
        activityPromises.push(
          this.activitiesService.createSystemActivity(taskId, userId, 'assignee_change', {
            old_value: oldNames.length > 0 ? oldNames.join(', ') : null,
            new_value: newAssigneeNames.length > 0 ? newAssigneeNames.join(', ') : null,
          }),
        );
      }
    }

    if (dto.tag_ids !== undefined) {
      const oldTagIds = oldTagsSnapshot.map((tag) => tag.id).sort();
      const newTagIds = [...dto.tag_ids].sort();

      if (JSON.stringify(oldTagIds) !== JSON.stringify(newTagIds)) {
        const newTags = dto.tag_ids.length > 0 ? await this.getTagNames(dto.tag_ids) : [];
        createFieldActivity(
          'tags',
          oldTagsSnapshot.map((tag) => tag.name).join(', ') || null,
          newTags.join(', ') || null,
        );
      }
    }

    await Promise.all(activityPromises);
  }

  private async getAssigneeNames(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    
    const users = await this.db.queryMany<{ name: string }>(
      `SELECT name FROM users WHERE id = ANY($1)`,
      [userIds],
    );
    return users.map(u => u.name);
  }

  private async getTagNames(tagIds: string[]): Promise<string[]> {
    if (tagIds.length === 0) return [];

    const tags = await this.db.queryMany<{ name: string }>(
      `SELECT name FROM tags WHERE id = ANY($1)`,
      [tagIds],
    );
    return tags.map((t) => t.name);
  }

  async delete(id: string, userId: string): Promise<void> {
    const task = await this.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const role = await this.membersService.getMemberRole(task.project_id, userId);
    const isCreator = task.creator_id === userId;

    if (role !== 'owner' && role !== 'admin' && !isCreator) {
      throw new ForbiddenException(
        'Only the project owner, admin, or task creator can delete this task',
      );
    }

    await this.db.query('DELETE FROM tasks WHERE id = $1', [id]);

    this.eventsService.emit({
      type: 'task_deleted',
      projectId: task.project_id,
      taskId: id,
      userId,
    });
  }

  private async getTagsForTask(taskId: string): Promise<Array<{ id: string; name: string; color: string }>> {
    return this.db.queryMany(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN task_tags tt ON t.id = tt.tag_id
       WHERE tt.task_id = $1
       ORDER BY t.name ASC`,
      [taskId],
    );
  }

  private async getAssigneesForTask(taskId: string): Promise<Array<{
    user_id: string;
    user_name: string;
    user_avatar_url: string | null;
    user_color: string;
  }>> {
    return this.db.queryMany(
      `SELECT ta.user_id, u.name as user_name, u.avatar_url as user_avatar_url, u.color as user_color
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = $1
       ORDER BY ta.created_at ASC`,
      [taskId],
    );
  }

  private async getSubtaskCounts(taskId: string): Promise<{ total: number; completed: number }> {
    const result = await this.db.queryOne<{ total: string; completed: string }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE completed = true) as completed
       FROM subtasks
       WHERE task_id = $1`,
      [taskId],
    );
    return {
      total: parseInt(result?.total || '0', 10),
      completed: parseInt(result?.completed || '0', 10),
    };
  }

  async addAssignee(taskId: string, assigneeUserId: string, userId: string): Promise<void> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const assigneeHasAccess = await this.membersService.hasProjectAccess(task.project_id, assigneeUserId);
    if (!assigneeHasAccess) {
      throw new ForbiddenException('User is not a member of this project');
    }

    const existing = await this.db.queryOne(
      `SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2`,
      [taskId, assigneeUserId],
    );
    if (existing) {
      return;
    }

    await this.db.query(
      `INSERT INTO task_assignees (task_id, user_id, created_at) VALUES ($1, $2, $3)`,
      [taskId, assigneeUserId, new Date()],
    );
  }

  async removeAssignee(taskId: string, assigneeUserId: string, userId: string): Promise<void> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.query(
      `DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2`,
      [taskId, assigneeUserId],
    );
  }

  async findSubtasks(taskId: string, userId: string): Promise<SubtaskWithDetails[]> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const subtasks = await this.db.queryMany<Subtask & { parent_task_title: string; project_id: string }>(
      `SELECT s.id, s.task_id, s.title, s.description, s.completed, s.status, s.priority,
              s.due_date, s.start_date, s.time_estimate, s.time_spent, s.sprint_points,
              s.position, s.creator_id, s.created_at, s.updated_at,
              t.title as parent_task_title, t.project_id
       FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.task_id = $1
       ORDER BY s.position ASC, s.created_at ASC`,
      [taskId],
    );

    return Promise.all(
      subtasks.map(async (subtask) => {
        const [tags, assignees] = await Promise.all([
          this.getTagsForSubtask(subtask.id),
          this.getAssigneesForSubtask(subtask.id),
        ]);

        return {
          ...subtask,
          tags,
          assignees,
        };
      }),
    );
  }

  async findSubtaskById(subtaskId: string, userId: string): Promise<SubtaskWithDetails> {
    const subtask = await this.db.queryOne<Subtask & { parent_task_title: string; project_id: string }>(
      `SELECT s.id, s.task_id, s.title, s.description, s.completed, s.status, s.priority,
              s.due_date, s.start_date, s.time_estimate, s.time_spent, s.sprint_points,
              s.position, s.creator_id, s.created_at, s.updated_at,
              t.title as parent_task_title, t.project_id
       FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.id = $1`,
      [subtaskId],
    );

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(subtask.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const [tags, assignees] = await Promise.all([
      this.getTagsForSubtask(subtask.id),
      this.getAssigneesForSubtask(subtask.id),
    ]);

    return {
      ...subtask,
      tags,
      assignees,
    };
  }

  private async getTagsForSubtask(subtaskId: string): Promise<Array<{ id: string; name: string; color: string }>> {
    return this.db.queryMany(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN subtask_tags st ON t.id = st.tag_id
       WHERE st.subtask_id = $1
       ORDER BY t.name ASC`,
      [subtaskId],
    );
  }

  private async getAssigneesForSubtask(subtaskId: string): Promise<Array<{
    user_id: string;
    user_name: string;
    user_avatar_url: string | null;
    user_color: string;
  }>> {
    return this.db.queryMany(
      `SELECT sa.user_id, u.name as user_name, u.avatar_url as user_avatar_url, u.color as user_color
       FROM subtask_assignees sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.subtask_id = $1
       ORDER BY sa.assigned_at ASC`,
      [subtaskId],
    );
  }

  async createSubtask(taskId: string, dto: CreateSubtaskDto, userId: string): Promise<SubtaskWithDetails> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    await this.validateProjectAssignees(task.project_id, dto.assignee_ids || []);

    const id = uuidv4();
    const now = new Date();

    let position = dto.position;
    if (position === undefined) {
      const maxPosition = await this.db.queryOne<{ max_pos: string }>(
        `SELECT COALESCE(MAX(position), -1) as max_pos FROM subtasks WHERE task_id = $1`,
        [taskId],
      );
      position = parseInt(maxPosition?.max_pos || '0', 10) + 1;
    }

    await this.db.queryOne<Subtask>(
      `INSERT INTO subtasks (
         id, task_id, title, description, completed, status, priority,
         due_date, start_date, time_estimate, sprint_points,
         position, creator_id, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        id,
        taskId,
        dto.title,
        dto.description || null,
        false,
        dto.status || 'todo',
        dto.priority || 'medium',
        dto.due_date || null,
        dto.start_date || null,
        dto.time_estimate || null,
        dto.sprint_points || null,
        position,
        userId,
        now,
        now,
      ],
    );

    if (dto.assignee_ids?.length) {
      for (const assigneeId of dto.assignee_ids) {
        await this.db.query(
          `INSERT INTO subtask_assignees (id, subtask_id, user_id, assigned_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (subtask_id, user_id) DO NOTHING`,
          [uuidv4(), id, assigneeId],
        );
      }
    }

    if (dto.tag_ids?.length) {
      for (const tagId of dto.tag_ids) {
        await this.db.query(
          `INSERT INTO subtask_tags (subtask_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (subtask_id, tag_id) DO NOTHING`,
          [id, tagId],
        );
      }
    }

    await this.activitiesService.createSystemActivity(id, userId, 'created');

    return this.findSubtaskById(id, userId);
  }

  async updateSubtask(subtaskId: string, dto: UpdateSubtaskDto, userId: string): Promise<SubtaskWithDetails> {
    const subtask = await this.db.queryOne<Subtask & { project_id: string }>(
      `SELECT s.*, t.project_id
       FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.id = $1`,
      [subtaskId],
    );

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(subtask.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    if (dto.assignee_ids !== undefined) {
      await this.validateProjectAssignees(subtask.project_id, dto.assignee_ids);
    }

    const [oldAssigneesSnapshot, oldTagsSnapshot] = await Promise.all([
      this.getAssigneesForSubtask(subtaskId),
      this.getTagsForSubtask(subtaskId),
    ]);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(dto.title);
    }

    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }

    if (dto.completed !== undefined) {
      updates.push(`completed = $${paramIndex++}`);
      values.push(dto.completed);
    }

    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(dto.status);
    }

    if (dto.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(dto.priority);
    }

    if (dto.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(dto.due_date);
    }

    if (dto.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(dto.start_date);
    }

    if (dto.time_estimate !== undefined) {
      updates.push(`time_estimate = $${paramIndex++}`);
      values.push(dto.time_estimate);
    }

    if (dto.time_spent !== undefined) {
      updates.push(`time_spent = $${paramIndex++}`);
      values.push(dto.time_spent);
    }

    if (dto.sprint_points !== undefined) {
      updates.push(`sprint_points = $${paramIndex++}`);
      values.push(dto.sprint_points);
    }

    if (dto.position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      values.push(dto.position);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(subtaskId);

      await this.db.queryOne<Subtask>(
        `UPDATE subtasks
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values,
      );
    }

    if (dto.assignee_ids !== undefined) {
      await this.db.query('DELETE FROM subtask_assignees WHERE subtask_id = $1', [subtaskId]);
      for (const assigneeId of dto.assignee_ids) {
        await this.db.query(
          `INSERT INTO subtask_assignees (id, subtask_id, user_id, assigned_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (subtask_id, user_id) DO NOTHING`,
          [uuidv4(), subtaskId, assigneeId],
        );
      }
    }

    if (dto.tag_ids !== undefined) {
      await this.db.query('DELETE FROM subtask_tags WHERE subtask_id = $1', [subtaskId]);
      for (const tagId of dto.tag_ids) {
        await this.db.query(
          `INSERT INTO subtask_tags (subtask_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (subtask_id, tag_id) DO NOTHING`,
          [subtaskId, tagId],
        );
      }
    }

    await this.createSubtaskChangeActivities(
      subtaskId,
      subtask,
      dto,
      userId,
      oldAssigneesSnapshot,
      oldTagsSnapshot,
    );

    return this.findSubtaskById(subtaskId, userId);
  }

  private async createSubtaskChangeActivities(
    subtaskId: string,
    oldSubtask: Subtask,
    dto: UpdateSubtaskDto,
    userId: string,
    oldAssigneesSnapshot: Array<{
      user_id: string;
      user_name: string;
      user_avatar_url: string | null;
      user_color: string;
    }>,
    oldTagsSnapshot: Array<{ id: string; name: string; color: string }>,
  ): Promise<void> {
    const activityPromises: Promise<void>[] = [];
    const createFieldActivity = (field: string, oldValue: unknown, newValue: unknown): void => {
      activityPromises.push(
        this.activitiesService.createSystemActivity(subtaskId, userId, 'updated', {
          field,
          old_value: oldValue === undefined ? null : oldValue,
          new_value: newValue === undefined ? null : newValue,
        }),
      );
    };

    if (dto.title !== undefined && dto.title !== oldSubtask.title) createFieldActivity('title', oldSubtask.title, dto.title);
    if (dto.description !== undefined && dto.description !== oldSubtask.description) createFieldActivity('description', oldSubtask.description, dto.description);
    if (dto.completed !== undefined && dto.completed !== oldSubtask.completed) createFieldActivity('completed', oldSubtask.completed, dto.completed);

    if (dto.status !== undefined && dto.status !== oldSubtask.status) {
      activityPromises.push(
        this.activitiesService.createSystemActivity(subtaskId, userId, 'status_change', {
          old_value: oldSubtask.status,
          new_value: dto.status,
        }),
      );
    }
    if (dto.priority !== undefined && dto.priority !== oldSubtask.priority) {
      activityPromises.push(
        this.activitiesService.createSystemActivity(subtaskId, userId, 'priority_change', {
          old_value: oldSubtask.priority,
          new_value: dto.priority,
        }),
      );
    }

    if (dto.due_date !== undefined) {
      const oldDate = oldSubtask.due_date ? new Date(oldSubtask.due_date).toISOString().split('T')[0] : null;
      const newDate = dto.due_date ? new Date(dto.due_date).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) {
        activityPromises.push(
          this.activitiesService.createSystemActivity(subtaskId, userId, 'due_date_change', {
            old_value: oldDate,
            new_value: newDate,
          }),
        );
      }
    }

    if (dto.start_date !== undefined) {
      const oldDate = oldSubtask.start_date ? new Date(oldSubtask.start_date).toISOString().split('T')[0] : null;
      const newDate = dto.start_date ? new Date(dto.start_date).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) createFieldActivity('start_date', oldDate, newDate);
    }

    if (dto.time_estimate !== undefined && dto.time_estimate !== oldSubtask.time_estimate) createFieldActivity('time_estimate', oldSubtask.time_estimate, dto.time_estimate);
    if (dto.time_spent !== undefined && dto.time_spent !== oldSubtask.time_spent) createFieldActivity('time_spent', oldSubtask.time_spent, dto.time_spent);
    if (dto.sprint_points !== undefined && dto.sprint_points !== oldSubtask.sprint_points) createFieldActivity('sprint_points', oldSubtask.sprint_points, dto.sprint_points);
    if (dto.position !== undefined && dto.position !== oldSubtask.position) createFieldActivity('position', oldSubtask.position, dto.position);

    if (dto.assignee_ids !== undefined) {
      const oldAssigneeIds = oldAssigneesSnapshot.map((a) => a.user_id).sort();
      const newAssigneeIds = [...dto.assignee_ids].sort();
      if (JSON.stringify(oldAssigneeIds) !== JSON.stringify(newAssigneeIds)) {
        const oldNames = oldAssigneesSnapshot.map((a) => a.user_name);
        const newAssigneeNames = await this.getAssigneeNames(dto.assignee_ids);
        activityPromises.push(
          this.activitiesService.createSystemActivity(subtaskId, userId, 'assignee_change', {
            old_value: oldNames.length > 0 ? oldNames.join(', ') : null,
            new_value: newAssigneeNames.length > 0 ? newAssigneeNames.join(', ') : null,
          }),
        );
      }
    }

    if (dto.tag_ids !== undefined) {
      const oldTagIds = oldTagsSnapshot.map((tag) => tag.id).sort();
      const newTagIds = [...dto.tag_ids].sort();
      if (JSON.stringify(oldTagIds) !== JSON.stringify(newTagIds)) {
        const newTags = dto.tag_ids.length > 0 ? await this.getTagNames(dto.tag_ids) : [];
        createFieldActivity(
          'tags',
          oldTagsSnapshot.map((tag) => tag.name).join(', ') || null,
          newTags.join(', ') || null,
        );
      }
    }

    await Promise.all(activityPromises);
  }

  async deleteSubtask(subtaskId: string, userId: string): Promise<void> {
    const subtask = await this.db.queryOne<{ id: string; project_id: string }>(
      `SELECT s.id, t.project_id
       FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.id = $1`,
      [subtaskId],
    );

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(subtask.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.query('DELETE FROM subtasks WHERE id = $1', [subtaskId]);
  }

  async startTimer(taskId: string, userId: string): Promise<{ startedAt: string }> {
    const task = await this.findById(taskId);
    if (!task) {
      return this.startSubtaskTimer(taskId, userId);
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const existing = await this.db.queryOne<{ id: string; started_at: Date }>(
      `SELECT id, started_at FROM active_timers WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId],
    );

    if (existing) {
      return { startedAt: existing.started_at.toISOString() };
    }

    const now = new Date();
    await this.db.query(
      `INSERT INTO active_timers (id, task_id, user_id, started_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), taskId, userId, now, now],
    );

    return { startedAt: now.toISOString() };
  }

  async stopTimer(taskId: string, userId: string): Promise<{ elapsedMinutes: number; totalTimeSpent: number }> {
    const task = await this.findById(taskId);
    if (!task) {
      return this.stopSubtaskTimer(taskId, userId);
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const timer = await this.db.queryOne<{ id: string; started_at: Date }>(
      `SELECT id, started_at FROM active_timers WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId],
    );

    if (!timer) {
      return { elapsedMinutes: 0, totalTimeSpent: task.time_spent || 0 };
    }

    const elapsedMs = Date.now() - new Date(timer.started_at).getTime();
    const elapsedMinutes =
      elapsedMs > 0 ? Math.max(1, Math.ceil(elapsedMs / 60000)) : 0;

    await this.db.query('DELETE FROM active_timers WHERE id = $1', [timer.id]);

    if (elapsedMinutes > 0) {
      const updated = await this.db.queryOne<{ time_spent: number }>(
        `UPDATE tasks
         SET time_spent = COALESCE(time_spent, 0) + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING time_spent`,
        [elapsedMinutes, taskId],
      );
      return { elapsedMinutes, totalTimeSpent: updated?.time_spent || 0 };
    }

    return { elapsedMinutes, totalTimeSpent: task.time_spent || 0 };
  }

  async getTimerStatus(taskId: string, userId: string): Promise<{
    isRunning: boolean;
    startedAt: string | null;
    elapsedMinutes: number;
    totalTimeSpent: number;
  }> {
    const task = await this.findById(taskId);
    if (!task) {
      return this.getSubtaskTimerStatus(taskId, userId);
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const timer = await this.db.queryOne<{ started_at: Date }>(
      `SELECT started_at FROM active_timers WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId],
    );

    if (timer) {
      const elapsedMs = Date.now() - new Date(timer.started_at).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const totalTimeSpent = (task.time_spent || 0) + elapsedMinutes;
      return {
        isRunning: true,
        startedAt: timer.started_at.toISOString(),
        elapsedMinutes,
        totalTimeSpent,
      };
    }

    return {
      isRunning: false,
      startedAt: null,
      elapsedMinutes: 0,
      totalTimeSpent: task.time_spent || 0,
    };
  }

  async addManualTime(taskId: string, minutes: number, userId: string): Promise<{ totalTimeSpent: number }> {
    const task = await this.findById(taskId);
    if (!task) {
      return this.addManualSubtaskTime(taskId, minutes, userId);
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const newTimeSpent = (task.time_spent || 0) + minutes;

    await this.db.query(
      `UPDATE tasks SET time_spent = $1, updated_at = NOW() WHERE id = $2`,
      [newTimeSpent, taskId],
    );

    return { totalTimeSpent: newTimeSpent };
  }

  private async getSubtaskForTiming(
    subtaskId: string,
  ): Promise<{ id: string; project_id: string; time_spent: number | null } | null> {
    return this.db.queryOne<{ id: string; project_id: string; time_spent: number | null }>(
      `SELECT s.id, s.time_spent, t.project_id
       FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.id = $1`,
      [subtaskId],
    );
  }

  async startSubtaskTimer(subtaskId: string, userId: string): Promise<{ startedAt: string }> {
    const subtask = await this.getSubtaskForTiming(subtaskId);
    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(subtask.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const existing = await this.db.queryOne<{ id: string; started_at: Date }>(
      `SELECT id, started_at FROM subtask_active_timers WHERE subtask_id = $1 AND user_id = $2`,
      [subtaskId, userId],
    );

    if (existing) {
      return { startedAt: existing.started_at.toISOString() };
    }

    const now = new Date();
    await this.db.query(
      `INSERT INTO subtask_active_timers (id, subtask_id, user_id, started_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), subtaskId, userId, now, now],
    );

    return { startedAt: now.toISOString() };
  }

  async stopSubtaskTimer(
    subtaskId: string,
    userId: string,
  ): Promise<{ elapsedMinutes: number; totalTimeSpent: number }> {
    const subtask = await this.getSubtaskForTiming(subtaskId);
    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(subtask.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const timer = await this.db.queryOne<{ id: string; started_at: Date }>(
      `SELECT id, started_at FROM subtask_active_timers WHERE subtask_id = $1 AND user_id = $2`,
      [subtaskId, userId],
    );

    if (!timer) {
      return { elapsedMinutes: 0, totalTimeSpent: subtask.time_spent || 0 };
    }

    const elapsedMs = Date.now() - new Date(timer.started_at).getTime();
    const elapsedMinutes = elapsedMs > 0 ? Math.max(1, Math.ceil(elapsedMs / 60000)) : 0;

    await this.db.query('DELETE FROM subtask_active_timers WHERE id = $1', [timer.id]);

    if (elapsedMinutes > 0) {
      const updated = await this.db.queryOne<{ time_spent: number }>(
        `UPDATE subtasks
         SET time_spent = COALESCE(time_spent, 0) + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING time_spent`,
        [elapsedMinutes, subtaskId],
      );
      return { elapsedMinutes, totalTimeSpent: updated?.time_spent || 0 };
    }

    return { elapsedMinutes, totalTimeSpent: subtask.time_spent || 0 };
  }

  async getSubtaskTimerStatus(subtaskId: string, userId: string): Promise<{
    isRunning: boolean;
    startedAt: string | null;
    elapsedMinutes: number;
    totalTimeSpent: number;
  }> {
    const subtask = await this.getSubtaskForTiming(subtaskId);
    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(subtask.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const timer = await this.db.queryOne<{ started_at: Date }>(
      `SELECT started_at FROM subtask_active_timers WHERE subtask_id = $1 AND user_id = $2`,
      [subtaskId, userId],
    );

    if (timer) {
      const elapsedMs = Date.now() - new Date(timer.started_at).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const totalTimeSpent = (subtask.time_spent || 0) + elapsedMinutes;
      return {
        isRunning: true,
        startedAt: timer.started_at.toISOString(),
        elapsedMinutes,
        totalTimeSpent,
      };
    }

    return {
      isRunning: false,
      startedAt: null,
      elapsedMinutes: 0,
      totalTimeSpent: subtask.time_spent || 0,
    };
  }

  async addManualSubtaskTime(
    subtaskId: string,
    minutes: number,
    userId: string,
  ): Promise<{ totalTimeSpent: number }> {
    const subtask = await this.getSubtaskForTiming(subtaskId);
    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(subtask.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const newTimeSpent = (subtask.time_spent || 0) + minutes;

    await this.db.query(
      `UPDATE subtasks SET time_spent = $1, updated_at = NOW() WHERE id = $2`,
      [newTimeSpent, subtaskId],
    );

    return { totalTimeSpent: newTimeSpent };
  }

  async duplicate(taskId: string, userId: string): Promise<TaskWithDetails> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const hasAccess = await this.membersService.hasProjectAccess(task.project_id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const id = uuidv4();
    const now = new Date();

    await this.db.queryOne<Task>(
      `INSERT INTO tasks (
         id, title, description, status, priority,
         due_date, start_date, time_estimate, sprint_points, parent_task_id,
         assignee_id, proposed_by, project_id, creator_id, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id,
        `Copy of ${task.title}`,
        task.description,
        task.status,
        task.priority,
        task.due_date,
        task.start_date,
        task.time_estimate,
        task.sprint_points,
        task.parent_task_id,
        task.assignee_id,
        task.proposed_by,
        task.project_id,
        userId,
        now,
        now,
      ],
    );

    const [taskAssignees, taskTags] = await Promise.all([
      this.db.queryMany<{ user_id: string }>(
        `SELECT user_id FROM task_assignees WHERE task_id = $1`,
        [taskId],
      ),
      this.db.queryMany<{ tag_id: string }>(
        `SELECT tag_id FROM task_tags WHERE task_id = $1`,
        [taskId],
      ),
    ]);

    for (const assignee of taskAssignees) {
      await this.db.query(
        `INSERT INTO task_assignees (task_id, user_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [id, assignee.user_id],
      );
    }

    for (const tag of taskTags) {
      await this.db.query(
        `INSERT INTO task_tags (task_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (task_id, tag_id) DO NOTHING`,
        [id, tag.tag_id],
      );
    }

    this.eventsService.emit({
      type: 'task_created',
      projectId: task.project_id,
      taskId: id,
      data: { duplicatedFrom: taskId },
      userId,
    });

    await this.activitiesService.createSystemActivity(id, userId, 'created');

    return this.findByIdWithDetails(id, userId);
  }

  private async validateProjectAssignees(projectId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const uniqueUserIds = [...new Set(userIds)];
    for (const assigneeId of uniqueUserIds) {
      const hasAccess = await this.membersService.hasProjectAccess(projectId, assigneeId);
      if (!hasAccess) {
        throw new ForbiddenException(
          `Assignee ${assigneeId} is not onboarded in this project`,
        );
      }
    }
  }
}
