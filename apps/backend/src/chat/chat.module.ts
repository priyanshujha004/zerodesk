import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ShopifyService } from './shopify.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ShopifyService, PrismaService],
})
export class ChatModule {}