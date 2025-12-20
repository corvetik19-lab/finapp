import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { Card, CardContent } from "@/components/ui/card";
import { 
  UserCog, 
  Calendar, 
  Shield, 
  Building2
} from "lucide-react";
import EmployeesList from "./EmployeesList";

interface EmployeeData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  role: string;
  status: string;
  avatar_url?: string;
  hire_date?: string;
  created_at: string;
  role_id?: string;
  company_id: string;
  updated_at?: string;
  role_data?: {
    id: string;
    name: string;
    description: string;
    color: string;
    permissions: string[];
  } | null;
  roles?: {
    id: string;
    name: string;
    color?: string;
  };
}

export default async function AIStudioEmployeesPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  
  if (!organization) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Организация не найдена. Пожалуйста, свяжитесь с администратором.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminClient = createAdminClient();
  
  // Получаем компании организации
  const { data: companies } = await adminClient
    .from('companies')
    .select('id')
    .eq('organization_id', organization.id);

  const companyIds = companies?.map(c => c.id) || [];
  const companyId = companyIds[0] || '';

  // Получаем сотрудников
  let employees: EmployeeData[] = [];
  
  if (companyIds.length > 0) {
    const { data: employeesData } = await adminClient
      .from('employees')
      .select(`
        id,
        full_name,
        email,
        phone,
        position,
        department,
        role,
        status,
        avatar_url,
        hire_date,
        created_at,
        role_id,
        company_id,
        updated_at,
        roles (
          id,
          name,
          color
        )
      `)
      .in('company_id', companyIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (employeesData) {
      employees = employeesData.map(emp => {
        const roleInfo = Array.isArray(emp.roles) ? emp.roles[0] : emp.roles;
        return {
          ...emp,
          roles: roleInfo,
          // Преобразуем roles в role_data для совместимости с модалкой
          role_data: roleInfo ? {
            id: roleInfo.id,
            name: roleInfo.name,
            description: '',
            color: roleInfo.color || '#6366f1',
            permissions: [],
          } : null,
        };
      }) as EmployeeData[];
    }
  }


  return (
    <div className="p-8 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <UserCog className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-sm text-muted-foreground">Всего сотрудников</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employees.filter(e => e.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(employees.map(e => e.department).filter(Boolean)).size}
                </p>
                <p className="text-sm text-muted-foreground">Отделов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employees.filter(e => {
                    const date = new Date(e.created_at);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Новых в этом месяце</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees list with client-side modal */}
      <EmployeesList 
        employees={employees}
        organizationId={organization.id}
        companyId={companyId}
        organizationName={organization.name}
      />
    </div>
  );
}
