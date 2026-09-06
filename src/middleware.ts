import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check auth cookie
  const authCookie = request.cookies.get('gemini_free_auth')?.value;
  const isAuthenticated = authCookie === 'true' || Boolean(authCookie);

  // Protected routes (require login)
  const isProtectedRoute = pathname.startsWith('/chat');

  // Guest-only routes (redirect to /chat if already logged in)
  const isGuestOnlyRoute = pathname === '/' || pathname === '/login';

  // 1. If guest visits protected route -> redirect to /login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If logged-in user visits landing page or login -> redirect to /chat
  if (isGuestOnlyRoute && isAuthenticated) {
    const chatUrl = new URL('/chat', request.url);
    return NextResponse.redirect(chatUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (/api/*)
     * - _next/static, _next/image
     * - public assets (*.zip, *.png, *.svg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
