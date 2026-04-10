import { IsString, IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class CreateAttachmentDto {
  @IsUUID()
  task_id: string;

  @IsString()
  filename: string;

  @IsString()
  original_filename: string;

  @IsString()
  mime_type: string;

  @IsInt()
  @Min(1)
  size: number;
}
