import { NextResponse } from "next/server";

import { sql } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const rows = await sql`
      select to_regclass('public.organizations') as "tableName"
    `;
    if (!rows[0]?.tableName) {
      return NextResponse.json(
        { status: "error", database: "reachable", schema: "not_ready" },
        { status: 503, headers },
      );
    }
    return NextResponse.json({ status: "ok", database: "reachable" }, { headers });
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers },
    );
  }
}
