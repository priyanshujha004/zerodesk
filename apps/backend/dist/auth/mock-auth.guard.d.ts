import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class MockAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
