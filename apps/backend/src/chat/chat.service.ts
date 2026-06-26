import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyService, MappedOrder } from './shopify.service';
import { Response } from 'express';
import { Resend } from 'resend';

// ── Removed: Anthropic import (unused — we use Gemini) ──────────────────────

type OrderContext = MappedOrder;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_TENANT_ID = 'tenant_shopease';

const resend = new Resend(process.env.RESEND_API_KEY);

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shopifyService: ShopifyService,
  ) {}

  // ── OTP — stored in DB, survives Railway restarts ──────────────────────────

  async sendOtp(email: string): Promise<{ sent: boolean }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in DB — upsert so resend works cleanly
    await this.prisma.otpCode.upsert({
      where: { email },
      update: { code, expiresAt, used: false },
      create: { email, code, expiresAt },
    });

    this.logger.log(`[OTP] ${email} → ${code}`);

    // Send via Resend — uses verified sender if available, logs code as fallback
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
      const toEmail = process.env.NODE_ENV === 'production'
        ? email
        : (process.env.RESEND_TEST_TO ?? email); // In dev, override to your Resend account email

      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: 'Your ShopEase verification code',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
            <h2 style="color:#080810;margin-bottom:4px">ShopEase Support</h2>
            <p style="color:#666;margin-top:0">Your verification code:</p>
            <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#b6ff6e;padding:20px 0">${code}</div>
            <p style="color:#999;font-size:13px">Valid for 10 minutes. Do not share this code.</p>
          </div>`,
      });
      this.logger.log(`[OTP] Email sent → ${toEmail}`);
    } catch (err) {
      // Email failure is non-fatal — code is in DB and logs
      this.logger.warn(`[OTP] Email failed for ${email} — code still valid via logs`, err);
    }

    return { sent: true };
  }

  async verifyOtp(email: string, code: string): Promise<{ valid: boolean }> {
    const entry = await this.prisma.otpCode.findUnique({ where: { email } });

    if (!entry) return { valid: false };
    if (entry.used) return { valid: false };
    if (new Date() > entry.expiresAt) {
      await this.prisma.otpCode.delete({ where: { email } });
      return { valid: false };
    }
    if (entry.code !== code) return { valid: false };

    // Mark used — prevents replay attacks
    await this.prisma.otpCode.update({
      where: { email },
      data: { used: true },
    });

    return { valid: true };
  }

  // ── Conversation ───────────────────────────────────────────────────────────

  async startConversation(
    tenantId: string,
    customerId: string,
  ): Promise<{ conversationId: string }> {
    const conversation = await this.prisma.conversation.create({
      data: {
        tenantId,
        customerId,
        modelUsed: 'gemini-2.5-flash',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return { conversationId: conversation.id };
  }

  // ── Order lookup ───────────────────────────────────────────────────────────

  async lookupOrder(
    tenantId: string,
    orderNumber: string,
  ): Promise<MappedOrder | null> {
    return this.shopifyService.getOrderByNumber(tenantId, orderNumber);
  }

  async getOrdersByEmail(
    tenantId: string,
    email: string,
  ): Promise<MappedOrder[]> {
    return this.shopifyService.getOrdersByEmail(tenantId, email);
  }

  // ── Gemini streaming ───────────────────────────────────────────────────────

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

    this.logger.log(
      `[Gemini] key present: ${!!process.env.GEMINI_API_KEY}, length: ${process.env.GEMINI_API_KEY?.length}`,
    );

    const systemPrompt = orderContext
      ? `You are Aria, a friendly AI support agent for ShopEase — an online electronics store.

You are helping: ${orderContext.customerName}

THEIR ORDER:
- Order: ${orderContext.orderNumber}
- Items: ${orderContext.lineItems.map((li) => `${li.quantity}x ${li.title}`).join(', ')}
- Total: ₹${(orderContext.totalAmount / 100).toLocaleString('en-IN')}
- Ordered: ${orderContext.daysSinceOrder} days ago
- Delivery: ${orderContext.fulfillmentStatus}
- Payment: ${orderContext.financialStatus}

RETURN POLICY:
- 30-day return window from delivery
- Accepted reasons: defective, wrong item, not as described, damaged in shipping
- Non-returnable: earbuds (hygiene), gift cards
- Refunds in 5-7 business days

ROUTING RULES (follow exactly):
- Wrong item / delivery issue → routeToDept: "Logistics"
- Refund / defective product → routeToDept: "Finance"
- Complaint / bad experience → routeToDept: "CustomerCare"
- Account / data issue → routeToDept: "HR"

YOUR RULES:
1. Maximum 2 exchanges to understand the issue
2. NEVER say goodbye or close the chat
3. NEVER give a reference number
4. After understanding the issue, IMMEDIATELY output the report
5. The <report> tag is MANDATORY

AFTER YOUR RESPONSE OUTPUT THIS EXACT FORMAT:
<report>
{"issueType":"REFUND","issueSummary":"brief summary here","actionRequested":"action here","routeToDept":"Finance","priority":"HIGH","aiConfidence":0.92,"eligible":true,"eligibilityReason":"reason here","recommendedAction":"AUTO_REFUND","refundAmount":${orderContext.totalAmount},"shopifyOrderId":"${orderContext.shopifyOrderId ?? ''}"}
</report>`

      : `You are Aria, a friendly AI support agent for ShopEase — an online electronics store.

You can help with returns, refunds, order issues, complaints, and store policies.

RETURN POLICY:
- 30-day return window
- Defective, wrong item, damaged: fully eligible
- Earbuds and gift cards: not returnable
- Refunds take 5-7 business days

HOW YOU WORK:
- For general questions: answer directly, no email needed
- For order-specific help: emit <need_email/> to get their email
- Keep replies short — max 2-3 sentences
- Be warm and human

When you need order details, emit on its own line: <need_email/>

Once you have order context AND know the issue, you MUST output <report></report> tags.
NEVER say goodbye. NEVER close chat. ALWAYS end with <report>.`;

    try {
      const safeMessages = Array.isArray(messages) ? messages : [];
      const geminiMessages = safeMessages
        .filter((m) => m?.content?.trim() !== '')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      if (geminiMessages.length === 0) {
        geminiMessages.push({
          role: 'user',
          parts: [{ text: 'Hello, please greet me.' }],
        });
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
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };
            const text =
              parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (text) {
              fullText += text;
              const visible = text
                .replace('<need_email/>', '')
                .replace(/<report>[\s\S]*?<\/report>/g, '');
              if (visible.trim())
                res.write(`data: ${JSON.stringify({ text: visible })}\n\n`);
            }
          } catch {
            /* skip malformed chunks */
          }
        }
      }

      // Extract and send report JSON to frontend
      const reportJson = this.extractReport(fullText);
      if (reportJson) {
        this.logger.log(`[Report] Generated: ${JSON.stringify(reportJson)}`);
        res.write(`data: ${JSON.stringify({ reportJson })}\n\n`);
      }

      // Signal if email is needed
      if (fullText.includes('<need_email/>')) {
        res.write(`data: ${JSON.stringify({ needsEmail: true })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
    } catch (err) {
      this.logger.error('Gemini stream error', err);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  // ── Removed: streamMessage (Claude stub that only returned an error) ────────

  // ── Helpers ────────────────────────────────────────────────────────────────

  private extractReport(text: string): object | null {
    const open = text.indexOf('<report>');
    const close = text.indexOf('</report>');
    if (open === -1 || close === -1) return null;
    try {
      return JSON.parse(text.slice(open + 8, close).trim()) as object;
    } catch {
      return null;
    }
  }
}