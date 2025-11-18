import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
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

  const { data: rolesData = [] } = await supabase
    .from("roles")
    .select("id,name,description,permissions,color,is_default,created_at")
    .order("created_at", { ascending: true });

  const roles = (rolesData || []).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || "",
    permissions: r.permissions || [],
    color: r.color || "#6366f1",
    is_default: r.is_default || false,
    created_at: r.created_at,
  }));

  return <RolesManager roles={roles} />;
}
