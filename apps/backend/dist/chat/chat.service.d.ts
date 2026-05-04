import { PrismaService } from '../prisma/prisma.service';
import { ShopifyService, MappedOrder } from './shopify.service';
import { Response } from 'express';
type OrderContext = MappedOrder;
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
export declare class ChatService {
    private readonly prisma;
    private readonly shopifyService;
    private readonly logger;
    private readonly anthropic;
    private readonly mailer;
    constructor(prisma: PrismaService, shopifyService: ShopifyService);
    sendOtp(email: string): Promise<{
        sent: boolean;
    }>;
    verifyOtp(email: string, code: string): Promise<{
        valid: boolean;
    }>;
    startConversation(tenantId: string, customerId: string): Promise<{
        conversationId: string;
    }>;
    lookupOrder(tenantId: string, orderNumber: string): Promise<MappedOrder | null>;
    getOrdersByEmail(tenantId: string, email: string): Promise<MappedOrder[]>;
    private buildInitialSystemPrompt;
    private buildOrderSystemPrompt;
    private extractReport;
    private extractNeedOrder;
    private getTenantMeta;
    streamMessage(conversationId: string, messages: ChatMessage[], res: Response, orderContext?: OrderContext, customerEmail?: string): Promise<void>;
    streamGeminiMessage(messages: ChatMessage[], res: Response, orderContext?: OrderContext, customerEmail?: string, tenantId?: string): Promise<void>;
}
export {};
