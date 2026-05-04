import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'CUSTOMER' | 'CDA' | 'DEPT_ADMIN' | 'SUPER_ADMIN';

interface JwtPayloadPartial {
  role: Role;
}

const ROLE_DEFAULT_ROUTE: Record<Role, string> = {
  CUSTOMER: '/chat',
  CDA: '/dashboard/cda',
  DEPT_ADMIN: '/dashboard/dept',
  SUPER_ADMIN: '/dashboard/superadmin',
};

const ROUTE_ROLES: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/dashboard\/settings/, roles: ['SUPER_ADMIN'] },
  { pattern: /^\/dashboard\/superadmin/, roles: ['SUPER_ADMIN'] },
  { pattern: /^\/dashboard\/dept/, roles: ['DEPT_ADMIN'] },
  { pattern: /^\/dashboard\/cda/, roles: ['CDA', 'SUPER_ADMIN'] },
  { pattern: /^\/dashboard\/auto/, roles: ['CDA', 'SUPER_ADMIN'] },
  { pattern: /^\/chat/, roles: ['CUSTOMER', 'CDA', 'DEPT_ADMIN', 'SUPER_ADMIN'] },
  { pattern: /^\/report\//, roles: ['CUSTOMER', 'CDA', 'DEPT_ADMIN', 'SUPER_ADMIN'] },
];

function decodePayload(token: string): JwtPayloadPartial | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    );
    return { role: payload.role };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ['/login', '/register', '/widget', '/api/chat/'];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));

  // Public routes — never intercept
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/widget') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = decodePayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = payload.role;

  // Root redirect → role default
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(ROLE_DEFAULT_ROUTE[role] ?? '/login', request.url),
    );
  }

  // Check route-role permissions
  for (const rule of ROUTE_ROLES) {
    if (rule.pattern.test(pathname)) {
      if (!rule.roles.includes(role)) {
        return NextResponse.redirect(
          new URL(ROLE_DEFAULT_ROUTE[role] ?? '/login', request.url),
        );
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
