import { NextRequest, NextResponse } from "next/server";
import { toggleFavorite } from "@/lib/ai-studio/assistants/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await toggleFavorite(id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
  }
}
