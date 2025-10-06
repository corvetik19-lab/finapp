import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createRouteClient();
  const { id } = await context.params;

  try {
    // Проверяем авторизацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем, что карта принадлежит пользователю и это дебетовая карта
    const { data: card, error: cardError } = await supabase
      .from("accounts")
      .select("id, user_id, type, credit_limit")
      .eq("id", id)
      .eq("type", "card")
      .eq("user_id", user.id)
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { error: "Debit card not found" },
        { status: 404 }
      );
    }

    // Проверяем, что это дебетовая карта (без кредитного лимита)
    if (card.credit_limit != null) {
      return NextResponse.json(
        { error: "This is not a debit card" },
        { status: 400 }
      );
    }

    // Удаляем все транзакции, связанные с этой картой
    const { error: txnError } = await supabase
      .from("transactions")
      .delete()
      .eq("account_id", id)
      .eq("user_id", user.id);

    if (txnError) {
      console.error("Failed to delete transactions:", txnError);
      return NextResponse.json(
        { error: "Failed to delete transactions" },
        { status: 500 }
      );
    }

    // Удаляем кубышку, если есть
    const { error: stashError } = await supabase
      .from("account_stashes")
      .delete()
      .eq("account_id", id)
      .eq("user_id", user.id);

    if (stashError) {
      console.error("Failed to delete stash:", stashError);
      // Не останавливаемся, продолжаем удаление карты
    }

    // Мягкое удаление карты
    const { error: deleteError } = await supabase
      .from("accounts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("type", "card")
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Failed to delete debit card:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete debit card" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting debit card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
