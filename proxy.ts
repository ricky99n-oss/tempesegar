import { NextResponse, type NextRequest } from 'next/server';
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set(
    'x-tempe-locale',
    req.nextUrl.pathname === '/ko' ? 'ko' : req.nextUrl.pathname === '/en' ? 'en' : 'id',
  );
  const response = NextResponse.next({ request: { headers } });
  if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/api/'))
    response.headers.set('Cache-Control', 'no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|media).*)'] };
