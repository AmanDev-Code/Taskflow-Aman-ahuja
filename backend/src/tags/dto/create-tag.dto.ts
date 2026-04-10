import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1, { message: 'name is required' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #6366f1)' })
  color?: string;
}
