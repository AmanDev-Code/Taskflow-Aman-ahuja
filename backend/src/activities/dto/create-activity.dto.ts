import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ActivityType } from '../entities/activity.entity';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['comment', 'status_change', 'assignee_change', 'priority_change', 'due_date_change', 'title_change', 'description_change', 'created', 'updated'])
  type: ActivityType;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
