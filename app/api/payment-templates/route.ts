import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createRouteClient } from "@/lib/supabase/helpers";
import { paymentTemplateFormSchema } from "@/lib/payments/templates-schema";

// GET - список шаблонов
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("payment_templates")
      .select(`
        id,
        name,
        amount_minor,
        currency,
        direction,
        category_id,
        day_of_month,
        description,
        created_at,
        categories (name)
      `)
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const templates = (data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      amountMinor: t.amount_minor,
      currency: t.currency,
      direction: t.direction,
      categoryId: t.category_id,
      categoryName: (t.categories as { name: string } | null | { name: string }[])
        ? (Array.isArray(t.categories) ? t.categories[0]?.name : (t.categories as { name: string })?.name) ?? null
        : null,
      dayOfMonth: t.day_of_month,
      description: t.description,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка загрузки шаблонов";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST - создать/обновить шаблон
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = paymentTemplateFormSchema.safeParse(json);
    
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { id, name, amountMajor, direction, categoryId, dayOfMonth, description } = parsed.data;
    const amountMinor = Math.round(amountMajor * 100);

    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    const payload = {
      name,
      amount_minor: amountMinor,
      direction,
      category_id: categoryId ?? null,
      day_of_month: dayOfMonth ?? null,
      description: description ?? null,
      user_id: user.id,
    };

    if (id) {
      // Обновление
      const { error } = await supabase
        .from("payment_templates")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    } else {
      // Создание
      const { error } = await supabase
        .from("payment_templates")
        .insert(payload);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    revalidatePath("/finance/payments");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка сохранения шаблона";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE - удалить шаблон
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID шаблона не указан" }, { status: 400 });
    }

    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    const { error } = await supabase
      .from("payment_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    revalidatePath("/finance/payments");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка удаления шаблона";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
