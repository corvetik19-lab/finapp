import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

/**
 * POST /api/tenders/customers/sync
 * Создаёт заказчика из тендера и привязывает его
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { tender_id, customer_name, region } = body;

    if (!tender_id || !customer_name) {
      return NextResponse.json(
        { error: "tender_id и customer_name обязательны" },
        { status: 400 }
      );
    }

    // Получаем company_id из тендера и organization_id через company
    const { data: tender } = await supabase
      .from("tenders")
      .select("company_id, companies!inner(organization_id)")
      .eq("id", tender_id)
      .single();

    if (!tender || !tender.companies) {
      return NextResponse.json(
        { error: "Не найден тендер или компания" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organizationId = (tender.companies as any).organization_id as string;

    // Проверяем, есть ли уже заказчик с таким именем
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("name", customer_name)
      .limit(1)
      .single();

    let customerId: string;

    if (existingCustomer) {
      // Заказчик уже существует
      customerId = existingCustomer.id;
    } else {
      // Создаём нового заказчика
      const { data: newCustomer, error: createError } = await supabase
        .from("customers")
        .insert({
          organization_id: organizationId,
          name: customer_name,
          region: region,
          customer_type: "government",
          created_by: user.id,
          notes: `Создан при добавлении контракта в реализацию`,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating customer:", createError);
        return NextResponse.json(
          { error: "Ошибка создания заказчика" },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // Привязываем заказчика к тендеру
    const { error: updateError } = await supabase
      .from("tenders")
      .update({ customer_id: customerId })
      .eq("id", tender_id);

    if (updateError) {
      console.error("Error updating tender:", updateError);
      return NextResponse.json(
        { error: "Ошибка привязки заказчика к тендеру" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer_id: customerId,
      created: !existingCustomer,
    });
  } catch (error) {
    console.error("Error in customers sync:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
