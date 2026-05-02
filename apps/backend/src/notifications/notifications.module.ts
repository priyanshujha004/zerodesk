// TODO P4: implement
// apps/backend/src/notifications/notifications.module.ts
 
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RefundService } from './refund.service';
// notifications.module.ts
import { PrismaService } from '../prisma/prisma.service';
import {AuthModule} from '../auth/auth.module';
 
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, RefundService, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
