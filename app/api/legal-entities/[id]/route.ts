import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { z } from "zod";

// Получить company_id для текущего пользователя
async function getCompanyId(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  return membership?.company_id || null;
}

// Преобразование пустых строк в null
const emptyToNull = (val: unknown) => (val === "" ? null : val);
const optionalString = z.preprocess(emptyToNull, z.string().nullable().optional());
const optionalStringMax = (max: number) => z.preprocess(emptyToNull, z.string().max(max).nullable().optional());

// Схема валидации для обновления
const updateLegalEntitySchema = z.object({
  full_name: z.string().min(1, "Укажите полное наименование").optional(),
  short_name: optionalString,
  legal_form: optionalString,
  inn: z.preprocess(emptyToNull, z.string().min(10).max(12).nullable().optional()),
  kpp: optionalStringMax(9),
  ogrn: optionalStringMax(15),
  okpo: optionalStringMax(14),
  okved: optionalStringMax(20),
  registration_date: optionalString,
  legal_address: optionalString,
  legal_address_postal_code: optionalStringMax(10),
  actual_address: optionalString,
  actual_address_postal_code: optionalStringMax(10),
  bank_name: optionalString,
  bank_bik: optionalStringMax(9),
  bank_account: optionalStringMax(20),
  bank_corr_account: optionalStringMax(20),
  director_name: optionalString,
  director_position: optionalString,
  director_basis: optionalString,
  accountant_name: optionalString,
  phone: optionalString,
  email: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  website: optionalString,
  logo_url: optionalString,
  stamp_url: optionalString,
  signature_url: optionalString,
  tax_system: optionalString,
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  notes: optionalString,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Получить юр. лицо по ID
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();
    const companyId = await getCompanyId(supabase);

    if (!companyId) {
      return NextResponse.json({ error: "Компания не найдена" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("legal_entities")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Юр. лицо не найдено" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/legal-entities/[id]:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// PUT - Обновить юр. лицо
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();
    const companyId = await getCompanyId(supabase);

    if (!companyId) {
      return NextResponse.json({ error: "Компания не найдена" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateLegalEntitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Подготовка данных для обновления
    const updateData = {
      ...validation.data,
      email: validation.data.email || null,
    };

    const { data, error } = await supabase
      .from("legal_entities")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) {
      console.error("Error updating legal entity:", error);
      return NextResponse.json({ error: "Ошибка обновления юр. лица" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Юр. лицо не найдено" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /api/legal-entities/[id]:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// DELETE - Удалить юр. лицо
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();
    const companyId = await getCompanyId(supabase);

    if (!companyId) {
      return NextResponse.json({ error: "Компания не найдена" }, { status: 401 });
    }

    const { error } = await supabase
      .from("legal_entities")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      console.error("Error deleting legal entity:", error);
      return NextResponse.json({ error: "Ошибка удаления юр. лица" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/legal-entities/[id]:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
