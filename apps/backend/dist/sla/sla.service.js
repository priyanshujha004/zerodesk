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
var SlaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const ACTIVE_STATUSES = [
    client_1.ReportStatus.PENDING_CDA,
    client_1.ReportStatus.INFO_REQUESTED,
    client_1.ReportStatus.APPROVED_TO_DEPT,
    client_1.ReportStatus.IN_PROGRESS,
    client_1.ReportStatus.ESCALATED,
];
let SlaService = SlaService_1 = class SlaService {
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SlaService_1.name);
    }
    async checkSlaBreaches() {
        const now = new Date();
        this.logger.log(`[SLA] Running breach check at ${now.toISOString()}`);
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
        await this.prisma.report.updateMany({
            where: { id: { in: breached.map((r) => r.id) } },
            data: { slaBreached: true, updatedAt: now },
        });
        for (const report of breached) {
            this.logger.warn(`[SLA] Breached: ${report.id} | status: ${report.status} | priority: ${report.priority} | deadline: ${report.slaDeadline?.toISOString()}`);
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
    async triggerManualCheck() {
        return this.checkSlaBreaches();
    }
};
exports.SlaService = SlaService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SlaService.prototype, "checkSlaBreaches", null);
exports.SlaService = SlaService = SlaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], SlaService);
//# sourceMappingURL=sla.service.js.map