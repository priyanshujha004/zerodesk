import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'CUSTOMER' | 'CDA' | 'DEPT_ADMIN' | 'SUPER_ADMIN';

const ROLE_HOME: Record<Role, string> = {
  CUSTOMER:    '/chat',
  CDA:         '/dashboard/cda',
  DEPT_ADMIN:  '/dashboard/dept',
  SUPER_ADMIN: '/dashboard/superadmin',
};

const PROTECTED: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/dashboard\/superadmin/, roles: ['SUPER_ADMIN'] },
  { pattern: /^\/dashboard\/cda/,        roles: ['CDA', 'SUPER_ADMIN'] },
  { pattern: /^\/dashboard\/dept/,       roles: ['DEPT_ADMIN', 'SUPER_ADMIN'] },
  { pattern: /^\/report/,                roles: ['CUSTOMER', 'CDA', 'DEPT_ADMIN', 'SUPER_ADMIN'] },
  { pattern: /^\/chat/,                  roles: ['CUSTOMER', 'CDA', 'DEPT_ADMIN', 'SUPER_ADMIN'] },
];

function decodeRole(token: string): Role | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.role ?? null;
  } catch { return null; }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow: root, api, static assets, chat widget
  if (
    pathname === '/' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/widget')
  ) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;

  // No token → back to landing
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const role = decodeRole(token);
  if (!role) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Check route permissions
  for (const rule of PROTECTED) {
    if (rule.pattern.test(pathname)) {
      if (!rule.roles.includes(role)) {
        return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};