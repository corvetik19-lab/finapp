import { redirect } from "next/navigation";
import Link from "next/link";
import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  Shield, 
  Puzzle, 
  LayoutGrid,
  Bell,
  CreditCard,
  ChevronRight,
  Sparkles,
  Briefcase,
  Wallet,
  TrendingUp
} from "lucide-react";

export default async function SettingsOverviewPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  const modesCount = organization?.allowed_modes?.length || 0;
  const allowedModes = organization?.allowed_modes || [];

  // Настройки модулей по режимам
  const modeSettings: Record<string, { href: string; icon: typeof Building2; title: string; description: string; gradient: string }> = {
    'ai_studio': {
      href: "/admin/settings/modes/ai-studio",
      icon: Sparkles,
      title: "Настройка ИИ Студии",
      description: "Модели, лимиты и доступ к функциям ИИ",
      gradient: "from-violet-500 to-purple-600",
    },
    'tenders': {
      href: "/admin/settings/modes/tenders",
      icon: Briefcase,
      title: "Настройка Тендеров",
      description: "Тендеры, закупки и интеграции",
      gradient: "from-blue-500 to-cyan-600",
    },
    'finance': {
      href: "/admin/settings/modes/finance",
      icon: Wallet,
      title: "Настройка Финансов",
      description: "Счета, категории и бюджеты",
      gradient: "from-green-500 to-emerald-600",
    },
    'investments': {
      href: "/admin/settings/modes/investments",
      icon: TrendingUp,
      title: "Настройка Инвестиций",
      description: "Портфели и аналитика",
      gradient: "from-amber-500 to-orange-600",
    },
  };

  // Базовые карточки настроек
  const baseSettingsCards = [
    {
      href: "/admin/settings/organization",
      icon: Building2,
      title: "Моя организация",
      description: organization?.name || "Не настроено",
      gradient: "from-blue-500 to-blue-600",
      badge: null,
    },
    {
      href: "/admin/settings/modes",
      icon: LayoutGrid,
      title: "Режимы",
      description: "Доступные режимы работы",
      gradient: "from-purple-500 to-violet-600",
      badge: modesCount > 0 ? `${modesCount} вкл.` : null,
    },
    {
      href: "/admin/settings/users",
      icon: Users,
      title: "Пользователи",
      description: "Приглашения и управление доступом",
      gradient: "from-green-500 to-emerald-600",
      badge: null,
    },
    {
      href: "/admin/settings/roles",
      icon: Shield,
      title: "Роли и права",
      description: "Настройка прав доступа сотрудников",
      gradient: "from-amber-500 to-orange-600",
      badge: null,
    },
  ];

  // Добавляем интеграции только для режима tenders
  if (allowedModes.includes('tenders')) {
    baseSettingsCards.push({
      href: "/admin/settings/integrations",
      icon: Puzzle,
      title: "Интеграции",
      description: "Telegram, уведомления и другие сервисы",
      gradient: "from-pink-500 to-rose-600",
      badge: null,
    });
  }

  baseSettingsCards.push(
    {
      href: "/admin/settings/notifications",
      icon: Bell,
      title: "Уведомления",
      description: "Настройка оповещений организации",
      gradient: "from-cyan-500 to-teal-600",
      badge: null,
    },
    {
      href: "/admin/settings/subscription",
      icon: CreditCard,
      title: "Подписка",
      description: "Тарифный план и оплата",
      gradient: "from-indigo-500 to-blue-600",
      badge: null,
    }
  );

  // Добавляем настройки модулей только для доступных режимов
  const moduleCards = allowedModes
    .filter(mode => modeSettings[mode])
    .map(mode => ({
      ...modeSettings[mode],
      badge: null,
    }));

  const settingsCards = [...baseSettingsCards, ...moduleCards];

  return (
    <div className="space-y-6 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Обзор настроек</h1>
        <p className="text-gray-500 mt-1">
          Управляйте организацией, пользователями, ролями и интеграциями
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-100 h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {card.title}
                        </h3>
                        {card.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {card.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {card.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
