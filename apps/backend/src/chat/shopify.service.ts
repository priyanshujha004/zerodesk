import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CachedOrder } from '@prisma/client';

interface ShopifyLineItem {
  title: string;
  quantity: number;
  price: string;
  vendor: string;
}

interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  customer: { first_name: string; last_name: string } | null;
  total_price: string;
  currency: string;
  line_items: ShopifyLineItem[];
  fulfillment_status: string | null;
  financial_status: string;
  created_at: string;
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

export interface MappedOrder {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  lineItems: { title: string; quantity: number; price: number; vendor: string }[];
  fulfillmentStatus: string;
  financialStatus: string;
  createdAt: string;
  daysSinceOrder: number;
  shopifyOrderId: string;
}

const MOCK_ORDER: MappedOrder = {
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

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly isMock = process.env.SHOPIFY_MOCK === 'true';

  constructor(private readonly prisma: PrismaService) {}

  private calcDays(isoDate: string): number {
    return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
  }

  private mapShopifyOrder(o: ShopifyOrder, tenantId: string): Omit<CachedOrder, 'id' | 'cachedAt'> & { daysSinceOrder: number } {
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

  private async getTenantShopifyConfig(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    return tenant;
  }

  private async fetchFromShopify(url: string, accessToken: string): Promise<ShopifyOrdersResponse> {
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<ShopifyOrdersResponse>;
  }

  private async upsertCache(
    mapped: Omit<CachedOrder, 'id' | 'cachedAt'> & { daysSinceOrder: number },
  ): Promise<CachedOrder> {
    const { daysSinceOrder: _, ...data } = mapped;
    return this.prisma.cachedOrder.upsert({
      where: { tenantId_shopifyOrderId: { tenantId: data.tenantId, shopifyOrderId: data.shopifyOrderId } },
      update: { ...data, cachedAt: new Date() },
      create: data,
    });
  }

  // 2. toMappedOrder — cast lineItems explicitly
    private toMappedOrder(row: CachedOrder): MappedOrder {
    return {
        orderNumber: row.orderNumber,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        totalAmount: row.totalAmount,
        lineItems: row.lineItems as MappedOrder['lineItems'],
        fulfillmentStatus: row.fulfillmentStatus,
        financialStatus: row.financialStatus,
        createdAt: row.createdAt.toISOString(),
        daysSinceOrder: this.calcDays(row.createdAt.toISOString()),
        shopifyOrderId: row.shopifyOrderId,
    };
    }

  async getOrderByNumber(tenantId: string, orderNumber: string): Promise<MappedOrder | null> {
    if (this.isMock) {
      const normalized = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
      return normalized === '#4521' ? MOCK_ORDER : null;
    }

    const cached = await this.prisma.cachedOrder.findFirst({
      where: { tenantId, orderNumber },
    });
    if (cached) return this.toMappedOrder(cached);

    const tenant = await this.getTenantShopifyConfig(tenantId);
    const url = `https://${tenant.shopifyStoreDomain}/admin/api/2024-01/orders.json?name=${encodeURIComponent(orderNumber)}&status=any`;
    const data = await this.fetchFromShopify(url, tenant.shopifyAccessToken);

    if (!data.orders.length) return null;

    // 3. getOrderByNumber — build return value explicitly typed
    const mapped = this.mapShopifyOrder(data.orders[0], tenantId);
    await this.upsertCache(mapped);
    const result: MappedOrder = {
      orderNumber: mapped.orderNumber,
      customerName: mapped.customerName,
      customerEmail: mapped.customerEmail,
      totalAmount: mapped.totalAmount,
      lineItems: mapped.lineItems as MappedOrder['lineItems'],
      fulfillmentStatus: mapped.fulfillmentStatus,
      financialStatus: mapped.financialStatus,
      createdAt: mapped.createdAt.toISOString(),
      daysSinceOrder: mapped.daysSinceOrder,
      shopifyOrderId: mapped.shopifyOrderId,
    };
    return result;
  }

  async getOrdersByEmail(tenantId: string, email: string): Promise<MappedOrder[]> {
    if (this.isMock) return MOCK_ORDER.customerEmail === email ? [MOCK_ORDER] : [];

    const cached = await this.prisma.cachedOrder.findMany({
        where: { tenantId, customerEmail: email },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });
    if (cached.length) return cached.map((r) => this.toMappedOrder(r));

    const tenant = await this.getTenantShopifyConfig(tenantId);
    const url = `https://${tenant.shopifyStoreDomain}/admin/api/2024-01/orders.json?email=${encodeURIComponent(email)}&status=any&limit=5`;
    const data = await this.fetchFromShopify(url, tenant.shopifyAccessToken);

    const results: MappedOrder[] = [];
    for (const o of data.orders) {
        const mapped = this.mapShopifyOrder(o, tenantId);
        await this.upsertCache(mapped);
          const result: MappedOrder = {
          orderNumber: mapped.orderNumber,
          customerName: mapped.customerName,
          customerEmail: mapped.customerEmail,
          totalAmount: mapped.totalAmount,
          lineItems: mapped.lineItems as MappedOrder['lineItems'],
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
}