import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Allow requests to auth pages and the root page
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Allow requests to auth api
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
