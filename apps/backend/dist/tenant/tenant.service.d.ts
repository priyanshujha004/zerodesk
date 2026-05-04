import { PrismaService } from '../prisma/prisma.service';
export declare class TenantService {
    private prisma;
    constructor(prisma: PrismaService);
    getConfig(tenantId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        departments: {
            id: string;
            name: string;
            description: string;
        }[];
        aiPersona: string;
        primaryColor: string;
        plan: import(".prisma/client").$Enums.TenantPlan;
        returnPolicy: {
            returnWindowDays: number;
            autoApproveBelow: number;
            allowedReasons: string[];
            nonReturnableCategories: string[];
        };
    }>;
    getSettings(tenantId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        apiKey: string;
        primaryColor: string;
        logoUrl: string;
        aiPersona: string;
        aiSystemPrompt: string;
        plan: import(".prisma/client").$Enums.TenantPlan;
        reportLimit: number;
        reportsThisMonth: number;
        ownerEmail: string;
        supportEmail: string;
        isActive: boolean;
        shopifyStoreDomain: string;
        departments: {
            id: string;
            name: string;
            email: string;
            description: string;
        }[];
        returnPolicy: {
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            returnWindowDays: number;
            autoApproveBelow: number;
            autoApproveConfidence: number;
            allowedReasons: string[];
            nonReturnableCategories: string[];
        };
        createdAt: Date;
        updatedAt: Date;
    }>;
}
