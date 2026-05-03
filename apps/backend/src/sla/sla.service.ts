import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportStatus } from '@prisma/client';

// Statuses where SLA is still actively ticking —
// terminal statuses (COMPLETED, RESOLVED, CLOSED, REJECTED) are excluded
const ACTIVE_STATUSES: ReportStatus[] = [
  ReportStatus.PENDING_CDA,
  ReportStatus.INFO_REQUESTED,
  ReportStatus.APPROVED_TO_DEPT,
  ReportStatus.IN_PROGRESS,
  ReportStatus.ESCALATED,
];

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Runs every 15 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkSlaBreaches() {
    const now = new Date();
    this.logger.log(`[SLA] Running breach check at ${now.toISOString()}`);

    // Find all active reports where slaDeadline has passed and not yet marked breached
    const breached = await this.prisma.report.findMany({
      where: {
        slaBreached: false,
        slaDeadline: { lt: now },
        status: { in: ACTIVE_STATUSES },
      },
      select: {
        id: true,
        tenantId: true,
        customerId: true,
        status: true,
        priority: true,
        slaDeadline: true,
        currentActorId: true,
      },
    });

    if (breached.length === 0) {
      this.logger.log('[SLA] No new breaches found.');
      return;
    }

    this.logger.warn(`[SLA] ${breached.length} report(s) breached SLA — updating...`);

    // Batch update all breached reports
    await this.prisma.report.updateMany({
      where: { id: { in: breached.map((r) => r.id) } },
      data: { slaBreached: true, updatedAt: now },
    });

    // Emit one event per breached report so P4 can send notifications
    for (const report of breached) {
      this.logger.warn(
        `[SLA] Breached: ${report.id} | status: ${report.status} | priority: ${report.priority} | deadline: ${report.slaDeadline?.toISOString()}`,
      );

      this.eventEmitter.emit('report.slaBreached', {
        reportId: report.id,
        tenantId: report.tenantId,
        customerId: report.customerId,
        status: report.status,
        currentActorId: report.currentActorId ?? null,
        slaDeadline: report.slaDeadline,
        breachedAt: now,
      });
    }

    this.logger.log(`[SLA] Done. Marked ${breached.length} report(s) as slaBreached = true.`);
  }

  // Also expose a manual trigger for testing without waiting for the cron
  async triggerManualCheck() {
    return this.checkSlaBreaches();
  }
}