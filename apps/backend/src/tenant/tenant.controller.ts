import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface CurrentUserPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  name: string | null;
}

@Controller('tenant')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantService.getConfig(user.tenantId);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  async getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantService.getSettings(user.tenantId);
  }
}
