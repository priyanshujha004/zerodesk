import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
interface AutoResolvedPayload {
    reportId: string;
    customerId: string;
    tenantId: string;
    refundAmount: number;
    shopifyOrderId: string;
    razorpayOrderId: string | null;
}
export declare class RefundService {
    private readonly prisma;
    private readonly notificationsService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    processRefund(payload: AutoResolvedPayload): Promise<void>;
    private _processRefundInternal;
}
export {};
