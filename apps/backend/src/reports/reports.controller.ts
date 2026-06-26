import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueType, Priority, ReportStatus, Role } from '@prisma/client';

interface CreateReportBody {
  tenantId: string;
  customerId: string;
  conversationId: string;
  issueType: IssueType;
  issueSummary: string;
  actionRequested: string;
  routeToDeptName: string;
  priority: Priority;
  aiConfidence: number;
  rawConversation: object[];
  // extra fields from AI report
  eligible?: boolean;
  recommendedAction?: string;
  refundAmount?: number | null;
  shopifyOrderId?: string;
  shopifyOrderNumber?: string;
}

interface ListQuery {
  status?: ReportStatus;
  deptId?: string;
  priority?: Priority;
  page?: number;
  limit?: number;
}

interface AuthRequest {
  user: { sub: string; role: Role; tenantId: string; deptId?: string };
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ── Public: called from chat widget after OTP verification ─────────────
  // No JWT guard — customer is identified by tenantId + customerId from OTP session
  @Post()
  create(@Body() body: CreateReportBody) {
    return this.reportsService.create({
      tenantId: body.tenantId,
      customerId: body.customerId,
      conversationId: body.conversationId,
      issueType: body.issueType,
      issueSummary: body.issueSummary,
      actionRequested: body.actionRequested,
      routeToDeptName: body.routeToDeptName,
      priority: body.priority,
      aiConfidence: body.aiConfidence,
      rawConversation: body.rawConversation,
    });
  }

  // ── Protected: dashboard routes require JWT ─────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Query() query: ListQuery, @Request() req: AuthRequest) {
    return this.reportsService.list(req.user, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.reportsService.findOne(id, req.user);
  }
}