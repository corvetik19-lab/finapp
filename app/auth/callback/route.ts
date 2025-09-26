import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createRouteClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // В случае ошибки показываем логин c сообщением
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin));
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
