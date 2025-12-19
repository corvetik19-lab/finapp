import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { hasAIStudioAccess } from "@/lib/ai-studio/access";
import { executeCode, generateCode } from "@/lib/ai-studio/features/code-execution";

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
    const { prompt, code, language, action } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Если action = "generate" - генерируем код без выполнения
    if (action === "generate") {
      const result = await generateCode(prompt, language || "python");
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json(result);
    }

    // Иначе выполняем код
    const result = await executeCode(prompt, code);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Code execution error:", error);
    return NextResponse.json({ error: "Failed to execute code" }, { status: 500 });
  }
}
