import { Module, forwardRef } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { MembersModule } from '../members/members.module';
import { ActivitiesModule } from '../activities/activities.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [MembersModule, forwardRef(() => ActivitiesModule), AttachmentsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
