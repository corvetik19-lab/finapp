import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createRouteClient } from "@/lib/supabase/helpers";
import { upcomingPaymentFormSchema } from "@/lib/dashboard/upcoming-payments/schema";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = upcomingPaymentFormSchema.safeParse(json);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { id, name, dueDate, amountMajor, direction, accountName, description } = parsed.data;
    const amountMinor = Math.round(amountMajor * 100);
    const dueAt = new Date(`${dueDate}T00:00:00Z`);

    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ success: false, error: userError.message ?? "Auth error" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    const payload = {
      name,
      due_date: dueAt.toISOString(),
      amount_minor: amountMinor,
      direction,
      account_name: accountName ?? null,
      description: description ?? null,
      user_id: user.id,
    };

    if (id) {
      const { error } = await supabase
        .from("upcoming_payments")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    } else {
      const { error } = await supabase
        .from("upcoming_payments")
        .insert(payload);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/payments");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: String(message) }, { status: 500 });
  }
}
