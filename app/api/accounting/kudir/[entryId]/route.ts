import { NextRequest, NextResponse } from "next/server";
import { deleteKudirEntry } from "@/lib/accounting/kudir-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;

  try {
    const result = await deleteKudirEntry(entryId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting kudir entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
