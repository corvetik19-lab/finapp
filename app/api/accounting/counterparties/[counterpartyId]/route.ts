import { NextRequest, NextResponse } from "next/server";
import {
  getCounterpartyById,
  updateCounterparty,
  deleteCounterparty,
} from "@/lib/accounting/counterparty-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ counterpartyId: string }> }
) {
  const { counterpartyId } = await params;

  try {
    const counterparty = await getCounterpartyById(counterpartyId);

    if (!counterparty) {
      return NextResponse.json({ error: "Counterparty not found" }, { status: 404 });
    }

    return NextResponse.json(counterparty);
  } catch (error) {
    console.error("Error fetching counterparty:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ counterpartyId: string }> }
) {
  const { counterpartyId } = await params;

  try {
    const body = await request.json();

    const result = await updateCounterparty(counterpartyId, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating counterparty:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ counterpartyId: string }> }
) {
  const { counterpartyId } = await params;

  try {
    const result = await deleteCounterparty(counterpartyId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting counterparty:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
