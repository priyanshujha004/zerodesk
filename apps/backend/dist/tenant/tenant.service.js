"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TenantService = class TenantService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getConfig(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                departments: {
                    where: { isActive: true },
                    select: { id: true, name: true, description: true },
                },
                returnPolicy: {
                    select: {
                        returnWindowDays: true,
                        allowedReasons: true,
                        autoApproveBelow: true,
                        nonReturnableCategories: true,
                    },
                },
            },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            departments: tenant.departments,
            aiPersona: tenant.aiPersona,
            primaryColor: tenant.primaryColor,
            plan: tenant.plan,
            returnPolicy: tenant.returnPolicy,
        };
    }
    async getSettings(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                departments: {
                    where: { isActive: true },
                    select: { id: true, name: true, description: true, email: true },
                },
                returnPolicy: true,
            },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            apiKey: tenant.apiKey,
            primaryColor: tenant.primaryColor,
            logoUrl: tenant.logoUrl,
            aiPersona: tenant.aiPersona,
            aiSystemPrompt: tenant.aiSystemPrompt,
            plan: tenant.plan,
            reportLimit: tenant.reportLimit,
            reportsThisMonth: tenant.reportsThisMonth,
            ownerEmail: tenant.ownerEmail,
            supportEmail: tenant.supportEmail,
            isActive: tenant.isActive,
            shopifyStoreDomain: tenant.shopifyStoreDomain,
            departments: tenant.departments,
            returnPolicy: tenant.returnPolicy,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
        };
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map