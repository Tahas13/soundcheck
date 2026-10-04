import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/report", "/api/badge", "/api/health", "/api/runs/seed"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"))) {
    return NextResponse.next();
  }
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session === SESSION_VALUE) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
