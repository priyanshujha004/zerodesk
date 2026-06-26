import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

// Razorpay real integration removed — using mock mode only
// When real payments are needed, install razorpay package and re-enable

interface AutoResolvedPayload {
  reportId: string;
  customerId: string;
  tenantId: string;
  refundAmount: number; // paise
  shopifyOrderId: string;
  razorpayOrderId: string | null;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('report.autoResolved')
  async processRefund(payload: AutoResolvedPayload): Promise<void> {
    this.logger.log(`Processing refund for report ${payload.reportId}`);
    try {
      await this._processRefundInternal(payload);
    } catch (err) {
      this.logger.error(
        `Refund processing failed for report ${payload.reportId}`,
        err instanceof Error ? err.stack : String(err),
      );
      try {
        await this.notificationsService.createNotification({
          userId: payload.customerId,
          reportId: payload.reportId,
          type: NotificationType.AUTO_REFUND_PROCESSED,
          title: 'Refund processing failed',
          message: 'We encountered an issue processing your refund. Our team has been alerted.',
          emailBody: null,
          emailSubject: null,
          sendEmail: false,
        });
      } catch (notifErr) {
        this.logger.error('Failed to create failure notification', notifErr);
      }
    }
  }

  private async _processRefundInternal(payload: AutoResolvedPayload): Promise<void> {
    const customer = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.customerId },
      select: { email: true, name: true },
    });

    const report = await this.prisma.report.findUniqueOrThrow({
      where: { id: payload.reportId },
      select: { shopifyOrderId: true },
    });

    // Mock refund — real Razorpay integration to be added when payment keys are live
    const razorpayRefundId = `rfnd_MOCK_${Date.now()}`;
    this.logger.log(`[MOCK] Refund ID: ${razorpayRefundId}`);

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
      type: NotificationType.AUTO_REFUND_PROCESSED,
      title: 'Refund processed! 🎉',
      message: `Your refund of ₹${amountInRupees} for order ${orderNumber} has been initiated. You'll receive it in 5-7 business days.`,
      sendEmail: true,
      emailSubject: `✅ Refund of ₹${amountInRupees} initiated`,
      emailBody: `
        <p>Great news, ${customer.name ?? 'there'}!</p>
        <p>Your return for order <strong>${orderNumber}</strong> was automatically approved.</p>
        <p>Refund of <strong>₹${amountInRupees}</strong> has been initiated and will arrive in 5-7 business days.</p>
        <p>Reference: <code>${razorpayRefundId}</code></p>
      `,
      customerEmail: customer.email,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: payload.tenantId,
        action: 'REFUND_MOCK_PROCESSED',
        entityType: 'Report',
        entityId: payload.reportId,
        actorEmail: 'system@zerodesk.app',
        actorRole: 'SYSTEM',
        reportId: payload.reportId,
        after: { razorpayRefundId, refundAmount: payload.refundAmount, isMock: true },
      },
    });

    this.logger.log(`Refund complete for report ${payload.reportId} — ID: ${razorpayRefundId}`);
  }
}