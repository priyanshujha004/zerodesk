"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("./prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const sla_module_1 = require("./sla/sla.module");
const auth_module_1 = require("./auth/auth.module");
const tenant_module_1 = require("./tenant/tenant.module");
const chat_module_1 = require("./chat/chat.module");
const reports_module_1 = require("./reports/reports.module");
const workflow_module_1 = require("./workflow/workflow.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot(),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            tenant_module_1.TenantModule,
            chat_module_1.ChatModule,
            reports_module_1.ReportsModule,
            workflow_module_1.WorkflowModule,
            sla_module_1.SlaModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map