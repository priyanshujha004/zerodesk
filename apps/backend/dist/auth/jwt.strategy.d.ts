import { Strategy } from 'passport-jwt';
interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
    name: string | null;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): {
        sub: string;
        email: string;
        role: string;
        tenantId: string;
        name: string;
    };
}
export {};
