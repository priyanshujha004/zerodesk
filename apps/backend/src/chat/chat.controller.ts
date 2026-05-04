import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MappedOrder } from './shopify.service';
import { Response } from 'express';

interface StartBody { tenantId: string; customerId: string }
interface OtpBody { email: string }
interface VerifyBody { email: string; code: string }
interface LookupEmailBody { tenantId: string; email: string }
interface LookupOrderBody { tenantId: string; orderNumber: string }
interface MessageBody {
  conversationId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  orderContext?: MappedOrder;
  customerEmail?: string;
}
interface GeminiMessageBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  orderContext?: MappedOrder;
  customerEmail?: string;
  tenantId?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // No auth guard — public endpoints for customer OTP flow
  @Post('send-otp')
  async sendOtp(@Body() body: OtpBody) {
    return this.chatService.sendOtp(body.email);
  }

  @Post('gemini-message')
    async geminiMessage(@Body() body: GeminiMessageBody, @Res() res: Response) {
    await this.chatService.streamGeminiMessage(
        body.messages,
        res,
        body.orderContext,
        body.customerEmail,
        body.tenantId,
    );
    }

  @Post('verify-otp')
  async verifyOtp(@Body() body: VerifyBody) {
    return this.chatService.verifyOtp(body.email, body.code);
  }

  @Post('orders-by-email')
  async ordersByEmail(@Body() body: LookupEmailBody): Promise<MappedOrder[]> {
    return this.chatService.getOrdersByEmail(body.tenantId, body.email);
  }

  @Post('start')
  async start(@Body() body: StartBody) {
    return this.chatService.startConversation(body.tenantId, body.customerId);
  }

  // Department-only endpoints still guarded
  @UseGuards(JwtAuthGuard)
  @Post('lookup-order')
  async lookupOrder(@Body() body: LookupOrderBody): Promise<MappedOrder | { error: string }> {
    const order = await this.chatService.lookupOrder(body.tenantId, body.orderNumber);
    if (!order) return { error: 'Order not found' };
    return order;
  }

  @Post('message')
  async message(@Body() body: MessageBody, @Res() res: Response) {
    await this.chatService.streamMessage(
      body.conversationId,
      body.messages,
      res,
      body.orderContext,
      body.customerEmail,
    );
  }


}