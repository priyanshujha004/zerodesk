import { ChatService } from './chat.service';
import { MappedOrder } from './shopify.service';
import { Response } from 'express';
interface StartBody {
    tenantId: string;
    customerId: string;
}
interface OtpBody {
    email: string;
}
interface VerifyBody {
    email: string;
    code: string;
}
interface LookupEmailBody {
    tenantId: string;
    email: string;
}
interface LookupOrderBody {
    tenantId: string;
    orderNumber: string;
}
interface MessageBody {
    conversationId: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    orderContext?: MappedOrder;
    customerEmail?: string;
}
interface GeminiMessageBody {
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    orderContext?: MappedOrder;
    customerEmail?: string;
    tenantId?: string;
}
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    sendOtp(body: OtpBody): Promise<{
        sent: boolean;
    }>;
    geminiMessage(body: GeminiMessageBody, res: Response): Promise<void>;
    verifyOtp(body: VerifyBody): Promise<{
        valid: boolean;
    }>;
    ordersByEmail(body: LookupEmailBody): Promise<MappedOrder[]>;
    start(body: StartBody): Promise<{
        conversationId: string;
    }>;
    lookupOrder(body: LookupOrderBody): Promise<MappedOrder | {
        error: string;
    }>;
    message(body: MessageBody, res: Response): Promise<void>;
}
export {};
