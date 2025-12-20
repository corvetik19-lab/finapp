import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CreditCard, 
  CheckCircle, 
  Calendar, 
  Users, 
  Crown,
  Sparkles,
  Building2,
  Mail,
  Shield,
  Clock
} from "lucide-react";
import { ALL_MODES } from "@/lib/platform/modes-config";

export const dynamic = "force-dynamic";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  created_at: string;
  role_name?: string;
  role_color?: string;
  is_admin?: boolean;
}

export default async function SubscriptionPage() {
  const { data: { user } } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  
  if (!organization) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600">Организация не найдена</h1>
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

  // Получаем пользователей организации
  let users: UserData[] = [];
  let adminCount = 0;
  
  if (companyIds.length > 0) {
    // Сначала получаем членов компании
    const { data: membersData } = await adminClient
      .from('company_members')
      .select(`
        user_id,
        role,
        status,
        created_at,
        role_id,
        roles (
          name,
          color
        )
      `)
      .in('company_id', companyIds)
      .eq('status', 'active');

    if (membersData && membersData.length > 0) {
      // Получаем профили отдельным запросом
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData } = await adminClient
        .from('profiles')
        .select('id, email, full_name, avatar_url, global_role')
        .in('id', userIds);

      // Получаем роли из user_roles (для пользователей у которых role_id в company_members пустой)
      const { data: userRolesData } = await adminClient
        .from('user_roles')
        .select('user_id, role_id, roles(name, color)')
        .in('user_id', userIds)
        .in('company_id', companyIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );
      
      const userRolesMap = new Map(
        (userRolesData || []).map(ur => [ur.user_id, ur.roles as unknown as { name: string; color: string } | null])
      );

      users = membersData.map(m => {
        const profile = profilesMap.get(m.user_id);
        // Сначала пробуем роль из company_members, потом из user_roles
        let roleData = m.roles as unknown as { name: string; color: string } | null;
        if (!roleData) {
          roleData = userRolesMap.get(m.user_id) || null;
        }
        const isAdmin = m.role === 'admin' || profile?.global_role === 'admin' || profile?.global_role === 'super_admin';
        
        if (isAdmin) adminCount++;
        
        return {
          id: m.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          role: m.role,
          status: m.status,
          created_at: m.created_at,
          role_name: roleData?.name || undefined,
          role_color: roleData?.color || undefined,
          is_admin: isAdmin,
        };
      });
    }
  }

  // Получаем режимы организации
  const allowedModes = organization.allowed_modes || [];
  const enabledModeNames = ALL_MODES.filter(m => allowedModes.includes(m.key)).map(m => m.label);

  // Определяем план на основе режимов
  const getPlanName = () => {
    if (allowedModes.length === 1 && allowedModes.includes('ai_studio')) return 'ИИ Студия';
    if (allowedModes.includes('tenders')) return 'Бизнес';
    if (allowedModes.includes('finance')) return 'Стандарт';
    return 'Базовый';
  };

  const getPlanPrice = () => {
    if (allowedModes.length === 1 && allowedModes.includes('ai_studio')) return '990 ₽/мес';
    if (allowedModes.includes('tenders')) return '2 990 ₽/мес';
    if (allowedModes.includes('finance')) return '1 490 ₽/мес';
    return 'Бесплатно';
  };

  const getUserLimit = () => {
    if (allowedModes.length === 1 && allowedModes.includes('ai_studio')) return 5;
    if (allowedModes.includes('tenders')) return 25;
    return 10;
  };

  // Считаем только НЕ-админов для лимита подписки
  const regularUsersCount = users.filter(u => !u.is_admin).length;
  
  const subscription = {
    plan: getPlanName(),
    status: "active",
    usersLimit: getUserLimit(),
    usersUsed: regularUsersCount, // Только обычные пользователи в лимите
    totalUsers: users.length, // Всего пользователей включая админов
    adminsCount: adminCount,
    startDate: organization.created_at ? new Date(organization.created_at).toLocaleDateString("ru-RU") : 'Не указана',
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU"),
    price: getPlanPrice(),
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'viewer': return 'Наблюдатель';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Подписка</h1>
        <p className="text-gray-500 mt-1">
          Управление тарифным планом организации
        </p>
      </header>

      {/* Текущий план */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Текущий план
            </CardTitle>
            <Badge className="bg-green-500">Активна</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Тарифный план</div>
              <div className="text-2xl font-bold text-indigo-600">{subscription.plan}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Пользователи
              </div>
              <div className="text-2xl font-bold">{subscription.usersUsed} / {subscription.usersLimit}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Следующее списание
              </div>
              <div className="text-2xl font-bold">{subscription.nextBilling}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Стоимость</div>
              <div className="text-2xl font-bold">{subscription.price}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список пользователей */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Пользователи организации
              </CardTitle>
              <CardDescription>
                {subscription.usersUsed} из {subscription.usersLimit} мест использовано
                {subscription.adminsCount > 0 && (
                  <span className="text-amber-600 ml-1">
                    (+ {subscription.adminsCount} админ{subscription.adminsCount > 1 ? 'а' : ''} не в лимите)
                  </span>
                )}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {Math.round((subscription.usersUsed / subscription.usersLimit) * 100)}% использовано
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет активных пользователей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(u.full_name, u.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">
                        {u.full_name || u.email}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {u.is_admin && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        <Crown className="h-3 w-3 mr-1" />
                        Админ
                      </Badge>
                    )}
                    <Badge 
                      className="border"
                      style={{ 
                        backgroundColor: u.role_color ? `${u.role_color}20` : '#f3f4f6',
                        color: u.role_color || '#6b7280',
                        borderColor: u.role_color ? `${u.role_color}40` : '#e5e7eb'
                      }}
                    >
                      {u.role_name || getRoleLabel(u.role)}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(u.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Включённые режимы */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Включённые режимы
          </CardTitle>
          <CardDescription>Модули, доступные в вашем плане</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {enabledModeNames.length > 0 ? (
              enabledModeNames.map((name) => (
                <Badge key={name} className="bg-purple-100 text-purple-700 border-purple-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Нет активных режимов</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Функции плана */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Включено в ваш план
          </CardTitle>
          <CardDescription>Доступные функции и возможности</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              `До ${subscription.usersLimit} пользователей`,
              enabledModeNames.length > 0 ? `${enabledModeNames.length} режимов работы` : "Базовые режимы",
              "Управление сотрудниками",
              "Экспорт данных",
              "Настройка ролей",
              "Техническая поддержка",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Информация об организации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-600" />
            Информация об организации
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Название</div>
              <div className="font-medium">{organization.name}</div>
            </div>
            {organization.description && (
              <div>
                <div className="text-sm text-muted-foreground">Описание</div>
                <div className="font-medium">{organization.description}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Дата создания</div>
              <div className="font-medium">{subscription.startDate}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">ID организации</div>
              <div className="font-mono text-sm text-muted-foreground">{organization.id}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Действия */}
      <div className="flex gap-3">
        <Button variant="outline" disabled>
          <CreditCard className="h-4 w-4 mr-2" />
          Изменить план
        </Button>
        <Button variant="outline" disabled>
          <Calendar className="h-4 w-4 mr-2" />
          История платежей
        </Button>
      </div>
    </div>
  );
}
