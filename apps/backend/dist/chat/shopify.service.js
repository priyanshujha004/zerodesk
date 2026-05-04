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
var ShopifyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MOCK_ORDER = {
    orderNumber: '#4521',
    customerName: 'Rahul Sharma',
    customerEmail: 'customer@shopease.com',
    totalAmount: 240000,
    lineItems: [{ title: 'SoundMax Pro Wireless Headphones', quantity: 1, price: 240000, vendor: 'SoundMax' }],
    fulfillmentStatus: 'fulfilled',
    financialStatus: 'paid',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    daysSinceOrder: 3,
    shopifyOrderId: 'mock_shopify_id_4521',
};
let ShopifyService = ShopifyService_1 = class ShopifyService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ShopifyService_1.name);
        this.isMock = process.env.SHOPIFY_MOCK === 'true';
    }
    calcDays(isoDate) {
        return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
    }
    mapShopifyOrder(o, tenantId) {
        const totalPaise = Math.round(parseFloat(o.total_price) * 100);
        const name = o.customer
            ? `${o.customer.first_name} ${o.customer.last_name}`.trim()
            : o.email;
        return {
            tenantId,
            shopifyOrderId: String(o.id),
            orderNumber: o.name,
            customerEmail: o.email,
            customerName: name,
            totalAmount: totalPaise,
            currency: o.currency ?? 'INR',
            lineItems: o.line_items.map((li) => ({
                title: li.title,
                quantity: li.quantity,
                price: Math.round(parseFloat(li.price) * 100),
                vendor: li.vendor,
            })),
            fulfillmentStatus: o.fulfillment_status ?? 'unfulfilled',
            financialStatus: o.financial_status,
            createdAt: new Date(o.created_at),
            daysSinceOrder: this.calcDays(o.created_at),
        };
    }
    async getTenantShopifyConfig(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new Error(`Tenant ${tenantId} not found`);
        return tenant;
    }
    async fetchFromShopify(url, accessToken) {
        const res = await fetch(url, {
            headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
        });
        if (!res.ok)
            throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
        return res.json();
    }
    async upsertCache(mapped) {
        const { daysSinceOrder: _, ...data } = mapped;
        return this.prisma.cachedOrder.upsert({
            where: { tenantId_shopifyOrderId: { tenantId: data.tenantId, shopifyOrderId: data.shopifyOrderId } },
            update: { ...data, cachedAt: new Date() },
            create: data,
        });
    }
    toMappedOrder(row) {
        return {
            orderNumber: row.orderNumber,
            customerName: row.customerName,
            customerEmail: row.customerEmail,
            totalAmount: row.totalAmount,
            lineItems: row.lineItems,
            fulfillmentStatus: row.fulfillmentStatus,
            financialStatus: row.financialStatus,
            createdAt: row.createdAt.toISOString(),
            daysSinceOrder: this.calcDays(row.createdAt.toISOString()),
            shopifyOrderId: row.shopifyOrderId,
        };
    }
    async getOrderByNumber(tenantId, orderNumber) {
        if (this.isMock) {
            const normalized = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
            return normalized === '#4521' ? MOCK_ORDER : null;
        }
        const cached = await this.prisma.cachedOrder.findFirst({
            where: { tenantId, orderNumber },
        });
        if (cached)
            return this.toMappedOrder(cached);
        const tenant = await this.getTenantShopifyConfig(tenantId);
        const url = `https://${tenant.shopifyStoreDomain}/admin/api/2024-01/orders.json?name=${encodeURIComponent(orderNumber)}&status=any`;
        const data = await this.fetchFromShopify(url, tenant.shopifyAccessToken);
        if (!data.orders.length)
            return null;
        const mapped = this.mapShopifyOrder(data.orders[0], tenantId);
        await this.upsertCache(mapped);
        const result = {
            orderNumber: mapped.orderNumber,
            customerName: mapped.customerName,
            customerEmail: mapped.customerEmail,
            totalAmount: mapped.totalAmount,
            lineItems: mapped.lineItems,
            fulfillmentStatus: mapped.fulfillmentStatus,
            financialStatus: mapped.financialStatus,
            createdAt: mapped.createdAt.toISOString(),
            daysSinceOrder: mapped.daysSinceOrder,
            shopifyOrderId: mapped.shopifyOrderId,
        };
        return result;
    }
    async getOrdersByEmail(tenantId, email) {
        if (this.isMock)
            return MOCK_ORDER.customerEmail === email ? [MOCK_ORDER] : [];
        const cached = await this.prisma.cachedOrder.findMany({
            where: { tenantId, customerEmail: email },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        if (cached.length)
            return cached.map((r) => this.toMappedOrder(r));
        const tenant = await this.getTenantShopifyConfig(tenantId);
        const url = `https://${tenant.shopifyStoreDomain}/admin/api/2024-01/orders.json?email=${encodeURIComponent(email)}&status=any&limit=5`;
        const data = await this.fetchFromShopify(url, tenant.shopifyAccessToken);
        const results = [];
        for (const o of data.orders) {
            const mapped = this.mapShopifyOrder(o, tenantId);
            await this.upsertCache(mapped);
            const result = {
                orderNumber: mapped.orderNumber,
                customerName: mapped.customerName,
                customerEmail: mapped.customerEmail,
                totalAmount: mapped.totalAmount,
                lineItems: mapped.lineItems,
                fulfillmentStatus: mapped.fulfillmentStatus,
                financialStatus: mapped.financialStatus,
                createdAt: mapped.createdAt.toISOString(),
                daysSinceOrder: mapped.daysSinceOrder,
                shopifyOrderId: mapped.shopifyOrderId,
            };
            results.push(result);
        }
        return results;
    }
};
exports.ShopifyService = ShopifyService;
exports.ShopifyService = ShopifyService = ShopifyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShopifyService);
//# sourceMappingURL=shopify.service.js.map