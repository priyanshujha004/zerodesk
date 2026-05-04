import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
interface StatusChangedPayload {
    reportId: string;
    newStatus: string;
    customerId: string;
    actorId: string;
    tenantId: string;
    note: string | null;
    deptAdminId: string | null;
}
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
export declare class NotificationsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleStatusChanged(payload: StatusChangedPayload): Promise<void>;
    private _routeStatusNotification;
    createNotification(input: CreateNotificationInput): Promise<void>;
    getUnread(userId: string): Promise<{
        count: number;
        items: {
            message: string;
            id: string;
            createdAt: Date;
            userId: string;
            title: string;
            reportId: string | null;
            type: import(".prisma/client").$Enums.NotificationType;
            actionUrl: string | null;
            read: boolean;
            readAt: Date | null;
            emailSent: boolean;
            emailSentAt: Date | null;
            emailId: string | null;
        }[];
    }>;
    markRead(notificationId: string, userId: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        title: string;
        reportId: string | null;
        type: import(".prisma/client").$Enums.NotificationType;
        actionUrl: string | null;
        read: boolean;
        readAt: Date | null;
        emailSent: boolean;
        emailSentAt: Date | null;
        emailId: string | null;
    }>;
    markAllRead(userId: string): Promise<{
        count: number;
    }>;
    private _wrapEmailTemplate;
}
export {};
