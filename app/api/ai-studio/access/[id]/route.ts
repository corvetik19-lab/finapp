import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { isSuperAdmin, revokeAIStudioAccess } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";

/**
 * DELETE - Отозвать доступ (только для супер-админа)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSuperAdmin(user.email)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const result = await revokeAIStudioAccess(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke AI Studio access error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
