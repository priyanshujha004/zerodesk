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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const shopify_service_1 = require("./shopify.service");
const resend_1 = require("resend");
const DEFAULT_POLICY = {
    returnWindowDays: 30,
    allowedReasons: ['defective', 'wrong item', 'not as described', 'damaged in shipping', 'changed mind'],
    nonReturnableCategories: ['perishables', 'digital downloads', 'gift cards'],
    autoApproveBelow: 500000,
};
const otpStore = new Map();
let ChatService = ChatService_1 = class ChatService {
    constructor(prisma, shopifyService) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
        this.logger = new common_1.Logger(ChatService_1.name);
        this.anthropic = new sdk_1.default();
        this.resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    }
    async sendOtp(email) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
        this.logger.log(`[OTP] ${email} → ${code}`);
        try {
            await this.resend.emails.send({
                from: 'onboarding@resend.dev',
                to: email,
                subject: 'Your ShopEase verification code',
                html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
            <h2 style="color:#0a0a0f;margin-bottom:4px">ShopEase Support</h2>
            <p style="color:#666;margin-top:0">Your verification code:</p>
            <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#059669;padding:20px 0">${code}</div>
            <p style="color:#999;font-size:13px">Valid for 10 minutes. Do not share this code.</p>
          </div>`,
            });
            this.logger.log(`[OTP] Email sent to ${email}`);
        }
        catch (err) {
            this.logger.error(`[OTP] Resend failed for ${email}`, err);
        }
        return { sent: true };
    }
    async verifyOtp(email, code) {
        const entry = otpStore.get(email);
        if (!entry)
            return { valid: false };
        if (Date.now() > entry.expiresAt) {
            otpStore.delete(email);
            return { valid: false };
        }
        if (entry.code !== code)
            return { valid: false };
        otpStore.delete(email);
        return { valid: true };
    }
    async startConversation(tenantId, customerId) {
        const conversation = await this.prisma.conversation.create({
            data: { tenantId, customerId, modelUsed: 'gemini-2.5-flash', createdAt: new Date(), updatedAt: new Date() },
        });
        return { conversationId: conversation.id };
    }
    async lookupOrder(tenantId, orderNumber) {
        return this.shopifyService.getOrderByNumber(tenantId, orderNumber);
    }
    async getOrdersByEmail(tenantId, email) {
        return this.shopifyService.getOrdersByEmail(tenantId, email);
    }
    async getTenantMeta(tenantId) {
        let tenantName = 'ShopEase';
        let aiPersona = 'Aria, a friendly AI support agent';
        let policy = DEFAULT_POLICY;
        try {
            const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
            if (tenant) {
                tenantName = tenant.name ?? tenantName;
                const t = tenant;
                if (t.aiPersona)
                    aiPersona = t.aiPersona;
                if (t.returnPolicy)
                    policy = t.returnPolicy;
            }
        }
        catch {
            this.logger.warn('Tenant fetch failed, using defaults');
        }
        return { tenantName, aiPersona, policy };
    }
    extractReport(text) {
        const open = text.indexOf('<report>');
        const close = text.indexOf('</report>');
        if (open === -1 || close === -1)
            return null;
        try {
            return JSON.parse(text.slice(open + 8, close).trim());
        }
        catch {
            return null;
        }
    }
    async streamGeminiMessage(messages, res, orderContext, customerEmail, tenantId) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        this.logger.log(`Gemini key present: ${!!process.env.GEMINI_API_KEY}, length: ${process.env.GEMINI_API_KEY?.length}`);
        const policy = DEFAULT_POLICY;
        const systemPrompt = orderContext
            ? `You are Aria, a friendly AI support agent for ShopEase — an online electronics store.

You are helping: ${orderContext.customerName}

THEIR ORDER:
- Order: ${orderContext.orderNumber}
- Items: ${orderContext.lineItems.map(li => `${li.quantity}x ${li.title}`).join(', ')}
- Total: ₹${(orderContext.totalAmount / 100).toLocaleString('en-IN')}
- Ordered: ${orderContext.daysSinceOrder} days ago
- Delivery: ${orderContext.fulfillmentStatus}
- Payment: ${orderContext.financialStatus}

RETURN POLICY:
- 30-day return window from delivery
- Accepted reasons: defective, wrong item, not as described, damaged in shipping
- Non-returnable: earbuds (hygiene), gift cards
- Refunds in 5-7 business days

ROUTING RULES (you must follow these exactly):
- Wrong item / delivery issue → routeToDept: "Logistics"
- Refund / defective product → routeToDept: "Finance"  
- Complaint / bad experience → routeToDept: "CustomerCare"
- Account / data issue → routeToDept: "HR"

YOUR STRICT RULES:
1. Maximum 2 exchanges to understand the issue
2. NEVER say goodbye or close the chat
3. NEVER give a reference number
4. After understanding the issue, IMMEDIATELY output the report
5. The <report> tag is MANDATORY — you cannot end without it

AFTER YOUR RESPONSE, YOU MUST OUTPUT THIS EXACT FORMAT:
<report>
{"issueType":"REFUND","issueSummary":"brief summary here","actionRequested":"action here","routeToDept":"Finance","priority":"HIGH","aiConfidence":0.92,"eligible":true,"eligibilityReason":"reason here","recommendedAction":"AUTO_REFUND","refundAmount":${orderContext.totalAmount},"shopifyOrderId":"${orderContext.shopifyOrderId ?? ''}"}
</report>

Fill in the actual values. routeToDept MUST match the routing rules above. This is not optional.`
            : `You are Aria, a friendly AI support agent for ShopEase — an online electronics store.

You can help with:
- Return & refund requests
- Order status and tracking
- Product complaints
- General store policies

RETURN POLICY:
- 30-day return window
- Defective, wrong item, damaged: fully eligible
- Earbuds and gift cards: not returnable
- Refunds take 5-7 business days

HOW YOU WORK:
- For general questions: answer directly, NO email needed
- For order-specific help: emit <need_email/> to get their email
- Keep replies short — max 2-3 sentences
- Be warm and human

When you need order details, emit on its own line: <need_email/>

CRITICAL REPORT RULE:
Once you have order context AND know the issue, you MUST output <report></report> tags.
NEVER say goodbye. NEVER close chat. ALWAYS end with <report>.

Example:
Customer: "my headphones stopped working"
You: "So sorry! I need to verify your email to look up your order. <need_email/>"

Customer: "what is your return policy"
You: "We offer a 30-day return window on most electronics. Defective or wrong items are fully covered. Anything specific I can help with?"`;
        try {
            const safeMessages = Array.isArray(messages) ? messages : [];
            const geminiMessages = safeMessages
                .filter(m => m?.content?.trim() !== '')
                .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));
            if (geminiMessages.length === 0) {
                geminiMessages.push({ role: 'user', parts: [{ text: 'Hello, please greet me.' }] });
            }
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`;
            const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: geminiMessages,
                    generationConfig: { maxOutputTokens: 1500, temperature: 0.4 },
                }),
            });
            if (!geminiRes.ok || !geminiRes.body) {
                const errText = await geminiRes.text();
                this.logger.error(`Gemini API failed: ${geminiRes.status} ${errText}`);
                res.write(`data: ${JSON.stringify({ error: 'Gemini API error' })}\n\n`);
                res.end();
                return;
            }
            const reader = geminiRes.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: '))
                        continue;
                    const raw = line.slice(6).trim();
                    if (raw === '[DONE]')
                        continue;
                    try {
                        const parsed = JSON.parse(raw);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                        if (text) {
                            fullText += text;
                            const visible = text.replace('<need_email/>', '').replace(/<report>[\s\S]*?<\/report>/g, '');
                            if (visible.trim())
                                res.write(`data: ${JSON.stringify({ text: visible })}\n\n`);
                        }
                    }
                    catch { }
                }
            }
            const reportJson = this.extractReport(fullText);
            if (reportJson) {
                this.logger.log(`Report generated: ${JSON.stringify(reportJson)}`);
                res.write(`data: ${JSON.stringify({ reportJson })}\n\n`);
            }
            const needsEmail = fullText.includes('<need_email/>');
            if (needsEmail)
                res.write(`data: ${JSON.stringify({ needsEmail: true })}\n\n`);
            res.write('data: [DONE]\n\n');
        }
        catch (err) {
            this.logger.error('Gemini stream error', err);
            res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        }
        finally {
            res.end();
        }
    }
    async streamMessage(conversationId, messages, res, orderContext, customerEmail) {
        res.write(`data: ${JSON.stringify({ error: 'Use gemini-message endpoint' })}\n\n`);
        res.end();
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService])
], ChatService);
//# sourceMappingURL=chat.service.js.map