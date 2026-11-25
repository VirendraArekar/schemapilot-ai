import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex@schemapilot.ai' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Alex Rivera' })
  @IsString()
  @MinLength(2)
  name!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alex@schemapilot.ai' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  @IsString()
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'alex@schemapilot.ai' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
