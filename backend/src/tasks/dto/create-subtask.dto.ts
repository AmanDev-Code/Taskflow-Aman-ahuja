import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
} from 'class-validator';

export type SubtaskStatus = 'todo' | 'in_progress' | 'done' | 'backlog' | 'bugs' | 'pipeline_ready' | 'ux_bugs' | 'dev_done' | 'testing' | 'deployed';
export type SubtaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export class CreateSubtaskDto {
  @IsString()
  @MinLength(1, { message: 'title is required' })
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  status?: SubtaskStatus;

  @IsOptional()
  @IsString()
  priority?: SubtaskPriority;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  time_estimate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sprint_points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignee_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tag_ids?: string[];
}
