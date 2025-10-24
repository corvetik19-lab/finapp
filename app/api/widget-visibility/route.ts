import { NextResponse } from "next/server";
import { loadWidgetVisibility, saveWidgetVisibility } from "@/lib/dashboard/preferences/service";
import { normalizeHiddenWidgets, type WidgetVisibilityState } from "@/lib/dashboard/preferences/shared";

export async function GET() {
  try {
    const visibility = await loadWidgetVisibility();
    return NextResponse.json(visibility);
  } catch (error) {
    console.error("Error loading widget visibility:", error);
    return NextResponse.json(
      { error: "Failed to load widget visibility" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Валидация данных
    const hidden = normalizeHiddenWidgets(body.hidden);
    const state: WidgetVisibilityState = { hidden };

    await saveWidgetVisibility(state);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving widget visibility:", error);
    return NextResponse.json(
      { error: "Failed to save widget visibility" },
      { status: 500 }
    );
  }
}
