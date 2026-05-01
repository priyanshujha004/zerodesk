// P1 owns this — P2, P3, P4 import from here. Keep export name: CurrentUser
// Returns: { sub, email, role, tenantId }
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
