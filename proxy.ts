import { NextRequest, NextResponse } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

const neonAuthMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

function isProtectedPath(pathname: string) {
  return ["/teacher", "/parent", "/admin"].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export default function proxy(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!authConfigured) {
    const loginUrl = new URL("/auth/sign-in", request.url);
    loginUrl.searchParams.set("setup", "required");
    return NextResponse.redirect(loginUrl);
  }

  return neonAuthMiddleware(request);
}

export const config = {
  matcher: ["/teacher/:path*", "/parent/:path*", "/admin/:path*"],
};
