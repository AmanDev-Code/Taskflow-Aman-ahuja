import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, CreateCommentDto } from './dto/create-activity.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('tasks/:taskId/activities')
  async findAllForTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.activitiesService.findAllByTask(taskId, user.userId);
  }

  @Get('subtasks/:subtaskId/activities')
  async findAllForSubtask(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.activitiesService.findAllBySubtask(subtaskId, user.userId);
  }

  @Post('tasks/:taskId/activities')
  async createForTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.activitiesService.create(taskId, dto, user.userId);
  }

  @Post('subtasks/:subtaskId/activities')
  async createForSubtask(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.activitiesService.createForSubtask(subtaskId, dto, user.userId);
  }

  @Post('tasks/:taskId/activities/comments')
  async createCommentForTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.activitiesService.createComment(taskId, dto, user.userId);
  }

  @Post('subtasks/:subtaskId/activities/comments')
  async createCommentForSubtask(
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.activitiesService.createCommentForSubtask(subtaskId, dto, user.userId);
  }
}
