import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IssueType, Priority, ReportStatus, Role } from '@prisma/client';
interface CreateReportDto {
    tenantId: string;
    customerId: string;
    conversationId: string;
    issueType: IssueType;
    issueSummary: string;
    actionRequested: string;
    routeToDeptName: string;
    priority: Priority;
    aiConfidence: number;
    rawConversation: object[];
}
interface ListReportsQuery {
    status?: ReportStatus;
    deptId?: string;
    priority?: Priority;
    page?: number;
    limit?: number;
}
interface JwtUser {
    sub: string;
    role: Role;
    tenantId: string;
    deptId?: string;
}
export declare class ReportsService {
    private readonly prisma;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(dto: CreateReportDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        createdAt: Date;
    }>;
    list(user: JwtUser, query: ListReportsQuery): Promise<{
        data: {
            id: string;
            tenantId: string;
            customerId: string;
            conversationId: string | null;
            issueType: import(".prisma/client").$Enums.IssueType;
            issueSummary: string;
            actionRequested: string;
            aiConfidence: number | null;
            routeToDeptId: string | null;
            routeToDeptName: string;
            priority: import(".prisma/client").$Enums.Priority;
            status: import(".prisma/client").$Enums.ReportStatus;
            currentActorId: string | null;
            currentActorRole: import(".prisma/client").$Enums.Role | null;
            slaDeadline: Date | null;
            slaBreached: boolean;
            resolution: string | null;
            refundAmount: number | null;
            refundProcessed: boolean;
            rawConversation: import("@prisma/client/runtime/library").JsonValue;
            escalationCount: number;
            lastEscalatedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            shopifyOrderId: string | null;
            shopifyOrderNumber: string | null;
            refundInitiated: boolean;
            refundInitiatedAt: Date | null;
            razorpayRefundId: string | null;
            autoResolved: boolean;
            autoResolveReason: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string, user: JwtUser): Promise<{
        timeline: ({
            actor: {
                id: string;
                name: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            ipAddress: string | null;
            actorRole: import(".prisma/client").$Enums.Role;
            fromStatus: import(".prisma/client").$Enums.ReportStatus | null;
            toStatus: import(".prisma/client").$Enums.ReportStatus;
            note: string | null;
            actionTaken: string | null;
            isSystemEntry: boolean;
            actorId: string;
            reportId: string;
        })[];
        escalations: {
            id: string;
            createdAt: Date;
            reportId: string;
            escalatedById: string;
            escalationReason: string;
            resolvedById: string | null;
            resolvedAt: Date | null;
            resolutionNote: string | null;
            decision: import(".prisma/client").$Enums.EscalationDecision | null;
            level: number;
        }[];
    } & {
        id: string;
        tenantId: string;
        customerId: string;
        conversationId: string | null;
        issueType: import(".prisma/client").$Enums.IssueType;
        issueSummary: string;
        actionRequested: string;
        aiConfidence: number | null;
        routeToDeptId: string | null;
        routeToDeptName: string;
        priority: import(".prisma/client").$Enums.Priority;
        status: import(".prisma/client").$Enums.ReportStatus;
        currentActorId: string | null;
        currentActorRole: import(".prisma/client").$Enums.Role | null;
        slaDeadline: Date | null;
        slaBreached: boolean;
        resolution: string | null;
        refundAmount: number | null;
        refundProcessed: boolean;
        rawConversation: import("@prisma/client/runtime/library").JsonValue;
        escalationCount: number;
        lastEscalatedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        shopifyOrderId: string | null;
        shopifyOrderNumber: string | null;
        refundInitiated: boolean;
        refundInitiatedAt: Date | null;
        razorpayRefundId: string | null;
        autoResolved: boolean;
        autoResolveReason: string | null;
    }>;
}
export {};
