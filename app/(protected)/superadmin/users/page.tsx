import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, UserCog, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import OrganizationsList from './OrganizationsList';

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const dynamic = 'force-dynamic';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  global_role: string;
  created_at: string;
  last_sign_in_at: string | null;
  memberships: Array<{
    role: string;
    company: string;
    organization: string;
    organization_id: string;
    department?: string;
  }>;
}

export default async function UsersPage() {
  const supabase = createAdminClient();

  // Получаем всех пользователей
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

  // Получаем профили
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  // Получаем все организации
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .order('name');

  // Получаем членство в компаниях с отделами
  const { data: memberships } = await supabase
    .from('company_members')
    .select(`
      user_id,
      role,
      status,
      companies!inner(id, name, organization_id, organizations!inner(id, name))
    `)
    .eq('status', 'active');

  // Получаем роли пользователей из user_roles
  const { data: userRolesData } = await supabase
    .from('user_roles')
    .select('user_id, roles(id, name)');

  const userRolesMap = new Map<string, string>();
  userRolesData?.forEach((ur) => {
    const roles = ur.roles as { id?: string; name?: string } | null;
    if (roles?.name) {
      userRolesMap.set(ur.user_id, roles.name);
    }
  });

  // Получаем сотрудников для отделов
  const { data: employees } = await supabase
    .from('employees')
    .select('user_id, department, department_id, departments(name)')
    .is('deleted_at', null);

  const employeesByUser = new Map<string, { department?: string }>();
  employees?.forEach(emp => {
    if (emp.user_id) {
      const deptName = (emp.departments as { name?: string })?.name || emp.department;
      employeesByUser.set(emp.user_id, { department: deptName });
    }
  });

  // Группируем членства по пользователям
  const membershipsByUser: Record<string, Array<{
    role: string;
    company: string;
    organization: string;
    organization_id: string;
    department?: string;
  }>> = {};
  
  memberships?.forEach((m) => {
    if (!membershipsByUser[m.user_id]) {
      membershipsByUser[m.user_id] = [];
    }
    const companies = m.companies as { id?: string; name?: string; organization_id?: string; organizations?: { id?: string; name?: string } };
    const empData = employeesByUser.get(m.user_id);
    // Получаем роль из user_roles если есть, иначе из company_members
    const userRole = userRolesMap.get(m.user_id) || m.role;
    membershipsByUser[m.user_id].push({
      role: userRole,
      company: companies?.name || '',
      organization: companies?.organizations?.name || '',
      organization_id: companies?.organizations?.id || companies?.organization_id || '',
      department: empData?.department,
    });
  });

  // Объединяем данные
  const users: UserData[] = (authUsers || []).map(user => {
    const profile = profiles?.find(p => p.id === user.id);
    const userMemberships = membershipsByUser[user.id] || [];
    
    return {
      id: user.id,
      email: user.email || '',
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      global_role: profile?.global_role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      memberships: userMemberships,
    };
  });

  // Статистика
  const superAdmins = users.filter(u => u.global_role === 'super_admin').length;
  const admins = users.filter(u => u.global_role === 'admin').length;
  const regularUsers = users.filter(u => u.global_role === 'user').length;

  // Получаем ID супер-админов (используется в OrganizationsList)
  const _superAdminIds = new Set(users.filter(u => u.global_role === 'super_admin').map(u => u.id));

  // Группировка пользователей по организациям
  const usersByOrg = new Map<string, { org: { id: string; name: string; owner_id?: string }; users: UserData[] }>();
  const usersWithoutOrg: UserData[] = [];

  // Определяем организации супер-админов (где все админы - супер-админы)
  const _superAdminOrgIds = new Set<string>();
  
  users.forEach(user => {
    if (user.memberships.length === 0) {
      usersWithoutOrg.push(user);
    } else {
      user.memberships.forEach(m => {
        if (m.organization_id) {
          if (!usersByOrg.has(m.organization_id)) {
            const org = organizations?.find(o => o.id === m.organization_id);
            usersByOrg.set(m.organization_id, {
              org: { id: m.organization_id, name: m.organization || 'Неизвестная', owner_id: org?.owner_id },
              users: []
            });
          }
          const orgData = usersByOrg.get(m.organization_id)!;
          
          // Проверяем: супер-админ показывается только в своей организации
          // Организация супер-админа - та где он единственный или все админы - супер-админы
          const isSuperAdmin = user.global_role === 'super_admin';
          const orgName = m.organization;
          const isSuperAdminOrg = orgName === 'Личное пространство';
          
          // Если это супер-админ и это НЕ его личная организация - пропускаем
          if (isSuperAdmin && !isSuperAdminOrg) {
            return;
          }
          
          if (!orgData.users.find(u => u.id === user.id)) {
            orgData.users.push(user);
          }
        }
      });
    }
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Все пользователи</h1>
        <p className="text-gray-500 mt-1">Список всех зарегистрированных пользователей на платформе</p>
      </header>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Всего пользователей</span>
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/80 font-medium">Супер-админы</span>
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold">{superAdmins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Админы</span>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <UserCog className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Пользователи</span>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{regularUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Пользователи по организациям */}
      <OrganizationsList 
        organizations={Array.from(usersByOrg.entries())} 
        allUsers={users} 
      />

      {/* Пользователи без организации */}
      {usersWithoutOrg.length > 0 && (
        <Card>
          <CardHeader className="pb-3 bg-gray-50 border-b">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-400 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span>Без организации</span>
              <Badge variant="outline" className="ml-auto">{usersWithoutOrg.length} чел.</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Пользователь</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Роль</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Регистрация</th>
                  </tr>
                </thead>
                <tbody>
                  {usersWithoutOrg.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm",
                            user.global_role === 'super_admin' 
                              ? 'bg-gradient-to-br from-purple-600 to-blue-600'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          )}>
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{user.full_name || 'Без имени'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-sm">{user.email}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">
                          {user.global_role === 'super_admin' ? 'Супер-админ' :
                           user.global_role === 'admin' ? 'Админ' : 'Пользователь'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-sm">{formatDateTime(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
