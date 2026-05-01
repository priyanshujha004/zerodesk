import {
    Controller,
    Post,
    Param,
    Body,
    UseGuards,
    Request,
  } from '@nestjs/common';
  import { WorkflowService } from './workflow.service';
  // import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  import { MockAuthGuard } from '../auth/mock-auth.guard';
  import { EscalationDecision, Role } from '@prisma/client';
  
  interface AuthRequest {
    user: { sub: string; role: Role; tenantId: string; deptId?: string };
  }
  
  // @UseGuards(JwtAuthGuard)
  @UseGuards(MockAuthGuard)
  @Controller('workflow')
  export class WorkflowController {
    constructor(private readonly workflowService: WorkflowService) {}
  
    @Post('approve/:reportId')
    approve(
      @Param('reportId') reportId: string,
      @Body('note') note: string | undefined,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.approve(reportId, req.user, note);
    }
  
    @Post('reject/:reportId')
    reject(
      @Param('reportId') reportId: string,
      @Body('note') note: string,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.reject(reportId, req.user, note);
    }
  
    @Post('action/:reportId')
    action(
      @Param('reportId') reportId: string,
      @Body('note') note: string,
      @Body('actionTaken') actionTaken: string,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.action(reportId, req.user, note, actionTaken);
    }
  
    @Post('escalate/:reportId')
    escalate(
      @Param('reportId') reportId: string,
      @Body('reason') reason: string,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.escalate(reportId, req.user, reason);
    }
  
    @Post('resolve/:reportId')
    resolve(
      @Param('reportId') reportId: string,
      @Body('decision') decision: EscalationDecision,
      @Body('note') note: string,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.resolve(reportId, req.user, decision, note);
    }
  
    // Dept admin acknowledges → APPROVED_TO_DEPT → IN_PROGRESS
    @Post('acknowledge/:reportId')
    acknowledge(
      @Param('reportId') reportId: string,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.acknowledge(reportId, req.user);
    }
  
    // CDA → asks customer for more info
    @Post('info-request/:reportId')
    infoRequest(
      @Param('reportId') reportId: string,
      @Body('note') note: string,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.infoRequest(reportId, req.user, note);
    }
  
    // Customer → responds with requested info
    @Post('respond/:reportId')
    customerRespond(
      @Param('reportId') reportId: string,
      @Body('note') note: string,
      @Request() req: AuthRequest,
    ) {
      return this.workflowService.customerRespond(reportId, req.user, note);
    }
  }