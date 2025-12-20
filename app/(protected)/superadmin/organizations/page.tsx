import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSubscriptions } from '@/lib/billing/subscription-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Eye, Shield, Crown } from 'lucide-react';
import { CreateOrganizationModal } from '@/components/admin/create-organization-modal';
import { cn } from '@/lib/utils';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Активна' },
  trial: { variant: 'secondary', label: 'Пробный' },
  expired: { variant: 'destructive', label: 'Истекла' },
  cancelled: { variant: 'outline', label: 'Отменена' },
  past_due: { variant: 'destructive', label: 'Просрочена' },
};

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const supabase = createAdminClient();

  // Получаем все организации
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  // Получаем подписки для связи с организациями
  const subscriptions = await getSubscriptions();
  const subsByOrg = new Map(subscriptions.map(s => [s.organization_id, s]));

  // Получаем всех пользователей для выбора владельца
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, global_role')
    .order('email');

  // Получаем профили для определения супер-админов
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, global_role');
  
  const superAdminIds = new Set(
    (profiles || []).filter(p => p.global_role === 'super_admin').map(p => p.id)
  );

  // Получаем владельцев/админов организаций через company_members
  const { data: orgAdmins } = await supabase
    .from('company_members')
    .select('user_id, role, companies!inner(organization_id)')
    .in('role', ['owner', 'admin'])
    .eq('status', 'active');

  // Группируем админов по организациям
  const adminsByOrg = new Map<string, string[]>();
  orgAdmins?.forEach((m) => {
    const companies = m.companies as { organization_id: string } | { organization_id: string }[];
    const orgId = Array.isArray(companies) ? companies[0]?.organization_id : companies?.organization_id;
    if (orgId) {
      if (!adminsByOrg.has(orgId)) {
        adminsByOrg.set(orgId, []);
      }
      adminsByOrg.get(orgId)!.push(m.user_id);
    }
  });

  // Определяем организации супер-админов - только те, где ВСЕ админы являются супер-админами
  // (т.е. организация принадлежит исключительно супер-админу)
  const superAdminOrgIds = new Set<string>();
  adminsByOrg.forEach((adminIds, orgId) => {
    const allAdminsAreSuperAdmins = adminIds.every(id => superAdminIds.has(id));
    if (allAdminsAreSuperAdmins && adminIds.length > 0) {
      superAdminOrgIds.add(orgId);
    }
  });

  // Считаем пользователей по организациям (исключая супер-админов)
  const { data: memberCounts } = await supabase
    .from('company_members')
    .select('user_id, company_id, companies!inner(organization_id)')
    .eq('status', 'active');

  const usersByOrg: Record<string, number> = {};
  memberCounts?.forEach((m: { user_id: string; companies: { organization_id: string } | { organization_id: string }[] }) => {
    // Пропускаем супер-админов
    if (superAdminIds.has(m.user_id)) return;
    
    const companies = m.companies;
    const orgId = Array.isArray(companies) ? companies[0]?.organization_id : companies?.organization_id;
    if (orgId) {
      usersByOrg[orgId] = (usersByOrg[orgId] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Все организации</h1>
          <p className="text-gray-500 mt-1">Список всех зарегистрированных организаций на платформе</p>
        </div>
        <CreateOrganizationModal users={users || []} />
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Организации ({organizations?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {organizations && organizations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Организация</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Пользователей</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Подписка</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Создана</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => {
                    const sub = subsByOrg.get(org.id);
                    const usersCount = usersByOrg[org.id] || 0;
                    const statusInfo = sub ? STATUS_STYLES[sub.status] || STATUS_STYLES.cancelled : null;
                    const isSuperAdminOrg = superAdminOrgIds.has(org.id);

                    return (
                      <tr key={org.id} className={cn(
                        "border-b last:border-0 hover:bg-gray-50",
                        isSuperAdminOrg && "bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100"
                      )}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-9 w-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm",
                              isSuperAdminOrg 
                                ? "bg-gradient-to-br from-purple-600 to-blue-600 ring-2 ring-purple-300 ring-offset-1"
                                : "bg-gradient-to-br from-blue-500 to-indigo-600"
                            )}>
                              {isSuperAdminOrg ? (
                                <Crown className="h-5 w-5" />
                              ) : (
                                org.name?.charAt(0)?.toUpperCase() || '?'
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {org.name}
                                {isSuperAdminOrg && (
                                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Супер-админ
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{org.slug || org.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{usersCount}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isSuperAdminOrg ? (
                            <div>
                              <div className="font-medium text-purple-700">∞ Бессрочно</div>
                              <div className="text-xs text-purple-500">Без ограничений</div>
                            </div>
                          ) : sub ? (
                            <div>
                              <div className="font-medium text-gray-900">{sub.plan?.name}</div>
                              <div className="text-xs text-gray-500">
                                {sub.billing_period === 'yearly' ? 'Годовая' : 'Месячная'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Нет</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isSuperAdminOrg ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              ✓ Активный
                            </Badge>
                          ) : statusInfo ? (
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          ) : (
                            <Badge variant="outline">Без подписки</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(org.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/superadmin/organizations/${org.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Детали
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Нет организаций</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
