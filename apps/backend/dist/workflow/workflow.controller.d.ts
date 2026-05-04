import { WorkflowService } from './workflow.service';
import { EscalationDecision, Role } from '@prisma/client';
interface AuthRequest {
    user: {
        sub: string;
        role: Role;
        tenantId: string;
        deptId?: string;
    };
}
export declare class WorkflowController {
    private readonly workflowService;
    constructor(workflowService: WorkflowService);
    approve(reportId: string, note: string | undefined, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    reject(reportId: string, note: string, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    action(reportId: string, note: string, actionTaken: string, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    escalate(reportId: string, reason: string, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    resolve(reportId: string, decision: EscalationDecision, note: string, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    acknowledge(reportId: string, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    infoRequest(reportId: string, note: string, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    customerRespond(reportId: string, note: string, req: AuthRequest): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
}
export {};
