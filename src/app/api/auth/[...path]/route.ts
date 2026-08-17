import { NextResponse } from "next/server";

import { auth, authConfigured } from "@/lib/auth/server";

const handlers = auth.handler();
type AuthRouteContext = Parameters<typeof handlers.GET>[1];

function authNotConfigured() {
  return NextResponse.json(
    { error: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured." },
    { status: 503 },
  );
}

export function GET(request: Request, context: AuthRouteContext) {
  return authConfigured ? handlers.GET(request, context) : authNotConfigured();
}

export function POST(request: Request, context: AuthRouteContext) {
  return authConfigured ? handlers.POST(request, context) : authNotConfigured();
}
