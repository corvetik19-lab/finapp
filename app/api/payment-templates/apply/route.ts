import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createRouteClient } from "@/lib/supabase/helpers";

const applySchema = z.object({
  templateIds: z.array(z.string().uuid()).min(1, "Выберите хотя бы один шаблон"),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11), // 0-11 как в JS Date
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = applySchema.safeParse(json);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Некорректные данные";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { templateIds, year, month } = parsed.data;

    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    // Загружаем выбранные шаблоны
    const { data: templates, error: templatesError } = await supabase
      .from("payment_templates")
      .select("id, name, amount_minor, currency, direction, category_id, day_of_month")
      .in("id", templateIds)
      .eq("user_id", user.id);

    if (templatesError) {
      return NextResponse.json({ success: false, error: templatesError.message }, { status: 400 });
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ success: false, error: "Шаблоны не найдены" }, { status: 404 });
    }

    // Проверяем существующие платежи в этом месяце с такими же именами
    const templateNames = templates.map((t) => t.name);
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data: existingPayments } = await supabase
      .from("upcoming_payments")
      .select("name")
      .eq("user_id", user.id)
      .gte("due_date", startOfMonth.toISOString())
      .lte("due_date", endOfMonth.toISOString())
      .in("name", templateNames);

    const existingNames = new Set((existingPayments ?? []).map((p) => p.name));

    // Создаём платежи из шаблонов
    const paymentsToCreate = templates
      .filter((t) => !existingNames.has(t.name)) // Пропускаем уже существующие
      .map((template) => {
        // Определяем день месяца
        const day = template.day_of_month ?? 15;
        // Корректируем день если в месяце меньше дней
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(day, lastDayOfMonth);
        const dueDate = new Date(year, month, actualDay);

        return {
          user_id: user.id,
          name: template.name,
          due_date: dueDate.toISOString(),
          amount_minor: template.amount_minor,
          currency: template.currency,
          direction: template.direction,
          category_id: template.category_id,
          status: "pending",
        };
      });

    if (paymentsToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: templates.length,
        message: "Все платежи уже существуют в этом месяце",
      });
    }

    const { error: insertError } = await supabase
      .from("upcoming_payments")
      .insert(paymentsToCreate);

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 400 });
    }

    revalidatePath("/finance/payments");
    revalidatePath("/finance/dashboard");

    return NextResponse.json({
      success: true,
      created: paymentsToCreate.length,
      skipped: templates.length - paymentsToCreate.length,
      message: `Создано ${paymentsToCreate.length} платежей`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка применения шаблонов";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
