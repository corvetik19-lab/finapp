import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { hasAIStudioAccess } from "@/lib/ai-studio/access";
import { searchWithGrounding, analyzeUrl } from "@/lib/ai-studio/features/grounding";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const hasAccess = await hasAIStudioAccess(user.id, user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { query, url, question, systemPrompt } = body;

    // Если передан URL - анализируем его
    if (url) {
      const result = await analyzeUrl(url, question);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json(result);
    }

    // Иначе выполняем поиск с grounding
    if (!query) {
      return NextResponse.json({ error: "Query or URL is required" }, { status: 400 });
    }

    const result = await searchWithGrounding(query, systemPrompt);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Grounding error:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
