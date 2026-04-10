import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class TaskFilterDto {
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done'], {
    message: 'status must be one of: todo, in_progress, done',
  })
  status?: TaskStatus;

  @IsOptional()
  @IsUUID('4', { message: 'assignee must be a valid UUID' })
  assignee?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'], {
    message: 'priority must be one of: low, medium, high',
  })
  priority?: TaskPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
