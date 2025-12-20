import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { blockOrganization, unblockOrganization } from "@/lib/auth/organization-access";

// POST /api/admin/organizations/[id]/block - заблокировать организацию
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;
    const supabase = await createRouteClient();

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем что пользователь super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    if (profile?.global_role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { reason } = body;

    try {
      const success = await blockOrganization(organizationId, user.id, reason);
      if (!success) {
        return NextResponse.json({ error: "Failed to block organization" }, { status: 400 });
      }
      return NextResponse.json({ success: true, blocked: true });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/admin/organizations/[id]/block error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/organizations/[id]/block - разблокировать организацию
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;
    const supabase = await createRouteClient();

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем что пользователь super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    if (profile?.global_role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const success = await unblockOrganization(organizationId);
    if (!success) {
      return NextResponse.json({ error: "Failed to unblock organization" }, { status: 400 });
    }

    return NextResponse.json({ success: true, blocked: false });
  } catch (error) {
    console.error("DELETE /api/admin/organizations/[id]/block error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
