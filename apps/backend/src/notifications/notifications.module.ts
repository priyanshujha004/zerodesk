// TODO P4: implement
// apps/backend/src/notifications/notifications.module.ts
 
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RefundService } from './refund.service';
import { PrismaModule } from '../prisma/prisma.module';
 
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, RefundService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
