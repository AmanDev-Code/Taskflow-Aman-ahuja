import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { ProjectMember, ProjectMemberWithUser, MemberRole } from './entities/member.entity';
import { AddMemberDto } from './dto/add-member.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MembersService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
  ) {}

  async findAllByProject(
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberWithUser[]> {
    const hasAccess = await this.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    const members = await this.db.queryMany<ProjectMemberWithUser>(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.created_at,
              u.name as user_name, u.email as user_email, 
              u.avatar_url as user_avatar_url, u.color as user_color
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at ASC`,
      [projectId],
    );

    const project = await this.projectsService.findById(projectId);
    if (project) {
      const owner = await this.usersService.findById(project.owner_id);
      if (owner) {
        const ownerAsMember: ProjectMemberWithUser = {
          id: 'owner',
          project_id: projectId,
          user_id: owner.id,
          role: 'owner',
          created_at: project.created_at,
          user_name: owner.name,
          user_email: owner.email,
          user_avatar_url: owner.avatar_url,
          user_color: owner.color,
        };
        return [ownerAsMember, ...members];
      }
    }

    return members;
  }

  async addMember(
    projectId: string,
    dto: AddMemberDto,
    userId: string,
  ): Promise<ProjectMemberWithUser> {
    const isOwner = await this.projectsService.isOwner(projectId, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only the project owner can add members');
    }

    const userToAdd = await this.usersService.findByEmail(dto.email);
    if (!userToAdd) {
      throw new NotFoundException(`User with email ${dto.email} not found`);
    }

    const project = await this.projectsService.findById(projectId);
    if (project && project.owner_id === userToAdd.id) {
      throw new BadRequestException('Cannot add the project owner as a member');
    }

    const existingMember = await this.db.queryOne<ProjectMember>(
      `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userToAdd.id],
    );
    if (existingMember) {
      throw new ConflictException('User is already a member of this project');
    }

    const id = uuidv4();
    const now = new Date();
    const role: MemberRole = dto.role || 'member';

    await this.db.queryOne(
      `INSERT INTO project_members (id, project_id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, projectId, userToAdd.id, role, now],
    );

    return {
      id,
      project_id: projectId,
      user_id: userToAdd.id,
      role,
      created_at: now,
      user_name: userToAdd.name,
      user_email: userToAdd.email,
      user_avatar_url: userToAdd.avatar_url,
      user_color: userToAdd.color,
    };
  }

  async removeMember(
    projectId: string,
    memberUserId: string,
    userId: string,
  ): Promise<void> {
    const isOwner = await this.projectsService.isOwner(projectId, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only the project owner can remove members');
    }

    const project = await this.projectsService.findById(projectId);
    if (project && project.owner_id === memberUserId) {
      throw new BadRequestException('Cannot remove the project owner');
    }

    const result = await this.db.transaction(async (client) => {
      const deleteMemberResult = await client.query(
        `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [projectId, memberUserId],
      );

      if ((deleteMemberResult.rowCount ?? 0) > 0) {
        // Ensure removed collaborators disappear from assignment surfaces and task ownership links.
        await client.query(
          `UPDATE tasks
           SET assignee_id = NULL
           WHERE project_id = $1 AND assignee_id = $2`,
          [projectId, memberUserId],
        );
        await client.query(
          `DELETE FROM task_assignees
           USING tasks t
           WHERE task_assignees.task_id = t.id
             AND t.project_id = $1
             AND task_assignees.user_id = $2`,
          [projectId, memberUserId],
        );
        await client.query(
          `DELETE FROM subtask_assignees
           USING subtasks s
           JOIN tasks t ON s.task_id = t.id
           WHERE subtask_assignees.subtask_id = s.id
             AND t.project_id = $1
             AND subtask_assignees.user_id = $2`,
          [projectId, memberUserId],
        );
      }

      return deleteMemberResult;
    });

    if (result.rowCount === 0) {
      throw new NotFoundException('Member not found in this project');
    }
  }

  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const isOwner = await this.projectsService.isOwner(projectId, userId);
    if (isOwner) {
      return true;
    }

    const isMember = await this.db.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
       ) as exists`,
      [projectId, userId],
    );
    return isMember?.exists ?? false;
  }

  async getMemberRole(projectId: string, userId: string): Promise<MemberRole | null> {
    const isOwner = await this.projectsService.isOwner(projectId, userId);
    if (isOwner) {
      return 'owner';
    }

    const member = await this.db.queryOne<{ role: MemberRole }>(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId],
    );
    return member?.role ?? null;
  }
}
