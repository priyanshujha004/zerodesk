// apps/backend/src/notifications/notifications.controller.ts
// (companion file — not in your boundary but needed for wiring)

 
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MockAuthGuard } from '../auth/mock-auth.guard';
 
interface JwtRequest {
  user: { sub: string };
}
 
@Controller('notifications')
// @UseGuards(JwtAuthGuard)
@UseGuards(MockAuthGuard)
export class NotificationsController {
  constructor(
  private readonly eventEmitter: EventEmitter2,
    private readonly svc: NotificationsService) {}
 
  @Get('unread')
  getUnread(@Request() req: JwtRequest) {
    return this.svc.getUnread(req.user.sub);
  }
 
  @Post('mark-read/:id')
  async markRead(@Param('id') id: string, @Request() req: JwtRequest) {
    try {
      return await this.svc.markRead(id, req.user.sub);
    } catch {
      throw new ForbiddenException('Not your notification');
    }
  }
 
  @Post('mark-all-read')
  markAllRead(@Request() req: JwtRequest) {
    return this.svc.markAllRead(req.user.sub);
  }
      @Post('test/trigger-refund')
    async testRefund() {
      await this.eventEmitter.emit('report.autoResolved', {
        reportId: 'PASTE_A_REAL_REPORT_ID_FROM_YOUR_DB',
        customerId: 'f5723a16-c08a-4310-8d9b-75ff320ed992', // already in MockAuthGuard
        tenantId: 'tenant_shopease',                         // already in MockAuthGuard
        refundAmount: 49900,   // ₹499
        shopifyOrderId: 'ORD-TEST-001',
        razorpayOrderId: null,
      });
      return { ok: true };
    }
}