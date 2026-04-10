import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { UpdateTagDto } from './dto/update-tag.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Patch('tags/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tagsService.update(id, dto, user.userId);
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tagsService.delete(id, user.userId);
  }

  @Post('tasks/:taskId/tags/:tagId')
  @HttpCode(HttpStatus.CREATED)
  async addTagToTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tagsService.addTagToTask(taskId, tagId, user.userId);
    return { added: true };
  }

  @Delete('tasks/:taskId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTagFromTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tagsService.removeTagFromTask(taskId, tagId, user.userId);
  }
}
