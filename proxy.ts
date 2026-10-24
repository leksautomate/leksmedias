import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no cookie means no chance of being signed in, so send the visitor to the login
// page without touching the database. The real check happens in lib/server/dal.ts on every request.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("lk_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
