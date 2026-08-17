import { NextResponse } from "next/server";

import { sql } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await sql`select 1`;
    return NextResponse.json({ status: "ok", database: "reachable" }, { headers });
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers },
    );
  }
}
