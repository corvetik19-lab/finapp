import { NextRequest, NextResponse } from "next/server";
import { getTenderFinancialSummary } from "@/lib/accounting/tender-integration";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  const { tenderId } = await params;

  try {
    const summary = await getTenderFinancialSummary(tenderId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching tender financial summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
