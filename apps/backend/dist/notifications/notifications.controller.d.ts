import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
interface JwtRequest {
    user: {
        sub: string;
    };
}
export declare class NotificationsController {
    private readonly eventEmitter;
    private readonly svc;
    constructor(eventEmitter: EventEmitter2, svc: NotificationsService);
    getUnread(req: JwtRequest): Promise<{
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
    markRead(id: string, req: JwtRequest): Promise<{
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
    markAllRead(req: JwtRequest): Promise<{
        count: number;
    }>;
    testRefund(): Promise<{
        ok: boolean;
    }>;
}
export {};
