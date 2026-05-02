import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SlaController],
  providers: [SlaService, PrismaService],
})
export class SlaModule {}