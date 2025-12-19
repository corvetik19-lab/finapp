import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { hasAIStudioAccess } from "@/lib/ai-studio/access";
import { generateSticker } from "@/lib/ai-studio/tools/service";

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
    const { prompt, config } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = await generateSticker(prompt, config);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sticker generation error:", error);
    return NextResponse.json({ error: "Failed to generate sticker" }, { status: 500 });
  }
}
