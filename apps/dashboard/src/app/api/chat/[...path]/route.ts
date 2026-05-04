import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000/api';

async function proxyRequest(req: NextRequest, path: string) {
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const isStream = path === 'chat/message' || path === 'chat/gemini-message';

  const upstream = await fetch(`${BACKEND}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: req.body,
    // @ts-expect-error - Node fetch duplex
    duplex: 'half',
  });

  if (isStream) {
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = 'chat/' + params.path.join('/');
  return proxyRequest(req, path);
}