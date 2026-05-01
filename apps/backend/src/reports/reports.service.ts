import {
    Injectable,
    BadRequestException,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { EventEmitter2 } from '@nestjs/event-emitter';
  import {
    IssueType,
    Priority,
    ReportStatus,
    Role,
  } from '@prisma/client';
  
  interface CreateReportDto {
    tenantId: string;
    customerId: string;
    conversationId: string;
    issueType: IssueType;
    issueSummary: string;
    actionRequested: string;
    routeToDeptName: string;
    priority: Priority;
    aiConfidence: number;
    rawConversation: object[];
  }
  
  interface ListReportsQuery {
    status?: ReportStatus;
    deptId?: string;
    priority?: Priority;
    page?: number;
    limit?: number;
  }
  
  interface JwtUser {
    sub: string;
    role: Role;
    tenantId: string;
    deptId?: string;
  }
  
  function computeSlaDeadline(priority: Priority, from: Date): Date {
    const ms = {
      HIGH: 4 * 60 * 60 * 1000,
      MEDIUM: 24 * 60 * 60 * 1000,
      LOW: 72 * 60 * 60 * 1000,
    }[priority];
    return new Date(from.getTime() + ms);
  }
  
  @Injectable()
  export class ReportsService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly eventEmitter: EventEmitter2,
    ) {}
  
    async create(dto: CreateReportDto) {
      const dept = await this.prisma.department.findUnique({
        where: { tenantId_name: { tenantId: dto.tenantId, name: dto.routeToDeptName } },
      });
  
      const now = new Date();
      const slaDeadline = computeSlaDeadline(dto.priority, now);
  
      const report = await this.prisma.report.create({
        data: {
          tenantId: dto.tenantId,
          customerId: dto.customerId,
          conversationId: dto.conversationId,
          issueType: dto.issueType,
          issueSummary: dto.issueSummary,
          actionRequested: dto.actionRequested,
          routeToDeptId: dept?.id ?? null,
          routeToDeptName: dto.routeToDeptName,
          priority: dto.priority,
          aiConfidence: dto.aiConfidence,
          rawConversation: dto.rawConversation,
          status: ReportStatus.PENDING_CDA,
          slaDeadline,
          createdAt: now,
          updatedAt: now,
          timeline: {
            create: [
              {
                actorId: dto.customerId,
                actorRole: Role.CUSTOMER,
                fromStatus: null,
                toStatus: ReportStatus.DRAFT,
                isSystemEntry: true,
                createdAt: now,
              },
              {
                actorId: dto.customerId,
                actorRole: Role.CUSTOMER,
                fromStatus: ReportStatus.DRAFT,
                toStatus: ReportStatus.PENDING_CDA,
                isSystemEntry: false,
                createdAt: new Date(now.getTime() + 1),
              },
            ],
          },
        },
      });
  
      this.eventEmitter.emit('report.statusChanged', {
        reportId: report.id,
        newStatus: report.status,
        customerId: report.customerId,
        actorId: dto.customerId,
        tenantId: report.tenantId,
        note: null,
        deptAdminId: null,
      });
  
      return { id: report.id, status: report.status, createdAt: report.createdAt };
    }
  
    async list(user: JwtUser, query: ListReportsQuery) {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);
      const skip = (page - 1) * limit;
  
      const where: Record<string, unknown> = { tenantId: user.tenantId };
  
      if (user.role === Role.CUSTOMER) {
        where.customerId = user.sub;
      } else if (user.role === Role.DEPT_ADMIN) {
        where.routeToDeptId = user.deptId;
      }
  
      if (query.status) where.status = query.status;
      if (query.deptId) where.routeToDeptId = query.deptId;
      if (query.priority) where.priority = query.priority;
  
      const [data, total] = await Promise.all([
        this.prisma.report.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        this.prisma.report.count({ where }),
      ]);
  
      return { data, total, page, limit };
    }
  
    async findOne(id: string, user: JwtUser) {
      const report = await this.prisma.report.findUnique({
        where: { id },
        include: {
          timeline: {
            include: { actor: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
          },
          escalations: true,
        },
      });
  
      if (!report) throw new NotFoundException('Report not found');
      if (report.tenantId !== user.tenantId) throw new NotFoundException('Report not found');
  
      return report;
    }
  }