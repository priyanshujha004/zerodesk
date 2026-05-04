import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // Inject a fake CDA user — change role to test different flows
    req.user = {
      sub: 'b408d10b-3974-4ebf-a40e-3d1c8b46f94b',          // swap with actual seeded user id if needed
      role: 'DEPT_ADMIN',                   // CUSTOMER | CDA | DEPT_ADMIN | SUPER_ADMIN
      tenantId: 'tenant_shopease',    // swap with your actual tenant id from DB
      deptId: undefined,
    };

    return true;
  }
}