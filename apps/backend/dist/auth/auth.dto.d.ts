declare enum Role {
    CUSTOMER = "CUSTOMER",
    CDA = "CDA",
    DEPT_ADMIN = "DEPT_ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export declare class RegisterDto {
    email: string;
    password: string;
    name?: string;
    role?: Role;
    tenantId?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export {};
