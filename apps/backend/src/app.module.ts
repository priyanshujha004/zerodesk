import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from './prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaModule } from './sla/sla.module';

// ── P1 imports ──
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';

// ── P2 imports ──
import { ChatModule } from './chat/chat.module';

// ── P3 imports ──
import { ReportsModule } from './reports/reports.module';
import { WorkflowModule } from './workflow/workflow.module';

// ── P4 imports ──
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    TenantModule,
    ChatModule,
    ReportsModule,
    WorkflowModule,
    SlaModule,    
    NotificationsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
