import { IsEmail, IsOptional, IsEnum } from 'class-validator';
import { MemberRole } from '../entities/member.entity';

export class AddMemberDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @IsOptional()
  @IsEnum(['admin', 'member'], {
    message: 'role must be one of: admin, member',
  })
  role?: MemberRole;
}
