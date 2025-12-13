import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentUserPermissions, canViewAllTenders } from '@/lib/permissions/check-permissions';
import Link from 'next/link';
import { 
  MessageSquare, 
  Video, 
  Kanban, 
  Target, 
  Users, 
  Calendar,
  ArrowRight,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const teamModules = [
  {
    title: 'Чат',
    description: 'Обсуждения по тендерам и командная коммуникация',
    href: '/tenders/team/chat',
    icon: MessageSquare,
    color: 'bg-blue-500',
    adminOnly: false,
  },
  {
    title: 'Конференции',
    description: 'Видеовстречи через Jitsi Meet',
    href: '/tenders/team/conferences',
    icon: Video,
    color: 'bg-purple-500',
    adminOnly: false,
  },
  {
    title: 'Канбан-доски',
    description: 'Управление задачами в визуальном формате',
    href: '/tenders/team/boards',
    icon: Kanban,
    color: 'bg-indigo-500',
    adminOnly: false,
  },
  {
    title: 'Спринты',
    description: 'Agile планирование для тендеров',
    href: '/tenders/team/sprints',
    icon: Target,
    color: 'bg-green-500',
    adminOnly: true,
  },
  {
    title: 'Загрузка команды',
    description: 'Распределение задач и мощностей',
    href: '/tenders/team/workload',
    icon: Users,
    color: 'bg-orange-500',
    adminOnly: true,
  },
  {
    title: 'Календарь занятости',
    description: 'Планирование времени команды',
    href: '/tenders/team/calendar',
    icon: Calendar,
    color: 'bg-rose-500',
    adminOnly: true,
  },
];

export default async function TeamPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const permissions = await getCurrentUserPermissions();
  const isAdmin = canViewAllTenders(permissions);

  // Фильтруем модули для сотрудников
  const availableModules = isAdmin 
    ? teamModules 
    : teamModules.filter(m => !m.adminOnly);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Командная работа
          </h1>
          <p className="text-muted-foreground mt-1">
            Инструменты для совместной работы над тендерами
          </p>
        </div>
        {isAdmin && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Администратор
          </Badge>
        )}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${module.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {module.adminOnly && (
                      <Badge variant="outline" className="text-xs">
                        Админ
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                    {module.title}
                  </CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                    Открыть <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats for Admin */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Активных досок</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Запланированных встреч</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Активных спринтов</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Сотрудников онлайн</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
