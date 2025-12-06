import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, UserCog, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default async function UsersPage() {
  const supabase = createAdminClient();

  // Получаем всех пользователей
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

  // Получаем профили
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  // Получаем членство в компаниях
  const { data: memberships } = await supabase
    .from('company_members')
    .select(`
      user_id,
      role,
      status,
      company:companies(name, organization:organizations(name))
    `)
    .eq('status', 'active');

  // Группируем членства по пользователям
  const membershipsByUser: Record<string, Array<{
    role: string;
    company: string;
    organization: string;
  }>> = {};
  
  memberships?.forEach((m) => {
    if (!membershipsByUser[m.user_id]) {
      membershipsByUser[m.user_id] = [];
    }
    const company = m.company as { name?: string; organization?: { name?: string } };
    membershipsByUser[m.user_id].push({
      role: m.role,
      company: company?.name || '',
      organization: company?.organization?.name || '',
    });
  });

  // Объединяем данные
  const users = (authUsers || []).map(user => {
    const profile = profiles?.find(p => p.id === user.id);
    const userMemberships = membershipsByUser[user.id] || [];
    
    return {
      id: user.id,
      email: user.email || '',
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      global_role: profile?.global_role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      memberships: userMemberships,
    };
  });

  // Статистика
  const superAdmins = users.filter(u => u.global_role === 'super_admin').length;
  const admins = users.filter(u => u.global_role === 'admin').length;
  const regularUsers = users.filter(u => u.global_role === 'user').length;

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

      {/* Таблица пользователей */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Пользователи ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Пользователь</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Роль</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Организации</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Регистрация</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Последний вход</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm",
                          user.global_role === 'super_admin' 
                            ? 'bg-gradient-to-br from-purple-600 to-blue-600'
                            : user.global_role === 'admin'
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        )}>
                          {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{user.full_name || 'Без имени'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        user.global_role === 'super_admin' ? 'default' :
                        user.global_role === 'admin' ? 'secondary' : 'outline'
                      } className={
                        user.global_role === 'super_admin' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : ''
                      }>
                        {user.global_role === 'super_admin' ? 'Супер-админ' :
                         user.global_role === 'admin' ? 'Админ' : 'Пользователь'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {user.memberships.length > 0 ? (
                        <div className="text-sm">
                          {user.memberships.slice(0, 2).map((m, i) => (
                            <div key={i} className="mb-0.5">
                              <span className="font-medium">{m.organization}</span>
                              <span className="text-gray-500 text-xs ml-1">({m.role})</span>
                            </div>
                          ))}
                          {user.memberships.length > 2 && (
                            <div className="text-gray-400 text-xs">+{user.memberships.length - 2} ещё</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{formatDateTime(user.created_at)}</td>
                    <td className="py-3 px-4 text-sm">
                      {user.last_sign_in_at 
                        ? <span className="text-gray-600">{formatDateTime(user.last_sign_in_at)}</span>
                        : <span className="text-gray-400">Никогда</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
