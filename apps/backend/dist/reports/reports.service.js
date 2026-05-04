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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
function computeSlaDeadline(priority, from) {
    const ms = {
        HIGH: 4 * 60 * 60 * 1000,
        MEDIUM: 24 * 60 * 60 * 1000,
        LOW: 72 * 60 * 60 * 1000,
    }[priority];
    return new Date(from.getTime() + ms);
}
let ReportsService = class ReportsService {
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async create(dto) {
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
                status: client_1.ReportStatus.PENDING_CDA,
                slaDeadline,
                createdAt: now,
                updatedAt: now,
                timeline: {
                    create: [
                        {
                            actorId: dto.customerId,
                            actorRole: client_1.Role.CUSTOMER,
                            fromStatus: null,
                            toStatus: client_1.ReportStatus.DRAFT,
                            isSystemEntry: true,
                            createdAt: now,
                        },
                        {
                            actorId: dto.customerId,
                            actorRole: client_1.Role.CUSTOMER,
                            fromStatus: client_1.ReportStatus.DRAFT,
                            toStatus: client_1.ReportStatus.PENDING_CDA,
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
    async list(user, query) {
        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 20);
        const skip = (page - 1) * limit;
        const where = { tenantId: user.tenantId };
        if (user.role === client_1.Role.CUSTOMER) {
            where.customerId = user.sub;
        }
        else if (user.role === client_1.Role.DEPT_ADMIN) {
            where.routeToDeptId = user.deptId;
        }
        if (query.status)
            where.status = query.status;
        if (query.deptId)
            where.routeToDeptId = query.deptId;
        if (query.priority)
            where.priority = query.priority;
        const [data, total] = await Promise.all([
            this.prisma.report.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            this.prisma.report.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async findOne(id, user) {
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
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        if (report.tenantId !== user.tenantId)
            throw new common_1.NotFoundException('Report not found');
        return report;
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], ReportsService);
//# sourceMappingURL=reports.service.js.map