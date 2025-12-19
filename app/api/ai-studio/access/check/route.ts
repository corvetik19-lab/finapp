import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getAIStudioAccessInfo } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";

/**
 * GET - Проверка доступа к AI Studio
 */
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { hasAccess: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const accessInfo = await getAIStudioAccessInfo(user.id, user.email);

    return NextResponse.json(accessInfo);
  } catch (error) {
    console.error("AI Studio access check error:", error);
    return NextResponse.json(
      { hasAccess: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
