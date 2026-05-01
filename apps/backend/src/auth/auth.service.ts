import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CookieOptions } from 'express';

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string;
  deptId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: UserDto; accessToken: string; refreshToken: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Default to first tenant if not provided
    let tenantId = dto.tenantId;
    if (!tenantId) {
      const firstTenant = await this.prisma.tenant.findFirst();
      if (!firstTenant) throw new NotFoundException('No tenant found');
      tenantId = firstTenant.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name ?? null,
        role: (dto.role as never) ?? 'CUSTOMER',
        tenantId,
      },
    });

    const tokens = await this.generateTokens(user);
    return { user: this.toUserDto(user), ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: UserDto; accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);
    return { user: this.toUserDto(user), ...tokens };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUserDto(user);
  }

  private async generateTokens(user: { id: string; email: string; role: string; tenantId: string; name: string | null }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    };
  }

  private toUserDto(user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    tenantId: string;
    deptId: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      deptId: user.deptId,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
