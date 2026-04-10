import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { TasksService } from './tasks.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { AddTimeDto } from './dto/time-tracking.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

/**
 * Route order: register paths with more static segments (e.g. tasks/:id/subtasks)
 * before generic tasks/:id so adapters like Fastify match correctly.
 */
@Controller()
export class TasksController {
  private readonly logger = new Logger(TasksController.name);
  private readonly maxAttachmentSize = 10 * 1024 * 1024;

  constructor(
    private readonly tasksService: TasksService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get('projects/:projectId/tasks')
  async findAllByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() filters: TaskFilterDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.findAllByProject(projectId, user.userId, filters);
  }

  @Post('projects/:projectId/tasks')
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.create(projectId, dto, user.userId);
  }

  // --- Nested /tasks/:taskId/* (must come before /tasks/:id) ---

  @Get('tasks/:taskId/subtasks')
  async findSubtasks(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.findSubtasks(taskId, user.userId);
  }

  @Post('tasks/:taskId/subtasks')
  async createSubtask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateSubtaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.createSubtask(taskId, dto, user.userId);
  }

  @Post('tasks/:taskId/assignees/:userId')
  @HttpCode(HttpStatus.CREATED)
  async addAssignee(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('userId', ParseUUIDPipe) assigneeUserId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tasksService.addAssignee(taskId, assigneeUserId, user.userId);
    return { added: true };
  }

  @Delete('tasks/:taskId/assignees/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAssignee(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('userId', ParseUUIDPipe) assigneeUserId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tasksService.removeAssignee(taskId, assigneeUserId, user.userId);
  }

  @Post('tasks/:taskId/time/start')
  async startTimer(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.startTimer(taskId, user.userId);
  }

  @Post('tasks/:taskId/time/stop')
  async stopTimer(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.stopTimer(taskId, user.userId);
  }

  @Get('tasks/:taskId/time/status')
  async getTimerStatus(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.getTimerStatus(taskId, user.userId);
  }

  @Post('tasks/:taskId/time/add')
  async addManualTime(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AddTimeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.addManualTime(taskId, dto.minutes, user.userId);
  }

  @Post('subtasks/:subtaskId/time/start')
  async startSubtaskTimer(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.startSubtaskTimer(subtaskId, user.userId);
  }

  @Post('subtasks/:subtaskId/time/stop')
  async stopSubtaskTimer(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.stopSubtaskTimer(subtaskId, user.userId);
  }

  @Get('subtasks/:subtaskId/time/status')
  async getSubtaskTimerStatus(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.getSubtaskTimerStatus(subtaskId, user.userId);
  }

  @Post('subtasks/:subtaskId/time/add')
  async addManualSubtaskTime(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Body() dto: AddTimeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.addManualSubtaskTime(subtaskId, dto.minutes, user.userId);
  }

  /** Registered on TasksController so Fastify matches before generic GET /tasks/:id */
  @Post('tasks/:taskId/attachments')
  async uploadTaskAttachment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: FastifyRequest,
  ) {
    await this.tasksService.findByIdWithDetails(taskId, user.userId);
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const buffer = await file.toBuffer();
    if (buffer.length > this.maxAttachmentSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    this.logger.log(`Uploading file: ${file.filename} for task: ${taskId}`);
    return this.attachmentsService.uploadFile(taskId, user.userId, {
      filename: file.filename,
      mimetype: file.mimetype,
      data: buffer,
    });
  }

  @Get('tasks/:taskId/attachments')
  async listTaskAttachments(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tasksService.findByIdWithDetails(taskId, user.userId);
    return this.attachmentsService.getAttachmentsByTaskId(taskId);
  }

  @Post('subtasks/:subtaskId/attachments')
  async uploadSubtaskAttachment(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: FastifyRequest,
  ) {
    await this.tasksService.findSubtaskById(subtaskId, user.userId);
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const buffer = await file.toBuffer();
    if (buffer.length > this.maxAttachmentSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    this.logger.log(`Uploading file: ${file.filename} for subtask: ${subtaskId}`);
    return this.attachmentsService.uploadFileForSubtask(subtaskId, user.userId, {
      filename: file.filename,
      mimetype: file.mimetype,
      data: buffer,
    });
  }

  @Get('subtasks/:subtaskId/attachments')
  async listSubtaskAttachments(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tasksService.findSubtaskById(subtaskId, user.userId);
    return this.attachmentsService.getAttachmentsBySubtaskId(subtaskId);
  }

  @Post('tasks/:taskId/duplicate')
  async duplicate(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.duplicate(taskId, user.userId);
  }

  // --- Generic task by id ---

  @Get('tasks/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.findByIdWithDetails(id, user.userId);
  }

  @Patch('tasks/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.update(id, dto, user.userId);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tasksService.delete(id, user.userId);
  }

  @Get('subtasks/:id')
  async findSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.findSubtaskById(id, user.userId);
  }

  @Patch('subtasks/:id')
  async updateSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubtaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.updateSubtask(id, dto, user.userId);
  }

  @Delete('subtasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tasksService.deleteSubtask(id, user.userId);
  }
}
