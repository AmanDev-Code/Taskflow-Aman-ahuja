import { Module, forwardRef } from '@nestjs/common';
import { MembersService } from './members.service';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => ProjectsModule), UsersModule],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
