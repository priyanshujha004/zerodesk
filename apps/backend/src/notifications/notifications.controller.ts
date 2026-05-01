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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
 
interface JwtRequest {
  user: { sub: string };
}
 
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}
 
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
}