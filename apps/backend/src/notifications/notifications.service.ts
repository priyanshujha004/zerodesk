// TODO P4: @OnEvent('report.statusChanged') → send email via Resend
// apps/backend/src/notifications/notifications.service.ts
 
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Role } from '@prisma/client';
import { Resend } from 'resend';
 
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'noreply@resolveiq.app';
 
// ─── Event payload types ────────────────────────────────────────────────────
 
interface StatusChangedPayload {
  reportId: string;
  newStatus: string;
  customerId: string;
  actorId: string;
  tenantId: string;
  note: string | null;
  deptAdminId: string | null;
}
 
// ─── Internal helper type ───────────────────────────────────────────────────
 
interface CreateNotificationInput {
  userId: string;
  reportId?: string;
  type: NotificationType;
  title: string;
  message: string;
  sendEmail: boolean;
  emailSubject?: string | null;
  emailBody?: string | null;
  customerEmail?: string | null;
  actionUrl?: string | null;
}
 
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
 
  constructor(private readonly prisma: PrismaService) {}
 
  // ─── Event listener ───────────────────────────────────────────────────────
 
  @OnEvent('report.statusChanged')
  async handleStatusChanged(payload: StatusChangedPayload): Promise<void> {
    try {
      await this._routeStatusNotification(payload);
    } catch (err) {
      this.logger.error(
        `Notification failed for report ${payload.reportId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
 
  // ─── Status routing ───────────────────────────────────────────────────────
 
  private async _routeStatusNotification(
    payload: StatusChangedPayload,
  ): Promise<void> {
    const { reportId, newStatus, customerId, tenantId, note, deptAdminId } =
      payload;
 
    // Fetch report for order info
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { shopifyOrderId: true },
    });
    const orderNumber = report?.shopifyOrderId ?? 'N/A';
 
    switch (newStatus) {
      // Notify all CDAs in tenant
      case 'PENDING_CDA': {
        const cdas = await this.prisma.user.findMany({
          where: { tenantId, role: Role.CDA },
          select: { id: true, email: true },
        });
        for (const cda of cdas) {
          await this.createNotification({
            userId: cda.id,
            reportId,
            type: NotificationType.NEW_REPORT_ASSIGNED,
            title: 'New return request pending review',
            message: `A new return request (${reportId}) is awaiting CDA review.`,
            sendEmail: false,
            actionUrl: `/report/${reportId}`,
          });
        }
        break;
      }
 
      // Notify customer + deptAdmin
      case 'APPROVED_TO_DEPT': {
        await this.createNotification({
          userId: customerId,
          reportId,
          type: NotificationType.REPORT_APPROVED,
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
            type: NotificationType.NEW_REPORT_ASSIGNED,
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
          type: NotificationType.REPORT_REJECTED,
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
          type: NotificationType.REPORT_COMPLETED,
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
        // Notify customer
        await this.createNotification({
          userId: customerId,
          reportId,
          type: NotificationType.REPORT_ESCALATED,
          title: 'Escalation received',
          message: 'Your escalation has been received. We will review it shortly.',
          sendEmail: true,
          emailSubject: 'Your escalation has been received',
          emailBody: '<p>Your escalation has been received and will be reviewed by a senior team member.</p>',
          actionUrl: `/report/${reportId}`,
        });
 
        // Notify all SUPER_ADMINs
        const superAdmins = await this.prisma.user.findMany({
          where: { tenantId, role: Role.SUPER_ADMIN },
          select: { id: true },
        });
        for (const admin of superAdmins) {
          await this.createNotification({
            userId: admin.id,
            reportId,
            type: NotificationType.REPORT_ESCALATED,
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
          type: NotificationType.REPORT_RESOLVED,
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
          type: NotificationType.REPORT_CLOSED,
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
          type: NotificationType.INFO_REQUESTED,
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
            type: NotificationType.NEW_REPORT_ASSIGNED,
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
 
  // ─── Core notification creator (used by RefundService too) ───────────────
 
  async createNotification(input: CreateNotificationInput): Promise<void> {
    const {
      userId,
      reportId,
      type,
      title,
      message,
      sendEmail,
      emailSubject,
      emailBody,
      customerEmail,
      actionUrl,
    } = input;
 
    // Duplicate email guard
    if (sendEmail && reportId) {
      const exists = await this.prisma.notification.findFirst({
        where: { reportId, type, emailSent: true },
      });
      if (exists) {
        this.logger.log(
          `Skipping duplicate email: reportId=${reportId} type=${type}`,
        );
        // Still create the in-app notification
      }
    }
 
    let emailSent = false;
    let emailSentAt: Date | undefined;
    let emailId: string | undefined;
 
    if (sendEmail && emailSubject && emailBody) {
      const resolvedEmail =
        customerEmail ??
        (
          await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
          })
        )?.email;
 
      if (resolvedEmail) {
        // Check duplicate before sending
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
          } catch (emailErr) {
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
 
  // ─── API methods ──────────────────────────────────────────────────────────
 
  async getUnread(userId: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { count: items.length, items };
  }
 
  async markRead(notificationId: string, userId: string) {
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
 
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { count: result.count };
  }
 
  // ─── Email template wrapper ───────────────────────────────────────────────
 
  private _wrapEmailTemplate(title: string, body: string): string {
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
}