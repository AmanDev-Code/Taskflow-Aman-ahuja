import { Module, forwardRef } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { DatabaseModule } from '../database/database.module';
import { MembersModule } from '../members/members.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [DatabaseModule, MembersModule, forwardRef(() => TasksModule)],
  providers: [ActivitiesService],
  controllers: [ActivitiesController],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
