import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { hasAIStudioAccess } from "@/lib/ai-studio/access";
import { generateVideoFromImage } from "@/lib/ai-studio/tools/service";

export const maxDuration = 120;

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
    const { imageBase64, mimeType, prompt } = body;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "Image data and mimeType are required" }, { status: 400 });
    }

    const result = await generateVideoFromImage(imageBase64, mimeType, prompt);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json({ error: "Failed to generate video" }, { status: 500 });
  }
}
