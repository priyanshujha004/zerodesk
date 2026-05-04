"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true }));
    app.enableCors({
        origin: 'http://localhost:3001',
        credentials: true,
    });
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    await app.listen(process.env.PORT ?? 3000);
    console.log('Backend running on http://localhost:3000');
}
bootstrap();
//# sourceMappingURL=main.js.map