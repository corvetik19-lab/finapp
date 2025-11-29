import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import RolesManager from "@/components/settings/RolesManager";

export const dynamic = 'force-dynamic';

export default async function RolesSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Получаем company_id текущего пользователя
  const companyId = await getCurrentCompanyId();

  // Загружаем роли компании (если есть company_id) или пользователя
  let query = supabase
    .from("roles")
    .select("id,name,description,permissions,color,is_default,is_system,created_at")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (companyId) {
    query = query.eq("company_id", companyId);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data: rolesData = [] } = await query;

  const roles = (rolesData || []).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || "",
    permissions: r.permissions || [],
    color: r.color || "#6366f1",
    is_default: r.is_default || r.is_system || false,
    created_at: r.created_at,
  }));

  return <RolesManager roles={roles} companyId={companyId} />;
}
