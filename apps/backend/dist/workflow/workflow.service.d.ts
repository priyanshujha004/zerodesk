import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EscalationDecision, Role } from '@prisma/client';
interface JwtUser {
    sub: string;
    role: Role;
    tenantId: string;
    deptId?: string;
}
export declare class WorkflowService {
    private readonly prisma;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    private emit;
    private getReport;
    approve(reportId: string, user: JwtUser, note?: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    reject(reportId: string, user: JwtUser, note: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    action(reportId: string, user: JwtUser, note: string, actionTaken: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    escalate(reportId: string, user: JwtUser, reason: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    resolve(reportId: string, user: JwtUser, decision: EscalationDecision, note: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    acknowledge(reportId: string, user: JwtUser): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    infoRequest(reportId: string, user: JwtUser, note: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    customerRespond(reportId: string, user: JwtUser, note: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
}
export {};
