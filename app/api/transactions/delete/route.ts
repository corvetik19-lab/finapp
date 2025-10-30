import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { deleteTransaction } from "@/lib/transactions/service";

export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const id = String(formData.get("id") || "");

    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    await deleteTransaction(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
