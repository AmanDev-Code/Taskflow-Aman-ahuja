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
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { MembersService } from '../members/members.service';
import { AddMemberDto } from '../members/dto/add-member.dto';
import { TagsService } from '../tags/tags.service';
import { CreateTagDto } from '../tags/dto/create-tag.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
    private readonly tagsService: TagsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.projectsService.findAllByUser(user.userId, pagination);
  }

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.create(dto, user.userId);
  }

  /** Static path segments before generic :id (avoids shadowing /projects/:id/members) */
  @Get(':id/stats')
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.getStats(id, user.userId);
  }

  @Get(':id/members')
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.membersService.findAllByProject(id, user.userId);
  }

  @Post(':id/members')
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.membersService.addMember(id, dto, user.userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.membersService.removeMember(id, userId, user.userId);
  }

  @Get(':id/tags')
  async listTags(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tagsService.findAllByProject(id, user.userId);
  }

  @Post(':id/tags')
  async createTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTagDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tagsService.create(id, dto, user.userId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.findByIdWithTasks(id, user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.projectsService.delete(id, user.userId);
  }
}
