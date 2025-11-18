import { NextResponse } from "next/server";
import { saveProductWidgetPreferences } from "@/lib/dashboard/preferences/service";
import { normalizeWidgetVisibleIds } from "@/lib/dashboard/preferences/shared";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { visibleProducts } = body;

    if (!Array.isArray(visibleProducts)) {
      return NextResponse.json(
        { error: "visibleProducts must be an array" },
        { status: 400 }
      );
    }

    const normalized = normalizeWidgetVisibleIds(visibleProducts);
    await saveProductWidgetPreferences({ visibleProducts: normalized });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save product preferences:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
