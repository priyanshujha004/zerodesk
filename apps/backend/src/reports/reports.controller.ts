import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
    ForbiddenException,
  } from '@nestjs/common';
  import { ReportsService } from './reports.service';
  // import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  import { MockAuthGuard } from '../auth/mock-auth.guard';
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
  
  // @UseGuards(JwtAuthGuard)
  @UseGuards(MockAuthGuard)
  @Controller('reports')
  export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}
  
    @Post()
    create(@Body() body: CreateReportBody, @Request() req: AuthRequest) {
      if (req.user.role !== Role.CUSTOMER) throw new ForbiddenException('CUSTOMER role required');
      return this.reportsService.create(body);
    }
  
    @Get()
    list(@Query() query: ListQuery, @Request() req: AuthRequest) {
      return this.reportsService.list(req.user, query);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: AuthRequest) {
      return this.reportsService.findOne(id, req.user);
    }
  }