import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

enum Role {
  CUSTOMER = 'CUSTOMER',
  CDA = 'CDA',
  DEPT_ADMIN = 'DEPT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
