import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, name: "finapp", ts: Date.now() });
}
