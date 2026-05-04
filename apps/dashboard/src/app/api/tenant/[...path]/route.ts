// Proxy → NestJS backend
// TENANT module — owned by P1

import { NextRequest } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${BACKEND}/api/tenant/${path}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' ? req.body : undefined,
    // @ts-expect-error Node fetch duplex option
    duplex: 'half',
  });

  const responseHeaders = new Headers(res.headers);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export const GET = (req: NextRequest, ctx: { params: { path: string[] } }) =>
  proxy(req, ctx);
export const POST = (req: NextRequest, ctx: { params: { path: string[] } }) =>
  proxy(req, ctx);
