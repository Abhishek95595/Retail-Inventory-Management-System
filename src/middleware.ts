import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login');

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/app', req.url));
      }
      return null;
    }

    if (!isAuth) {
      const from = req.nextUrl.pathname;
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(from)}`, req.url)
      );
    }
  },
  {
    pages: {
      signIn: '/login',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page
        if (req.nextUrl.pathname.startsWith('/login')) {
          return true;
        }
        // Protected paths require a valid token with an active account
        return !!token && !!token.isActive;
      },
    },
  }
);

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/inventory/:path*', '/orders/:path*'],
};
