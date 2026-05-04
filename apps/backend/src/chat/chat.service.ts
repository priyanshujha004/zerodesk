import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { ShopifyService, MappedOrder } from './shopify.service';
import { Response } from 'express';
import { Resend } from 'resend';

type OrderContext = MappedOrder;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ReturnPolicy {
  returnWindowDays: number;
  allowedReasons: string[];
  nonReturnableCategories: string[];
  autoApproveBelow: number;
}

const DEFAULT_POLICY: ReturnPolicy = {
  returnWindowDays: 30,
  allowedReasons: ['defective', 'wrong item', 'not as described', 'damaged in shipping', 'changed mind'],
  nonReturnableCategories: ['perishables', 'digital downloads', 'gift cards'],
  autoApproveBelow: 500000,
};

const otpStore = new Map<string, { code: string; expiresAt: number }>();

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly anthropic = new Anthropic();
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shopifyService: ShopifyService,
  ) {}

  async sendOtp(email: string): Promise<{ sent: boolean }> {
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
    } catch (err) {
      this.logger.error(`[OTP] Resend failed for ${email}`, err);
    }

    return { sent: true };
  }

  async verifyOtp(email: string, code: string): Promise<{ valid: boolean }> {
    const entry = otpStore.get(email);
    if (!entry) return { valid: false };
    if (Date.now() > entry.expiresAt) { otpStore.delete(email); return { valid: false }; }
    if (entry.code !== code) return { valid: false };
    otpStore.delete(email);
    return { valid: true };
  }

  async startConversation(tenantId: string, customerId: string): Promise<{ conversationId: string }> {
    const conversation = await this.prisma.conversation.create({
      data: { tenantId, customerId, modelUsed: 'gemini-2.5-flash', createdAt: new Date(), updatedAt: new Date() },
    });
    return { conversationId: conversation.id };
  }

  async lookupOrder(tenantId: string, orderNumber: string): Promise<MappedOrder | null> {
    return this.shopifyService.getOrderByNumber(tenantId, orderNumber);
  }

  async getOrdersByEmail(tenantId: string, email: string): Promise<MappedOrder[]> {
    return this.shopifyService.getOrdersByEmail(tenantId, email);
  }

  private async getTenantMeta(tenantId: string) {
    let tenantName = 'ShopEase';
    let aiPersona = 'Aria, a friendly AI support agent';
    let policy = DEFAULT_POLICY;
    try {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        tenantName = tenant.name ?? tenantName;
        const t = tenant as Record<string, unknown>;
        if (t.aiPersona) aiPersona = t.aiPersona as string;
        if (t.returnPolicy) policy = t.returnPolicy as ReturnPolicy;
      }
    } catch { this.logger.warn('Tenant fetch failed, using defaults'); }
    return { tenantName, aiPersona, policy };
  }

  private extractReport(text: string): object | null {
    const open = text.indexOf('<report>');
    const close = text.indexOf('</report>');
    if (open === -1 || close === -1) return null;
    try { return JSON.parse(text.slice(open + 8, close).trim()) as object; }
    catch { return null; }
  }

  async streamGeminiMessage(
    messages: ChatMessage[],
    res: Response,
    orderContext?: OrderContext,
    customerEmail?: string,
    tenantId?: string,
  ): Promise<void> {
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
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (text) {
              fullText += text;
              // Stream visible text (strip signals)
              const visible = text.replace('<need_email/>', '').replace(/<report>[\s\S]*?<\/report>/g, '');
              if (visible.trim()) res.write(`data: ${JSON.stringify({ text: visible })}\n\n`);
            }
          } catch { /* skip */ }
        }
      }

      // Extract and send report
      const reportJson = this.extractReport(fullText);
      if (reportJson) {
        this.logger.log(`Report generated: ${JSON.stringify(reportJson)}`);
        res.write(`data: ${JSON.stringify({ reportJson })}\n\n`);
      }

      // Send email signal
      const needsEmail = fullText.includes('<need_email/>');
      if (needsEmail) res.write(`data: ${JSON.stringify({ needsEmail: true })}\n\n`);

      res.write('data: [DONE]\n\n');
    } catch (err) {
      this.logger.error('Gemini stream error', err);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  // Keep streamMessage for Claude (department side) if needed
  async streamMessage(
    conversationId: string,
    messages: ChatMessage[],
    res: Response,
    orderContext?: OrderContext,
    customerEmail?: string,
  ): Promise<void> {
    res.write(`data: ${JSON.stringify({ error: 'Use gemini-message endpoint' })}\n\n`);
    res.end();
  }
}