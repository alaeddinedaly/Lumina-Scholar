import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const path = request.nextUrl.pathname;

  const publicPaths = ['/', '/sign-in', '/sign-up'];

  if (!token && !publicPaths.includes(path)) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  if (token && (path === '/sign-in' || path === '/sign-up')) {
    try {
      const payloadBase64 = token.value.split('.')[1];
      const payloadString = atob(payloadBase64);
      const payload = JSON.parse(payloadString);
      
      if (payload.role === 'PROFESSOR') {
        return NextResponse.redirect(new URL('/professor/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    } catch (e) {
      console.error("JWT decode error in middleware", e);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
