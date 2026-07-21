// Middleware runs on the edge BEFORE any page code. It is the authoritative
// front-door gate for auth AND role visibility:
//   • Not logged in on any app route            → /login
//   • Logged in on /login or /signup            → /
//   • Logged in but the role can't see this area → / (per the Permission Matrix)
// It only verifies the token's signature + checks the pure matrix (fast, no DB).
// Pages call requireAccess() and services call requireCan() as defence-in-depth.

import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth/jwt";
import { canView } from "@/lib/auth/permissions";
import { areaForPath } from "@/lib/auth/access";

const AUTH_PAGES = new Set(["/login", "/signup"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  const redirectTo = (path: string) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Auth pages: bounce signed-in users into the app; let others through.
  if (AUTH_PAGES.has(pathname)) {
    return user ? redirectTo("/") : NextResponse.next();
  }

  // Every other matched route is protected.
  if (!user) return redirectTo("/login");

  // Role visibility straight from the matrix — a hard redirect before page code.
  const area = areaForPath(pathname);
  if (area && !canView(user.role, area)) return redirectTo("/");

  return NextResponse.next();
}

// Run on all app routes except Next internals, the API, and static files
// (anything with a file extension). This covers /, /people/*, /academics/*,
// /finance/*, /settings/*, /insights, /onboarding, /account/*, /login, /signup.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
