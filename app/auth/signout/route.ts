import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function GET() {
  const supabase = await createRouteClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
