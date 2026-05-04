import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';
import Razorpay from 'razorpay';
 
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
 
      // Create a failure notification — never crash the handler
      try {
        await this.notificationsService.createNotification({
          userId: payload.customerId,
          reportId: payload.reportId,
          type: NotificationType.AUTO_REFUND_PROCESSED,
          title: 'Refund processing failed',
          message:
            'We encountered an issue processing your refund. Our team has been alerted and will resolve this shortly.',
          emailBody: null,
          emailSubject: null,
          sendEmail: false,
        });
      } catch (notifErr) {
        this.logger.error('Failed to create failure notification', notifErr);
      }
    }
  }
 
  private async _processRefundInternal(
    payload: AutoResolvedPayload,
  ): Promise<void> {
    // 1. Fetch tenant for Razorpay keys
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: payload.tenantId },
      select: {
        razorpayKeyId: true,
        razorpayKeySecret: true,
      },
    });
 
    // 2. Fetch customer email
    const customer = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.customerId },
      select: { email: true, name: true },
    });
 
    // 3. Fetch report for order info
    const report = await this.prisma.report.findUniqueOrThrow({
      where: { id: payload.reportId },
      select: { shopifyOrderId: true },
    });
 
    // 4. Process refund (mock or real)
    let razorpayRefundId: string;
    const isMock = process.env.RAZORPAY_MOCK === 'true';
 
    if (isMock) {
      razorpayRefundId = `rfnd_MOCK_${Date.now()}`;
      this.logger.log(
        `[MOCK] Generated fake refund ID: ${razorpayRefundId}`,
      );
    } else {
      if (!payload.razorpayOrderId) {
        throw new Error(
          `Cannot process real refund: no razorpayOrderId for report ${payload.reportId}`,
        );
      }
 
      const razorpay = new Razorpay({
        key_id: tenant.razorpayKeyId!,
        key_secret: tenant.razorpayKeySecret!,
      });
 
      // razorpayOrderId is used as the paymentId in this flow
      const refund = await razorpay.payments.refund(payload.razorpayOrderId, {
        amount: payload.refundAmount,
        speed: 'normal',
        notes: { reportId: payload.reportId },
      });
 
      razorpayRefundId = refund.id;
    }
 
    // 5. Update report refund fields
    await this.prisma.report.update({
      where: { id: payload.reportId },
      data: {
        refundInitiated: true,
        refundInitiatedAt: new Date(),
        razorpayRefundId,
      },
    });
 
    // 6. Build readable amounts / order info
    const amountInRupees = (payload.refundAmount / 100).toFixed(2);
    const orderNumber = report.shopifyOrderId ?? payload.shopifyOrderId;
 
    // 7. Duplicate-guard then notify customer
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
        <p>Razorpay Refund ID: <code>${razorpayRefundId}</code></p>
      `,
      customerEmail: customer.email,
    });
 
    // 8. Write audit log
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
 
    this.logger.log(
      `Refund complete for report ${payload.reportId} — ID: ${razorpayRefundId}`,
    );
  }
}