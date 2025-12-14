import { NextRequest, NextResponse } from "next/server";
import {
  markTaxPaymentPaid,
  updateTaxPaymentAmount,
  deleteTaxPayment,
} from "@/lib/accounting/tax-calendar-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "markPaid": {
        const { paidAmount, paidDate, documentId } = body;

        if (!paidAmount) {
          return NextResponse.json(
            { error: "paidAmount is required" },
            { status: 400 }
          );
        }

        const result = await markTaxPaymentPaid(
          paymentId,
          paidAmount,
          paidDate,
          documentId
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case "updateAmount": {
        const { amount } = body;

        if (typeof amount !== "number") {
          return NextResponse.json(
            { error: "amount is required" },
            { status: 400 }
          );
        }

        const result = await updateTaxPaymentAmount(paymentId, amount);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating tax payment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;

  try {
    const result = await deleteTaxPayment(paymentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tax payment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
