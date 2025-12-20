import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/helpers";

// POST /api/admin/organizations/[id]/setup - настроить организацию (создать компанию, добавить админа)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;
    const supabase = await createRouteClient();
    const adminClient = createAdminClient();

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем что пользователь super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    if (profile?.global_role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { admin_user_id, company_name } = body;

    if (!admin_user_id) {
      return NextResponse.json({ error: "admin_user_id is required" }, { status: 400 });
    }

    // Получаем организацию
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // 1. Обновляем owner_id организации
    await adminClient
      .from("organizations")
      .update({ owner_id: admin_user_id })
      .eq("id", organizationId);

    // 2. Проверяем есть ли уже компания для этой организации
    let companyId: string;
    const { data: existingCompany } = await adminClient
      .from("companies")
      .select("id")
      .eq("organization_id", organizationId)
      .single();

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      // Создаём компанию
      const { data: newCompany, error: companyError } = await adminClient
        .from("companies")
        .insert({
          organization_id: organizationId,
          name: company_name || `ООО ${org.name}`,
          slug: org.slug || org.name.toLowerCase().replace(/\s+/g, '-'),
        })
        .select()
        .single();

      if (companyError) {
        console.error("Error creating company:", companyError);
        return NextResponse.json({ error: companyError.message }, { status: 400 });
      }
      companyId = newCompany.id;
    }

    // 3. Проверяем есть ли уже членство
    const { data: existingMember } = await adminClient
      .from("company_members")
      .select("id")
      .eq("user_id", admin_user_id)
      .eq("company_id", companyId)
      .single();

    if (!existingMember) {
      // Добавляем пользователя как админа компании
      const { error: memberError } = await adminClient
        .from("company_members")
        .insert({
          user_id: admin_user_id,
          company_id: companyId,
          role: "admin",
          status: "active",
        });

      if (memberError) {
        console.error("Error adding member:", memberError);
        return NextResponse.json({ error: memberError.message }, { status: 400 });
      }
    }

    // 4. Обновляем профиль пользователя - устанавливаем роль admin
    await adminClient
      .from("profiles")
      .update({ global_role: "admin" })
      .eq("id", admin_user_id);

    return NextResponse.json({
      success: true,
      organization_id: organizationId,
      company_id: companyId,
      admin_user_id,
    });
  } catch (error) {
    console.error("POST /api/admin/organizations/[id]/setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
