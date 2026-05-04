import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
interface CurrentUserPayload {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
    name: string | null;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, res: Response): Promise<{
        user: import("./auth.service").UserDto;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        user: import("./auth.service").UserDto;
    }>;
    logout(user: CurrentUserPayload, res: Response): Promise<{
        success: boolean;
    }>;
    me(user: CurrentUserPayload): Promise<import("./auth.service").UserDto>;
}
export {};
