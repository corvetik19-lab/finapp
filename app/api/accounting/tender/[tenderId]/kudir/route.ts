import { NextRequest, NextResponse } from "next/server";
import { createKudirEntryForTender } from "@/lib/accounting/tender-integration";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  const { tenderId } = await params;

  try {
    const body = await request.json();
    const { entryType, amount, description } = body;

    if (!entryType || !amount) {
      return NextResponse.json(
        { error: "entryType and amount are required" },
        { status: 400 }
      );
    }

    const result = await createKudirEntryForTender(
      tenderId,
      amount,
      entryType,
      description
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ kudirEntryId: result.kudirEntryId });
  } catch (error) {
    console.error("Error creating KUDIR entry from tender:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
