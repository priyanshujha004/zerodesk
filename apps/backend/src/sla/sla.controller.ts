import { Controller, Post, UseGuards } from '@nestjs/common';
import { SlaService } from './sla.service';
import { MockAuthGuard } from '../auth/mock-auth.guard';

// Swap MockAuthGuard → JwtAuthGuard when P1 fixes auth
@UseGuards(MockAuthGuard)
@Controller('sla')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  // POST /api/sla/trigger — manually fire the SLA breach check
  // Remove or guard with SUPER_ADMIN role check before going to production
  @Post('trigger')
  trigger() {
    return this.slaService.triggerManualCheck();
  }
}