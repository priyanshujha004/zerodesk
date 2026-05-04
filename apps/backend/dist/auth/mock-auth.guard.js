"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAuthGuard = void 0;
const common_1 = require("@nestjs/common");
let MockAuthGuard = class MockAuthGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        req.user = {
            sub: 'f5723a16-c08a-4310-8d9b-75ff320ed992',
            role: 'CUSTOMER',
            tenantId: 'tenant_shopease',
            deptId: undefined,
        };
        return true;
    }
};
exports.MockAuthGuard = MockAuthGuard;
exports.MockAuthGuard = MockAuthGuard = __decorate([
    (0, common_1.Injectable)()
], MockAuthGuard);
//# sourceMappingURL=mock-auth.guard.js.map