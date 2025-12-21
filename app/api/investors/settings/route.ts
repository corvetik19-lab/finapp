import { NextRequest, NextResponse } from "next/server";
import { getInvestorSettings, saveInvestorSettings } from "@/lib/investors/settings-service";

export async function GET() {
  try {
    const settings = await getInvestorSettings();
    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Error fetching investor settings:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки настроек" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await saveInvestorSettings(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Ошибка сохранения" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving investor settings:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения настроек" },
      { status: 500 }
    );
  }
}
