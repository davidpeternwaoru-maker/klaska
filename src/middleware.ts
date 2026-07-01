// Middleware runs on the edge BEFORE a matched request reaches a page. We use
// it as the front-door bouncer for auth:
//   • Not logged in and visiting /dashboard/*  → send to /login
//   • Already logged in and visiting /login|/signup → send to /dashboard
// It only verifies the token's signature (fast, no database). Pages still do
// their own requireUser() check as defence-in-depth.

import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  const isProtected = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Only run middleware on these paths (keeps it off static assets, the prototype
// showcase pages, etc.).
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
