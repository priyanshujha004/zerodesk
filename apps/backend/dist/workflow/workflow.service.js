"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
let WorkflowService = class WorkflowService {
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    emit(payload) {
        this.eventEmitter.emit('report.statusChanged', payload);
    }
    async getReport(reportId, tenantId) {
        const report = await this.prisma.report.findUnique({ where: { id: reportId } });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        if (report.tenantId !== tenantId)
            throw new common_1.NotFoundException('Report not found');
        return report;
    }
    async approve(reportId, user, note) {
        if (user.role !== client_1.Role.CDA)
            throw new common_1.ForbiddenException('CDA role required');
        const report = await this.getReport(reportId, user.tenantId);
        if (report.status !== client_1.ReportStatus.PENDING_CDA) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → APPROVED_TO_DEPT`);
        }
        const deptAdmin = report.routeToDeptId
            ? await this.prisma.user.findFirst({
                where: { deptId: report.routeToDeptId, role: client_1.Role.DEPT_ADMIN, isActive: true },
            })
            : null;
        const updated = await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: client_1.ReportStatus.APPROVED_TO_DEPT,
                currentActorId: deptAdmin?.id ?? null,
                currentActorRole: client_1.Role.DEPT_ADMIN,
                updatedAt: new Date(),
                timeline: {
                    create: {
                        actorId: user.sub,
                        actorRole: client_1.Role.CDA,
                        fromStatus: client_1.ReportStatus.PENDING_CDA,
                        toStatus: client_1.ReportStatus.APPROVED_TO_DEPT,
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
    async reject(reportId, user, note) {
        if (user.role !== client_1.Role.CDA && user.role !== client_1.Role.DEPT_ADMIN) {
            throw new common_1.ForbiddenException('CDA or DEPT_ADMIN role required');
        }
        const report = await this.getReport(reportId, user.tenantId);
        const allowed = [client_1.ReportStatus.PENDING_CDA, client_1.ReportStatus.IN_PROGRESS];
        if (!allowed.includes(report.status)) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → REJECTED`);
        }
        const updated = await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: client_1.ReportStatus.REJECTED,
                updatedAt: new Date(),
                timeline: {
                    create: {
                        actorId: user.sub,
                        actorRole: user.role,
                        fromStatus: report.status,
                        toStatus: client_1.ReportStatus.REJECTED,
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
    async action(reportId, user, note, actionTaken) {
        if (user.role !== client_1.Role.DEPT_ADMIN)
            throw new common_1.ForbiddenException('DEPT_ADMIN role required');
        const report = await this.getReport(reportId, user.tenantId);
        const allowed = [client_1.ReportStatus.APPROVED_TO_DEPT, client_1.ReportStatus.IN_PROGRESS];
        if (!allowed.includes(report.status)) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → COMPLETED`);
        }
        const updated = await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: client_1.ReportStatus.COMPLETED,
                resolution: note,
                updatedAt: new Date(),
                timeline: {
                    create: {
                        actorId: user.sub,
                        actorRole: client_1.Role.DEPT_ADMIN,
                        fromStatus: report.status,
                        toStatus: client_1.ReportStatus.COMPLETED,
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
    async escalate(reportId, user, reason) {
        if (user.role !== client_1.Role.CUSTOMER)
            throw new common_1.ForbiddenException('CUSTOMER role required');
        const report = await this.getReport(reportId, user.tenantId);
        if (report.status !== client_1.ReportStatus.REJECTED) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → ESCALATED`);
        }
        const superAdmin = await this.prisma.user.findFirst({
            where: { tenantId: user.tenantId, role: client_1.Role.SUPER_ADMIN, isActive: true },
        });
        const now = new Date();
        const updated = await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: client_1.ReportStatus.ESCALATED,
                escalationCount: { increment: 1 },
                lastEscalatedAt: now,
                currentActorId: superAdmin?.id ?? null,
                currentActorRole: client_1.Role.SUPER_ADMIN,
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
                        actorRole: client_1.Role.CUSTOMER,
                        fromStatus: client_1.ReportStatus.REJECTED,
                        toStatus: client_1.ReportStatus.ESCALATED,
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
    async resolve(reportId, user, decision, note) {
        if (user.role !== client_1.Role.SUPER_ADMIN)
            throw new common_1.ForbiddenException('SUPER_ADMIN role required');
        const report = await this.getReport(reportId, user.tenantId);
        if (report.status !== client_1.ReportStatus.ESCALATED) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → resolve`);
        }
        const newStatus = decision === client_1.EscalationDecision.OVERRIDE_APPROVE
            ? client_1.ReportStatus.RESOLVED
            : decision === client_1.EscalationDecision.UPHOLD_CLOSE
                ? client_1.ReportStatus.CLOSED
                : client_1.ReportStatus.INFO_REQUESTED;
        const now = new Date();
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
                        actorRole: client_1.Role.SUPER_ADMIN,
                        fromStatus: client_1.ReportStatus.ESCALATED,
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
    async acknowledge(reportId, user) {
        if (user.role !== client_1.Role.DEPT_ADMIN)
            throw new common_1.ForbiddenException('DEPT_ADMIN role required');
        const report = await this.getReport(reportId, user.tenantId);
        if (report.status !== client_1.ReportStatus.APPROVED_TO_DEPT) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → IN_PROGRESS`);
        }
        const updated = await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: client_1.ReportStatus.IN_PROGRESS,
                currentActorId: user.sub,
                currentActorRole: client_1.Role.DEPT_ADMIN,
                updatedAt: new Date(),
                timeline: {
                    create: {
                        actorId: user.sub,
                        actorRole: client_1.Role.DEPT_ADMIN,
                        fromStatus: client_1.ReportStatus.APPROVED_TO_DEPT,
                        toStatus: client_1.ReportStatus.IN_PROGRESS,
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
    async infoRequest(reportId, user, note) {
        if (user.role !== client_1.Role.CDA)
            throw new common_1.ForbiddenException('CDA role required');
        const report = await this.getReport(reportId, user.tenantId);
        if (report.status !== client_1.ReportStatus.PENDING_CDA) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → INFO_REQUESTED`);
        }
        const updated = await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: client_1.ReportStatus.INFO_REQUESTED,
                currentActorId: report.customerId,
                currentActorRole: client_1.Role.CUSTOMER,
                updatedAt: new Date(),
                timeline: {
                    create: {
                        actorId: user.sub,
                        actorRole: client_1.Role.CDA,
                        fromStatus: client_1.ReportStatus.PENDING_CDA,
                        toStatus: client_1.ReportStatus.INFO_REQUESTED,
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
    async customerRespond(reportId, user, note) {
        if (user.role !== client_1.Role.CUSTOMER)
            throw new common_1.ForbiddenException('CUSTOMER role required');
        const report = await this.getReport(reportId, user.tenantId);
        if (report.customerId !== user.sub)
            throw new common_1.ForbiddenException('Not your report');
        if (report.status !== client_1.ReportStatus.INFO_REQUESTED) {
            throw new common_1.BadRequestException(`Illegal transition: ${report.status} → PENDING_CDA`);
        }
        const updated = await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: client_1.ReportStatus.PENDING_CDA,
                currentActorId: null,
                currentActorRole: client_1.Role.CDA,
                updatedAt: new Date(),
                timeline: {
                    create: {
                        actorId: user.sub,
                        actorRole: client_1.Role.CUSTOMER,
                        fromStatus: client_1.ReportStatus.INFO_REQUESTED,
                        toStatus: client_1.ReportStatus.PENDING_CDA,
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
};
exports.WorkflowService = WorkflowService;
exports.WorkflowService = WorkflowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], WorkflowService);
//# sourceMappingURL=workflow.service.js.map