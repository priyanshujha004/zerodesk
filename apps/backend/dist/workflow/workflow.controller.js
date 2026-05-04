"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowController = void 0;
const common_1 = require("@nestjs/common");
const workflow_service_1 = require("./workflow.service");
const mock_auth_guard_1 = require("../auth/mock-auth.guard");
const client_1 = require("@prisma/client");
let WorkflowController = class WorkflowController {
    constructor(workflowService) {
        this.workflowService = workflowService;
    }
    approve(reportId, note, req) {
        return this.workflowService.approve(reportId, req.user, note);
    }
    reject(reportId, note, req) {
        return this.workflowService.reject(reportId, req.user, note);
    }
    action(reportId, note, actionTaken, req) {
        return this.workflowService.action(reportId, req.user, note, actionTaken);
    }
    escalate(reportId, reason, req) {
        return this.workflowService.escalate(reportId, req.user, reason);
    }
    resolve(reportId, decision, note, req) {
        return this.workflowService.resolve(reportId, req.user, decision, note);
    }
    acknowledge(reportId, req) {
        return this.workflowService.acknowledge(reportId, req.user);
    }
    infoRequest(reportId, note, req) {
        return this.workflowService.infoRequest(reportId, req.user, note);
    }
    customerRespond(reportId, note, req) {
        return this.workflowService.customerRespond(reportId, req.user, note);
    }
};
exports.WorkflowController = WorkflowController;
__decorate([
    (0, common_1.Post)('approve/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Body)('note')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('reject/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Body)('note')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('action/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Body)('note')),
    __param(2, (0, common_1.Body)('actionTaken')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "action", null);
__decorate([
    (0, common_1.Post)('escalate/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "escalate", null);
__decorate([
    (0, common_1.Post)('resolve/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Body)('decision')),
    __param(2, (0, common_1.Body)('note')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "resolve", null);
__decorate([
    (0, common_1.Post)('acknowledge/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "acknowledge", null);
__decorate([
    (0, common_1.Post)('info-request/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Body)('note')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "infoRequest", null);
__decorate([
    (0, common_1.Post)('respond/:reportId'),
    __param(0, (0, common_1.Param)('reportId')),
    __param(1, (0, common_1.Body)('note')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], WorkflowController.prototype, "customerRespond", null);
exports.WorkflowController = WorkflowController = __decorate([
    (0, common_1.UseGuards)(mock_auth_guard_1.MockAuthGuard),
    (0, common_1.Controller)('workflow'),
    __metadata("design:paramtypes", [workflow_service_1.WorkflowService])
], WorkflowController);
//# sourceMappingURL=workflow.controller.js.map