import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { SubtaskStatus, SubtaskPriority } from './create-subtask.dto';

export class UpdateSubtaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

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
  @IsArray()
  @IsUUID('4', { each: true })
  assignee_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tag_ids?: string[];
}
