import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { EventEmitter2 } from '@nestjs/event-emitter';
  import {
    EscalationDecision,
    ReportStatus,
    Role,
  } from '@prisma/client';
  
  interface JwtUser {
    sub: string;
    role: Role;
    tenantId: string;
    deptId?: string;
  }
  
  type StatusChangeEvent = {
    reportId: string;
    newStatus: ReportStatus;
    customerId: string;
    actorId: string;
    tenantId: string;
    note: string | null;
    deptAdminId: string | null;
  };
  
  @Injectable()
  export class WorkflowService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly eventEmitter: EventEmitter2,
    ) {}
  
    private emit(payload: StatusChangeEvent) {
      this.eventEmitter.emit('report.statusChanged', payload);
    }
  
    private async getReport(reportId: string, tenantId: string) {
      const report = await this.prisma.report.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundException('Report not found');
      if (report.tenantId !== tenantId) throw new NotFoundException('Report not found');
      return report;
    }
  
    async approve(reportId: string, user: JwtUser, note?: string) {
      if (user.role !== Role.CDA) throw new ForbiddenException('CDA role required');
      const report = await this.getReport(reportId, user.tenantId);
  
      if (report.status !== ReportStatus.PENDING_CDA) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → APPROVED_TO_DEPT`,
        );
      }
  
      // Find a dept admin for this dept
      const deptAdmin = report.routeToDeptId
        ? await this.prisma.user.findFirst({
            where: { deptId: report.routeToDeptId, role: Role.DEPT_ADMIN, isActive: true },
          })
        : null;
  
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.APPROVED_TO_DEPT,
          currentActorId: deptAdmin?.id ?? null,
          currentActorRole: Role.DEPT_ADMIN,
          updatedAt: new Date(),
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: Role.CDA,
              fromStatus: ReportStatus.PENDING_CDA,
              toStatus: ReportStatus.APPROVED_TO_DEPT,
              note: note ?? null,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note: note ?? null,
        deptAdminId: deptAdmin?.id ?? null,
      });
  
      return { id: updated.id, status: updated.status };
    }
  
    async reject(reportId: string, user: JwtUser, note: string) {
      if (user.role !== Role.CDA && user.role !== Role.DEPT_ADMIN) {
        throw new ForbiddenException('CDA or DEPT_ADMIN role required');
      }
  
      const report = await this.getReport(reportId, user.tenantId);
      const allowed: ReportStatus[] = [ReportStatus.PENDING_CDA, ReportStatus.IN_PROGRESS];
  
      if (!allowed.includes(report.status)) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → REJECTED`,
        );
      }
  
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.REJECTED,
          updatedAt: new Date(),
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: user.role,
              fromStatus: report.status,
              toStatus: ReportStatus.REJECTED,
              note,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note,
        deptAdminId: null,
      });
  
      return { id: updated.id, status: updated.status };
    }
  
    async action(
      reportId: string,
      user: JwtUser,
      note: string,
      actionTaken: string,
    ) {
      if (user.role !== Role.DEPT_ADMIN) throw new ForbiddenException('DEPT_ADMIN role required');
      const report = await this.getReport(reportId, user.tenantId);
  
      const allowed: ReportStatus[] = [ReportStatus.APPROVED_TO_DEPT, ReportStatus.IN_PROGRESS];
      if (!allowed.includes(report.status)) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → COMPLETED`,
        );
      }
  
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.COMPLETED,
          resolution: note,
          updatedAt: new Date(),
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: Role.DEPT_ADMIN,
              fromStatus: report.status,
              toStatus: ReportStatus.COMPLETED,
              note,
              actionTaken,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note,
        deptAdminId: null,
      });
  
      return { id: updated.id, status: updated.status };
    }
  
    async escalate(reportId: string, user: JwtUser, reason: string) {
      if (user.role !== Role.CUSTOMER) throw new ForbiddenException('CUSTOMER role required');
      const report = await this.getReport(reportId, user.tenantId);
  
      if (report.status !== ReportStatus.REJECTED) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → ESCALATED`,
        );
      }
  
      const superAdmin = await this.prisma.user.findFirst({
        where: { tenantId: user.tenantId, role: Role.SUPER_ADMIN, isActive: true },
      });
  
      const now = new Date();
  
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.ESCALATED,
          escalationCount: { increment: 1 },
          lastEscalatedAt: now,
          currentActorId: superAdmin?.id ?? null,
          currentActorRole: Role.SUPER_ADMIN,
          updatedAt: now,
          escalations: {
            create: {
              escalatedById: user.sub,
              escalationReason: reason,
              level: report.escalationCount + 1,
              createdAt: now,
            },
          },
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: Role.CUSTOMER,
              fromStatus: ReportStatus.REJECTED,
              toStatus: ReportStatus.ESCALATED,
              note: reason,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note: reason,
        deptAdminId: null,
      });
  
      return { id: updated.id, status: updated.status };
    }
  
    async resolve(
      reportId: string,
      user: JwtUser,
      decision: EscalationDecision,
      note: string,
    ) {
      if (user.role !== Role.SUPER_ADMIN) throw new ForbiddenException('SUPER_ADMIN role required');
      const report = await this.getReport(reportId, user.tenantId);
  
      if (report.status !== ReportStatus.ESCALATED) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → resolve`,
        );
      }
  
      const newStatus: ReportStatus =
        decision === EscalationDecision.OVERRIDE_APPROVE
          ? ReportStatus.RESOLVED
          : decision === EscalationDecision.UPHOLD_CLOSE
            ? ReportStatus.CLOSED
            : ReportStatus.INFO_REQUESTED;
  
      const now = new Date();
  
      // Update the most recent escalation row
      const latestEscalation = await this.prisma.escalation.findFirst({
        where: { reportId },
        orderBy: { createdAt: 'desc' },
      });
  
      if (latestEscalation) {
        await this.prisma.escalation.update({
          where: { id: latestEscalation.id },
          data: {
            resolvedById: user.sub,
            resolvedAt: now,
            decision,
            resolutionNote: note,
          },
        });
      }
  
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: newStatus,
          updatedAt: now,
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: Role.SUPER_ADMIN,
              fromStatus: ReportStatus.ESCALATED,
              toStatus: newStatus,
              note,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note,
        deptAdminId: null,
      });
  
      return { id: updated.id, status: updated.status };
    }
  
    // APPROVED_TO_DEPT → IN_PROGRESS  (dept admin acknowledges the report)
    async acknowledge(reportId: string, user: JwtUser) {
      if (user.role !== Role.DEPT_ADMIN) throw new ForbiddenException('DEPT_ADMIN role required');
      const report = await this.getReport(reportId, user.tenantId);
  
      if (report.status !== ReportStatus.APPROVED_TO_DEPT) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → IN_PROGRESS`,
        );
      }
  
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.IN_PROGRESS,
          currentActorId: user.sub,
          currentActorRole: Role.DEPT_ADMIN,
          updatedAt: new Date(),
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: Role.DEPT_ADMIN,
              fromStatus: ReportStatus.APPROVED_TO_DEPT,
              toStatus: ReportStatus.IN_PROGRESS,
              note: 'Acknowledged by dept admin',
              isSystemEntry: false,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note: null,
        deptAdminId: user.sub,
      });
  
      return { id: updated.id, status: updated.status };
    }
  
    // PENDING_CDA → INFO_REQUESTED  (CDA asks customer for more info)
    async infoRequest(reportId: string, user: JwtUser, note: string) {
      if (user.role !== Role.CDA) throw new ForbiddenException('CDA role required');
      const report = await this.getReport(reportId, user.tenantId);
  
      if (report.status !== ReportStatus.PENDING_CDA) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → INFO_REQUESTED`,
        );
      }
  
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.INFO_REQUESTED,
          currentActorId: report.customerId,
          currentActorRole: Role.CUSTOMER,
          updatedAt: new Date(),
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: Role.CDA,
              fromStatus: ReportStatus.PENDING_CDA,
              toStatus: ReportStatus.INFO_REQUESTED,
              note,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note,
        deptAdminId: null,
      });
  
      return { id: updated.id, status: updated.status };
    }
  
    // INFO_REQUESTED → PENDING_CDA  (customer provides requested info)
    async customerRespond(reportId: string, user: JwtUser, note: string) {
      if (user.role !== Role.CUSTOMER) throw new ForbiddenException('CUSTOMER role required');
      const report = await this.getReport(reportId, user.tenantId);
  
      // Customer can only respond to their own report
      if (report.customerId !== user.sub) throw new ForbiddenException('Not your report');
  
      if (report.status !== ReportStatus.INFO_REQUESTED) {
        throw new BadRequestException(
          `Illegal transition: ${report.status} → PENDING_CDA`,
        );
      }
  
      // Route back to CDA queue — clear currentActor so any CDA can pick it up
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.PENDING_CDA,
          currentActorId: null,
          currentActorRole: Role.CDA,
          updatedAt: new Date(),
          timeline: {
            create: {
              actorId: user.sub,
              actorRole: Role.CUSTOMER,
              fromStatus: ReportStatus.INFO_REQUESTED,
              toStatus: ReportStatus.PENDING_CDA,
              note,
            },
          },
        },
      });
  
      this.emit({
        reportId: updated.id,
        newStatus: updated.status,
        customerId: updated.customerId,
        actorId: user.sub,
        tenantId: updated.tenantId,
        note,
        deptAdminId: null,
      });
  
      return { id: updated.id, status: updated.status };
    }
  }