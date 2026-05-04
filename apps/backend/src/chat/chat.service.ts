import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { ShopifyService, MappedOrder } from './shopify.service';
import { Response } from 'express';
import { Resend } from 'resend';
import { url } from 'inspector/promises';
import * as nodemailer from 'nodemailer';

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

// In-memory OTP store — fine for college project, replace with Redis in prod
const otpStore = new Map<string, { code: string; expiresAt: number }>();

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly anthropic = new Anthropic();
  private readonly mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
    },
    });


  constructor(
    private readonly prisma: PrismaService,
    private readonly shopifyService: ShopifyService,
  ) {}

  // ── OTP ──────────────────────────────────────────────────────────────────

     async sendOtp(email: string): Promise<{ sent: boolean }> {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
        this.logger.log(`[OTP] ${email} → ${code}`);

        try {
            await this.mailer.sendMail({
            from: `"ShopEase Support" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Your ShopEase verification code',
            html: `
                <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
                <h2 style="color:#0a0a0f;margin-bottom:4px">ShopEase Support</h2>
                <p style="color:#666;margin-top:0">Your verification code:</p>
                <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#059669;padding:20px 0">
                    ${code}
                </div>
                <p style="color:#999;font-size:13px">Valid for 10 minutes. Do not share this code.</p>
                </div>
            `,
            });
            this.logger.log(`[OTP] Email sent to ${email}`);
        } catch (err) {
            this.logger.error(`[OTP] Email failed for ${email}`, err);
            // code still in logs as fallback
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

  // ── Conversation ──────────────────────────────────────────────────────────

  async startConversation(tenantId: string, customerId: string): Promise<{ conversationId: string }> {
    const conversation = await this.prisma.conversation.create({
      data: {
        tenantId,
        customerId,
        modelUsed: 'claude-sonnet-4-20250514',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return { conversationId: conversation.id };
  }

  async lookupOrder(tenantId: string, orderNumber: string): Promise<MappedOrder | null> {
    return this.shopifyService.getOrderByNumber(tenantId, orderNumber);
  }

  async getOrdersByEmail(tenantId: string, email: string): Promise<MappedOrder[]> {
    return this.shopifyService.getOrdersByEmail(tenantId, email);
  }

  // ── System prompts ────────────────────────────────────────────────────────

  private buildInitialSystemPrompt(customerEmail: string, tenantName: string, aiPersona: string): string {
    return `You are ${aiPersona} for ${tenantName}, an e-commerce support agent specializing in returns and refunds.

CUSTOMER EMAIL: ${customerEmail}
ORDER CONTEXT: Not yet selected by customer.

YOUR JOB RIGHT NOW:
- Greet the customer warmly
- Have a free-form conversation to understand their issue
- Ask about: what product they had a problem with, what happened, how they feel about it
- When you have enough context to need the specific order details (usually after 1-2 exchanges), emit exactly this on its own line:
  <need_order/>
- Do NOT ask for order number — the system will show them a dropdown
- Do NOT make up order details
- Keep responses concise and empathetic

IMPORTANT: Only emit <need_order/> when you genuinely need order details to proceed.`;
  }

  private buildOrderSystemPrompt(
    order: OrderContext,
    policy: ReturnPolicy,
    tenantName: string,
    aiPersona: string,
  ): string {
    const itemsStr = order.lineItems
      .map((li) => `${li.quantity}x ${li.title} — ₹${(li.price / 100).toFixed(2)}`)
      .join(', ');

    return `You are ${aiPersona} for ${tenantName}, an e-commerce support agent specializing in returns and refunds.

ORDER CONTEXT (customer just selected this order):
Order Number: ${order.orderNumber}
Customer: ${order.customerName}
Items: ${itemsStr}
Order Total: ₹${(order.totalAmount / 100).toFixed(2)}
Order Date: ${order.createdAt}
Days Since Order: ${order.daysSinceOrder}
Fulfillment: ${order.fulfillmentStatus}
Payment Status: ${order.financialStatus}

RETURN POLICY:
Return window: ${policy.returnWindowDays} days
Allowed reasons: ${policy.allowedReasons.join(', ')}
Non-returnable: ${policy.nonReturnableCategories.join(', ')}

YOUR JOB NOW:
- You already know the issue from prior conversation
- Maximum 2 more exchanges to confirm details
- Check eligibility against policy
- Then output the report

After confirming details OR immediately if you have enough info, output ONLY this JSON in <report></report> tags:

<report>
{
  "issueType": "REFUND"|"DATA_CHANGE"|"COMPLAINT"|"OTHER",
  "issueSummary": "max 200 chars including order details",
  "actionRequested": "specific action max 100 chars",
  "routeToDept": "Finance"|"Logistics"|"CustomerCare"|"HR",
  "priority": "LOW"|"MEDIUM"|"HIGH",
  "aiConfidence": 0.0,
  "eligible": true,
  "eligibilityReason": "why eligible or not",
  "recommendedAction": "AUTO_REFUND"|"MANUAL_REVIEW"|"REJECT",
  "refundAmount": 0,
  "shopifyOrderId": "${order.shopifyOrderId ?? ''}"
}
</report>

Set recommendedAction:
  AUTO_REFUND   → eligible=true AND confidence >= 0.90 AND refundAmount < ${policy.autoApproveBelow}
  MANUAL_REVIEW → eligible=true but confidence < 0.90 OR refundAmount >= ${policy.autoApproveBelow}
  REJECT        → eligible=false`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private extractReport(text: string): object | null {
    const open = text.indexOf('<report>');
    const close = text.indexOf('</report>');
    if (open === -1 || close === -1) return null;
    try {
      return JSON.parse(text.slice(open + 8, close).trim()) as object;
    } catch { return null; }
  }

  private extractNeedOrder(text: string): boolean {
    return text.includes('<need_order/>');
  }

  private async getTenantMeta(tenantId: string) {
    let tenantName = 'ShopEase';
    let aiPersona = 'an AI support agent';
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

  // ── Stream ────────────────────────────────────────────────────────────────

  async streamMessage(
    conversationId: string,
    messages: ChatMessage[],
    res: Response,
    orderContext?: OrderContext,
    customerEmail?: string,
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      res.write(`data: ${JSON.stringify({ error: 'Conversation not found' })}\n\n`);
      res.end();
      return;
    }

    const { tenantName, aiPersona, policy } = await this.getTenantMeta(conversation.tenantId);

    const systemPrompt = orderContext
      ? this.buildOrderSystemPrompt(orderContext, policy, tenantName, aiPersona)
      : this.buildInitialSystemPrompt(customerEmail ?? 'unknown', tenantName, aiPersona);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = this.anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text;
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
        }
        if (chunk.type === 'message_start') inputTokens = chunk.message.usage.input_tokens;
        if (chunk.type === 'message_delta') outputTokens = chunk.usage.output_tokens;
      }

      const reportJson = this.extractReport(fullText);
      const needsOrder = this.extractNeedOrder(fullText);

      if (reportJson) {
        res.write(`data: ${JSON.stringify({ text: '', reportJson })}\n\n`);
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'REPORT_READY', reportDraftJson: reportJson, turnCount: { increment: 1 }, totalTokens: { increment: inputTokens + outputTokens }, updatedAt: new Date() },
        });
      } else {
        if (needsOrder) res.write(`data: ${JSON.stringify({ needsOrder: true })}\n\n`);
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { turnCount: { increment: 1 }, totalTokens: { increment: inputTokens + outputTokens }, updatedAt: new Date() },
        });
      }

      await this.prisma.message.create({
        data: { conversationId, role: 'assistant', content: fullText, tokenCount: outputTokens, containsReport: !!reportJson, createdAt: new Date() },
      });

      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser) {
        await this.prisma.message.create({
          data: { conversationId, role: 'user', content: lastUser.content, createdAt: new Date() },
        });
      }

      res.write('data: [DONE]\n\n');
    } catch (err) {
      this.logger.error('Stream error', err);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
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

    const policy = DEFAULT_POLICY;
    this.logger.log(`Gemini key present: ${!!process.env.GEMINI_API_KEY}, length: ${process.env.GEMINI_API_KEY?.length}`);

    const systemPrompt = orderContext
        ? `You are Aria, a friendly AI support agent for ShopEase — an online electronics store selling headphones, phones, laptops, and accessories.

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
        - Refunds in 5-7 business days to original payment method

        YOUR JOB:
        1. Be warm, helpful, under 3 sentences per reply
        2. You already know their order — don't ask for order number
        3. For returns: confirm reason → check eligibility → confirm refund amount
        4. For complaints: empathize → resolve or escalate
        5. For tracking: use fulfillment status from order context above

        When you have enough info, end with a clear resolution summary.`

        : `You are Aria, a friendly AI support agent for ShopEase — an online electronics store.

        You can help with:
        - Return & refund requests
        - Order status and tracking  
        - Product complaints
        - General store policies

        RETURN POLICY (answer these confidently):
        - 30-day return window
        - Defective, wrong item, damaged: fully eligible
        - Earbuds and gift cards: not returnable
        - Refunds take 5-7 business days

        HOW YOU WORK:
        - For general questions (policy, how returns work): answer directly, NO email needed
        - For order-specific help (checking their actual order, processing return): you need their email
        - Keep replies short — max 2-3 sentences
        - Be warm and human, not robotic

        When you need their order details to help further, emit exactly this on its own line:
        <need_email/>

        IMPORTANT: Only emit <need_email/> when they have a specific order issue. For general questions, just answer.

        CRITICAL: When you decide to process a return or refund, you MUST output the resolution ONLY as a JSON object wrapped in <report></report> tags. Do NOT describe the refund in plain text. Do NOT make up reference numbers. Output the <report> tag and nothing else after it.

        Example of correct output:
        "I've checked your order and you're eligible for a full refund.
        <report>
        {"issueType":"REFUND","issueSummary":"Customer reported defective headphones order #4521","actionRequested":"Full refund to original payment method","routeToDept":"Finance","priority":"HIGH","aiConfidence":0.95,"eligible":true,"eligibilityReason":"Within 30-day window, defective product","recommendedAction":"AUTO_REFUND","refundAmount":240000,"shopifyOrderId":"mock_shopify_id_4521"}
        </report>"


        Example flow:
        Customer: "my headphones stopped working"
        You: "So sorry to hear that! To look up your order and process a replacement or refund, I just need to verify your email. <need_email/>"

        Customer: "what is your return policy"  
        You: "We offer a 30-day return window on most electronics. Defective or wrong items are fully covered — refunds hit your account in 5-7 business days. Anything specific I can help with?"`;

    try {
        const geminiMessages = messages
            .filter(m => m.content.trim() !== '')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));

            // Add guard after this:
            if (geminiMessages.length === 0) {
            // No messages yet — send a system-level greeting trigger
            geminiMessages.push({ role: 'user', parts: [{ text: 'Hello, please greet me.' }] });
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`;


        const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
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

        while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

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
                const visible = text.replace('<need_email/>', '');
                if (visible) res.write(`data: ${JSON.stringify({ text: visible })}\n\n`);
            }
            } catch { /* skip malformed */ }
        }
        }

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
}