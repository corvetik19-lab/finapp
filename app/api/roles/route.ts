import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// GET /api/roles - получить все роли
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch roles:", error);
      return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
    }

    return NextResponse.json({ success: true, roles: data });
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/roles - создать роль
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, permissions, color, is_default } = body;

    if (!name || !permissions || permissions.length === 0) {
      return NextResponse.json(
        { error: "Name and permissions are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("roles")
      .insert({
        user_id: user.id,
        name,
        description: description || "",
        permissions,
        color: color || "#667eea",
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create role:", error);
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: data });
  } catch (error) {
    console.error("POST /api/roles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
