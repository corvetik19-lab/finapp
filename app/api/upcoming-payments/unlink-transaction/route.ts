import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createRouteClient } from "@/lib/supabase/helpers";

const bodySchema = z.object({
  paymentId: z.string().uuid({ message: "Некорректный платёж" }),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { paymentId } = parsed.data;

    const supabase = await createRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message ?? "Auth error" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("upcoming_payments")
      .select("id,status,paid_transaction_id")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (paymentError) {
      return NextResponse.json({ success: false, error: paymentError.message }, { status: 400 });
    }

    if (!payment) {
      return NextResponse.json({ success: false, error: "Платёж не найден" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("upcoming_payments")
      .update({ status: "pending", paid_at: null, paid_transaction_id: null })
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    revalidatePath("/finance/dashboard");
    revalidatePath("/finance/payments");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось отменить связь";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
