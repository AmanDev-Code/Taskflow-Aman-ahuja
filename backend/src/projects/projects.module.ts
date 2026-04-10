import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MembersModule } from '../members/members.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [forwardRef(() => MembersModule), TagsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
