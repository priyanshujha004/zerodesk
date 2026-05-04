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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notifications_service_1 = require("./notifications.service");
const mock_auth_guard_1 = require("../auth/mock-auth.guard");
let NotificationsController = class NotificationsController {
    constructor(eventEmitter, svc) {
        this.eventEmitter = eventEmitter;
        this.svc = svc;
    }
    getUnread(req) {
        return this.svc.getUnread(req.user.sub);
    }
    async markRead(id, req) {
        try {
            return await this.svc.markRead(id, req.user.sub);
        }
        catch {
            throw new common_1.ForbiddenException('Not your notification');
        }
    }
    markAllRead(req) {
        return this.svc.markAllRead(req.user.sub);
    }
    async testRefund() {
        await this.eventEmitter.emit('report.autoResolved', {
            reportId: 'PASTE_A_REAL_REPORT_ID_FROM_YOUR_DB',
            customerId: 'f5723a16-c08a-4310-8d9b-75ff320ed992',
            tenantId: 'tenant_shopease',
            refundAmount: 49900,
            shopifyOrderId: 'ORD-TEST-001',
            razorpayOrderId: null,
        });
        return { ok: true };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)('unread'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getUnread", null);
__decorate([
    (0, common_1.Post)('mark-read/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)('mark-all-read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Post)('test/trigger-refund'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "testRefund", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(mock_auth_guard_1.MockAuthGuard),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map