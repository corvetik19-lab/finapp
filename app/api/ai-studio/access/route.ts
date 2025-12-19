import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import {
  isSuperAdmin,
  getAllAIStudioAccess,
  grantAIStudioAccess,
} from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";

/**
 * GET - Получить список всех доступов (только для супер-админа)
 */
export async function GET() {
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

    const access = await getAllAIStudioAccess();

    return NextResponse.json({ access });
  } catch (error) {
    console.error("Get AI Studio access error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST - Выдать доступ организации (только для супер-админа)
 */
export async function POST(req: Request) {
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

    const { organizationId, features, expiresAt, notes } = await req.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    const result = await grantAIStudioAccess(organizationId, user.id, {
      features,
      expiresAt,
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Grant AI Studio access error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
