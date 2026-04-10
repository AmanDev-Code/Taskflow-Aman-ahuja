import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(
    [
      'backlog',
      'bugs',
      'pipeline_ready',
      'ux_bugs',
      'todo',
      'in_progress',
      'dev_done',
      'testing',
      'done',
      'deployed',
    ],
    {
      message:
        'status must be one of: backlog, bugs, pipeline_ready, ux_bugs, todo, in_progress, dev_done, testing, done, deployed',
    },
  )
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'], {
    message: 'priority must be one of: low, medium, high, urgent',
  })
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString({}, { message: 'due_date must be a valid ISO date string' })
  due_date?: string;

  @IsOptional()
  @IsDateString({}, { message: 'start_date must be a valid ISO date string' })
  start_date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  time_estimate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  time_spent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sprint_points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsUUID('4', { message: 'assignee_id must be a valid UUID' })
  assignee_id?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'proposed_by must be a valid UUID' })
  proposed_by?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'parent_task_id must be a valid UUID' })
  parent_task_id?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'each assignee_id must be a valid UUID' })
  assignee_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'each tag_id must be a valid UUID' })
  tag_ids?: string[];
}
