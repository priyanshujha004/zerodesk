import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'http://localhost:3000';

async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path.join('/');
  const backendUrl = `${BACKEND}/api/workflow/${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  // Forward cookies too (for when JWT moves to httpOnly cookie)
  const cookie = req.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const res = await fetch(backendUrl, init);
  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE,
};