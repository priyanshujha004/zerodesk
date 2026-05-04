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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RefundService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("./notifications.service");
const client_1 = require("@prisma/client");
const razorpay_1 = __importDefault(require("razorpay"));
let RefundService = RefundService_1 = class RefundService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(RefundService_1.name);
    }
    async processRefund(payload) {
        this.logger.log(`Processing refund for report ${payload.reportId}`);
        try {
            await this._processRefundInternal(payload);
        }
        catch (err) {
            this.logger.error(`Refund processing failed for report ${payload.reportId}`, err instanceof Error ? err.stack : String(err));
            try {
                await this.notificationsService.createNotification({
                    userId: payload.customerId,
                    reportId: payload.reportId,
                    type: client_1.NotificationType.AUTO_REFUND_PROCESSED,
                    title: 'Refund processing failed',
                    message: 'We encountered an issue processing your refund. Our team has been alerted and will resolve this shortly.',
                    emailBody: null,
                    emailSubject: null,
                    sendEmail: false,
                });
            }
            catch (notifErr) {
                this.logger.error('Failed to create failure notification', notifErr);
            }
        }
    }
    async _processRefundInternal(payload) {
        const tenant = await this.prisma.tenant.findUniqueOrThrow({
            where: { id: payload.tenantId },
            select: {
                razorpayKeyId: true,
                razorpayKeySecret: true,
            },
        });
        const customer = await this.prisma.user.findUniqueOrThrow({
            where: { id: payload.customerId },
            select: { email: true, name: true },
        });
        const report = await this.prisma.report.findUniqueOrThrow({
            where: { id: payload.reportId },
            select: { shopifyOrderId: true },
        });
        let razorpayRefundId;
        const isMock = process.env.RAZORPAY_MOCK === 'true';
        if (isMock) {
            razorpayRefundId = `rfnd_MOCK_${Date.now()}`;
            this.logger.log(`[MOCK] Generated fake refund ID: ${razorpayRefundId}`);
        }
        else {
            if (!payload.razorpayOrderId) {
                throw new Error(`Cannot process real refund: no razorpayOrderId for report ${payload.reportId}`);
            }
            const razorpay = new razorpay_1.default({
                key_id: tenant.razorpayKeyId,
                key_secret: tenant.razorpayKeySecret,
            });
            const refund = await razorpay.payments.refund(payload.razorpayOrderId, {
                amount: payload.refundAmount,
                speed: 'normal',
                notes: { reportId: payload.reportId },
            });
            razorpayRefundId = refund.id;
        }
        await this.prisma.report.update({
            where: { id: payload.reportId },
            data: {
                refundInitiated: true,
                refundInitiatedAt: new Date(),
                razorpayRefundId,
            },
        });
        const amountInRupees = (payload.refundAmount / 100).toFixed(2);
        const orderNumber = report.shopifyOrderId ?? payload.shopifyOrderId;
        await this.notificationsService.createNotification({
            userId: payload.customerId,
            reportId: payload.reportId,
            type: client_1.NotificationType.AUTO_REFUND_PROCESSED,
            title: 'Refund processed! 🎉',
            message: `Your refund of ₹${amountInRupees} for order ${orderNumber} has been initiated. You'll receive it in 5-7 business days.`,
            sendEmail: true,
            emailSubject: `✅ Refund of ₹${amountInRupees} initiated`,
            emailBody: `
        <p>Great news, ${customer.name ?? 'there'}!</p>
        <p>Your return for order <strong>${orderNumber}</strong> was automatically approved.</p>
        <p>Refund of <strong>₹${amountInRupees}</strong> has been initiated and will arrive in 5-7 business days.</p>
        <p>Razorpay Refund ID: <code>${razorpayRefundId}</code></p>
      `,
            customerEmail: customer.email,
        });
        await this.prisma.auditLog.create({
            data: {
                tenantId: payload.tenantId,
                action: isMock ? 'REFUND_MOCK_PROCESSED' : 'REFUND_PROCESSED',
                entityType: 'Report',
                entityId: payload.reportId,
                actorId: null,
                actorEmail: 'system@resolveiq.app',
                actorRole: 'SYSTEM',
                reportId: payload.reportId,
                after: {
                    razorpayRefundId,
                    refundAmount: payload.refundAmount,
                    isMock,
                },
            },
        });
        this.logger.log(`Refund complete for report ${payload.reportId} — ID: ${razorpayRefundId}`);
    }
};
exports.RefundService = RefundService;
__decorate([
    (0, event_emitter_1.OnEvent)('report.autoResolved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RefundService.prototype, "processRefund", null);
exports.RefundService = RefundService = RefundService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], RefundService);
//# sourceMappingURL=refund.service.js.map