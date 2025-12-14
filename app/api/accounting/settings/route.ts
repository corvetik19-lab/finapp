import { NextRequest, NextResponse } from "next/server";
import {
  getOrganizationSettings,
  upsertOrganizationSettings,
  UpdateOrganizationSettingsInput,
} from "@/lib/accounting/settings-service";

export async function GET() {
  try {
    const settings = await getOrganizationSettings();
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: UpdateOrganizationSettingsInput = body;

    const result = await upsertOrganizationSettings(input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
