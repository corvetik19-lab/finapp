import { NextRequest, NextResponse } from "next/server";
import { listTransactions, type TransactionRecord } from "@/lib/transactions/service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const direction = searchParams.get("direction") as "income" | "expense" | undefined;
    const accountIds = searchParams.get("accountIds")?.split(",").filter(Boolean);
    const categoryIds = searchParams.get("categoryIds")?.split(",").filter(Boolean);
    const search = searchParams.get("search") || undefined;

    const result = await listTransactions(
      {
        limit,
        offset,
        direction: direction || "all",
        accountIds,
        categoryIds,
        search,
        from,
        to,
        orderBy: "occurred_at",
        orderDir: "desc",
      },
      { withCount: true }
    );

    const transactions = result.data.map((t: TransactionRecord) => ({
      id: t.id,
      occurred_at: t.occurred_at,
      amount: t.amount,
      currency: t.currency,
      direction: t.direction,
      note: t.note,
      counterparty: t.counterparty,
      category_id: t.category_id,
      account_id: t.account_id,
      tags: t.tags,
      attachment_count: t.attachment_count,
      transfer_id: t.transfer_id,
      transfer_role: t.transfer_role,
      transfer_from_account_id: t.transfer_from_account_id,
      transfer_to_account_id: t.transfer_to_account_id,
    }));

    return NextResponse.json({
      transactions,
      count: result.count,
    });
  } catch (error) {
    console.error("Error in /api/transactions:", error);
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 }
    );
  }
}
