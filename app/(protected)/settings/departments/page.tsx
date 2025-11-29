import { redirect } from "next/navigation";
import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import DepartmentsSettings from "@/components/settings/DepartmentsSettings";

export const dynamic = 'force-dynamic';

export default async function DepartmentsSettingsPage() {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createRSCClient();

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <p>Для управления отделами необходимо быть членом организации</p>
      </div>
    );
  }

  const { data: departments = [], error: deptError } = await supabase
    .from("departments")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (deptError) {
    console.error("Error loading departments:", deptError);
  }

  const { data: employees = [] } = await supabase
    .from("employees")
    .select("id, full_name, avatar_url, department_id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("full_name", { ascending: true });

  const departmentsWithCount = (departments || []).map(dept => {
    const head = dept.head_id 
      ? (employees || []).find(e => e.id === dept.head_id) || null
      : null;
    
    const parent = dept.parent_id
      ? (departments || []).find(d => d.id === dept.parent_id) || null
      : null;

    return {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      color: dept.color,
      head_id: dept.head_id,
      parent_id: dept.parent_id,
      employees_count: (employees || []).filter(e => e.department_id === dept.id).length,
      head: head ? { id: head.id, full_name: head.full_name, avatar_url: head.avatar_url } : null,
      parent: parent ? { id: parent.id, name: parent.name } : null,
    };
  });

  return (
    <DepartmentsSettings 
      departments={departmentsWithCount} 
      employees={employees || []}
      companyId={companyId} 
    />
  );
}
