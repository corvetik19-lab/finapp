import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function POST() {
  try {
    const supabase = await createRouteClient();
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/signout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
