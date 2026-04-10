import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(100, { message: 'New password must not exceed 100 characters' })
  newPassword: string;

  @IsString()
  @MinLength(1, { message: 'Password confirmation is required' })
  confirmPassword: string;
}
