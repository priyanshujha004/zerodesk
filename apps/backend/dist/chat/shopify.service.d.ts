import { PrismaService } from '../prisma/prisma.service';
export interface MappedOrder {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    lineItems: {
        title: string;
        quantity: number;
        price: number;
        vendor: string;
    }[];
    fulfillmentStatus: string;
    financialStatus: string;
    createdAt: string;
    daysSinceOrder: number;
    shopifyOrderId: string;
}
export declare class ShopifyService {
    private readonly prisma;
    private readonly logger;
    private readonly isMock;
    constructor(prisma: PrismaService);
    private calcDays;
    private mapShopifyOrder;
    private getTenantShopifyConfig;
    private fetchFromShopify;
    private upsertCache;
    private toMappedOrder;
    getOrderByNumber(tenantId: string, orderNumber: string): Promise<MappedOrder | null>;
    getOrdersByEmail(tenantId: string, email: string): Promise<MappedOrder[]>;
}
