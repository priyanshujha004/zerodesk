import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, PrismaService],
})
export class WorkflowModule {}