import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/market",
  "/trade",
  "/portfolio",
  "/auctions",
  "/demo",
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const sessionToken = request.cookies.get("dkh_auth_token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      const destination = pathname + search;
      loginUrl.searchParams.set("redirect", destination);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
