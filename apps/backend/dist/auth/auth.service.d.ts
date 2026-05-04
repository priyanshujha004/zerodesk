import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';
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
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    register(dto: RegisterDto): Promise<{
        user: UserDto;
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: UserDto;
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<void>;
    getMe(userId: string): Promise<UserDto>;
    private generateTokens;
    getCookieOptions(): CookieOptions;
    private toUserDto;
}
