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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'noreply@resolveiq.app';
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async handleStatusChanged(payload) {
        try {
            await this._routeStatusNotification(payload);
        }
        catch (err) {
            this.logger.error(`Notification failed for report ${payload.reportId}`, err instanceof Error ? err.stack : String(err));
        }
    }
    async _routeStatusNotification(payload) {
        const { reportId, newStatus, customerId, tenantId, note, deptAdminId } = payload;
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            select: { shopifyOrderId: true },
        });
        const orderNumber = report?.shopifyOrderId ?? 'N/A';
        switch (newStatus) {
            case 'PENDING_CDA': {
                const cdas = await this.prisma.user.findMany({
                    where: { tenantId, role: client_1.Role.CDA },
                    select: { id: true, email: true },
                });
                for (const cda of cdas) {
                    await this.createNotification({
                        userId: cda.id,
                        reportId,
                        type: client_1.NotificationType.NEW_REPORT_ASSIGNED,
                        title: 'New return request pending review',
                        message: `A new return request (${reportId}) is awaiting CDA review.`,
                        sendEmail: false,
                        actionUrl: `/report/${reportId}`,
                    });
                }
                break;
            }
            case 'APPROVED_TO_DEPT': {
                await this.createNotification({
                    userId: customerId,
                    reportId,
                    type: client_1.NotificationType.REPORT_APPROVED,
                    title: 'Your return has been approved',
                    message: `Your return for order ${orderNumber} has been approved and is being processed by our team.`,
                    sendEmail: true,
                    emailSubject: `Return approved — Order ${orderNumber}`,
                    emailBody: `<p>Your return for order <strong>${orderNumber}</strong> has been approved and is being processed by our team.</p>`,
                    actionUrl: `/report/${reportId}`,
                });
                if (deptAdminId) {
                    await this.createNotification({
                        userId: deptAdminId,
                        reportId,
                        type: client_1.NotificationType.NEW_REPORT_ASSIGNED,
                        title: 'Return assigned to your department',
                        message: `Return request (${reportId}) has been approved and assigned to your department.`,
                        sendEmail: false,
                        actionUrl: `/report/${reportId}`,
                    });
                }
                break;
            }
            case 'REJECTED': {
                await this.createNotification({
                    userId: customerId,
                    reportId,
                    type: client_1.NotificationType.REPORT_REJECTED,
                    title: 'Update on your return request',
                    message: `Unfortunately your return for order ${orderNumber} was not approved. Reason: ${note ?? 'No reason provided'}. Not satisfied? You can escalate this decision.`,
                    sendEmail: true,
                    emailSubject: `Update on your return request`,
                    emailBody: `
            <p>Unfortunately your return for order <strong>${orderNumber}</strong> was not approved.</p>
            <p><strong>Reason:</strong> ${note ?? 'No reason provided'}</p>
            <p>Not satisfied? You can <a href="/report/${reportId}">escalate this decision</a> by visiting your report.</p>
          `,
                    actionUrl: `/report/${reportId}`,
                });
                break;
            }
            case 'COMPLETED': {
                await this.createNotification({
                    userId: customerId,
                    reportId,
                    type: client_1.NotificationType.REPORT_COMPLETED,
                    title: 'Your return has been resolved',
                    message: `Your return has been resolved. ${note ?? ''}`,
                    sendEmail: true,
                    emailSubject: `Your return has been resolved`,
                    emailBody: `<p>Your return has been resolved.</p>${note ? `<p>${note}</p>` : ''}`,
                    actionUrl: `/report/${reportId}`,
                });
                break;
            }
            case 'ESCALATED': {
                await this.createNotification({
                    userId: customerId,
                    reportId,
                    type: client_1.NotificationType.REPORT_ESCALATED,
                    title: 'Escalation received',
                    message: 'Your escalation has been received. We will review it shortly.',
                    sendEmail: true,
                    emailSubject: 'Your escalation has been received',
                    emailBody: '<p>Your escalation has been received and will be reviewed by a senior team member.</p>',
                    actionUrl: `/report/${reportId}`,
                });
                const superAdmins = await this.prisma.user.findMany({
                    where: { tenantId, role: client_1.Role.SUPER_ADMIN },
                    select: { id: true },
                });
                for (const admin of superAdmins) {
                    await this.createNotification({
                        userId: admin.id,
                        reportId,
                        type: client_1.NotificationType.REPORT_ESCALATED,
                        title: 'Escalated return requires attention',
                        message: `Report ${reportId} has been escalated and requires super admin review.`,
                        sendEmail: false,
                        actionUrl: `/report/${reportId}`,
                    });
                }
                break;
            }
            case 'RESOLVED': {
                await this.createNotification({
                    userId: customerId,
                    reportId,
                    type: client_1.NotificationType.REPORT_RESOLVED,
                    title: 'Your escalation has been resolved',
                    message: `Your escalation has been resolved. ${note ?? ''}`,
                    sendEmail: true,
                    emailSubject: 'Your escalation has been resolved',
                    emailBody: `<p>Your escalation has been resolved.</p>${note ? `<p>${note}</p>` : ''}`,
                    actionUrl: `/report/${reportId}`,
                });
                break;
            }
            case 'CLOSED': {
                await this.createNotification({
                    userId: customerId,
                    reportId,
                    type: client_1.NotificationType.REPORT_CLOSED,
                    title: 'Return request closed',
                    message: `Your return request for order ${orderNumber} has been closed.`,
                    sendEmail: true,
                    emailSubject: 'Return request closed',
                    emailBody: `<p>Your return request for order <strong>${orderNumber}</strong> has been closed.</p>`,
                    actionUrl: `/report/${reportId}`,
                });
                break;
            }
            case 'INFO_REQUESTED': {
                await this.createNotification({
                    userId: customerId,
                    reportId,
                    type: client_1.NotificationType.INFO_REQUESTED,
                    title: 'Additional information needed',
                    message: `Our team needs more information about your return. ${note ?? ''}`,
                    sendEmail: true,
                    emailSubject: 'Action required: Additional info needed',
                    emailBody: `<p>Our team needs some additional information about your return request.</p>${note ? `<p>${note}</p>` : ''}<p><a href="/report/${reportId}">View your report</a></p>`,
                    actionUrl: `/report/${reportId}`,
                });
                break;
            }
            case 'NEW_REPORT_ASSIGNED': {
                if (deptAdminId) {
                    await this.createNotification({
                        userId: deptAdminId,
                        reportId,
                        type: client_1.NotificationType.NEW_REPORT_ASSIGNED,
                        title: 'Return request assigned to you',
                        message: `Return request ${reportId} has been assigned to you for review.`,
                        sendEmail: false,
                        actionUrl: `/report/${reportId}`,
                    });
                }
                break;
            }
            default:
                this.logger.warn(`Unhandled status: ${newStatus}`);
        }
    }
    async createNotification(input) {
        const { userId, reportId, type, title, message, sendEmail, emailSubject, emailBody, customerEmail, actionUrl, } = input;
        if (sendEmail && reportId) {
            const exists = await this.prisma.notification.findFirst({
                where: { reportId, type, emailSent: true },
            });
            if (exists) {
                this.logger.log(`Skipping duplicate email: reportId=${reportId} type=${type}`);
            }
        }
        let emailSent = false;
        let emailSentAt;
        let emailId;
        if (sendEmail && emailSubject && emailBody) {
            const resolvedEmail = customerEmail ??
                (await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { email: true },
                }))?.email;
            if (resolvedEmail) {
                const alreadySent = reportId
                    ? await this.prisma.notification.findFirst({
                        where: { reportId, type, emailSent: true },
                    })
                    : null;
                if (!alreadySent) {
                    try {
                        const result = await resend.emails.send({
                            from: FROM_EMAIL,
                            to: resolvedEmail,
                            subject: emailSubject,
                            html: this._wrapEmailTemplate(title, emailBody),
                        });
                        emailSent = true;
                        emailSentAt = new Date();
                        emailId = result.data?.id;
                    }
                    catch (emailErr) {
                        this.logger.error('Resend email failed', emailErr);
                    }
                }
            }
        }
        await this.prisma.notification.create({
            data: {
                userId,
                reportId,
                type,
                title,
                message,
                emailSent,
                emailSentAt,
                emailId,
                actionUrl,
            },
        });
    }
    async getUnread(userId) {
        const items = await this.prisma.notification.findMany({
            where: { userId, read: false },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return { count: items.length, items };
    }
    async markRead(notificationId, userId) {
        const notif = await this.prisma.notification.findUniqueOrThrow({
            where: { id: notificationId },
        });
        if (notif.userId !== userId) {
            throw new Error('Forbidden');
        }
        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { read: true, readAt: new Date() },
        });
    }
    async markAllRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true, readAt: new Date() },
        });
        return { count: result.count };
    }
    _wrapEmailTemplate(title, body) {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; max-width: 560px; margin: 0 auto; }
    .logo { font-weight: 700; font-size: 18px; color: #6ee7b7; margin-bottom: 24px; }
    h2 { color: #111; margin-top: 0; }
    p { color: #444; line-height: 1.6; }
    a { color: #6ee7b7; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">ResolveIQ</div>
    <h2>${title}</h2>
    ${body}
    <div class="footer">
      <p>© ResolveIQ. AI-powered returns resolution.</p>
    </div>
  </div>
</body>
</html>`;
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, event_emitter_1.OnEvent)('report.statusChanged'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleStatusChanged", null);
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map