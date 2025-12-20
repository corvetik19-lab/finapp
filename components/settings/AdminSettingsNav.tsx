"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Shield, 
  CreditCard, 
  Puzzle, 
  LayoutGrid,
  Bell,
  ArrowLeft,
  Gavel,
  Sparkles,
  Wallet,
  TrendingUp,
  UserCircle,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  business: Building2,
  people: Users,
  admin_panel_settings: Shield,
  payments: CreditCard,
  extension: Puzzle,
  modes: LayoutGrid,
  notifications: Bell,
  tenders: Gavel,
  ai_studio: Sparkles,
  finance: Wallet,
  investments: TrendingUp,
  profile: UserCircle,
  departments: Briefcase,
};

interface AdminSettingsNavProps {
  allowedModes?: string[];
}

// Настройки модулей по режимам
const MODE_SETTINGS: Record<string, { href: string; icon: string; label: string }> = {
  'tenders': { href: "/tenders/settings", icon: "tenders", label: "Настройки тендеров" },
  'ai_studio': { href: "/admin/settings/modes/ai-studio", icon: "ai_studio", label: "Настройка ИИ Студии" },
  'finance': { href: "/finance/settings", icon: "finance", label: "Настройки финансов" },
  'investments': { href: "/investments/settings", icon: "investments", label: "Настройки инвестиций" },
};

// Режимы которые требуют интеграций
const MODES_WITH_INTEGRATIONS = ['tenders'];

// Получить URL возврата по режиму
const getReturnUrl = (allowedModes: string[]): { href: string; label: string } | null => {
  if (allowedModes.includes('ai_studio')) {
    return { href: "/ai-studio", label: "Вернуться в ИИ Студию" };
  }
  if (allowedModes.includes('tenders')) {
    return { href: "/tenders/dashboard", label: "Вернуться к тендерам" };
  }
  if (allowedModes.includes('finance')) {
    return { href: "/finance/dashboard", label: "Вернуться к финансам" };
  }
  if (allowedModes.includes('investments')) {
    return { href: "/investments/dashboard", label: "Вернуться к инвестициям" };
  }
  return null;
};

export default function AdminSettingsNav({ allowedModes = [] }: AdminSettingsNavProps) {
  const pathname = usePathname();
  
  // Формируем модули на основе allowed_modes
  const moduleItems = allowedModes
    .filter(mode => MODE_SETTINGS[mode])
    .map(mode => MODE_SETTINGS[mode]);
  
  // Показываем интеграции только если есть режим с интеграциями
  const showIntegrations = allowedModes.some(mode => MODES_WITH_INTEGRATIONS.includes(mode));
  
  // URL для возврата
  const returnLink = getReturnUrl(allowedModes);
  
  // Базовые настройки
  const settingsItems = [
    ...(showIntegrations ? [{ href: "/admin/settings/integrations", icon: "extension", label: "Интеграции" }] : []),
    { href: "/admin/settings/notifications", icon: "notifications", label: "Уведомления" },
    { href: "/admin/settings/subscription", icon: "payments", label: "Подписка" },
  ];
  
  // Навигация для админа организации
  const NAV_ITEMS = [
    {
      section: "Обзор",
      items: [
        { href: "/admin/settings/overview", icon: "dashboard", label: "Обзор" },
      ],
    },
    {
      section: "Личные",
      items: [
        { href: "/admin/settings/profile", icon: "profile", label: "Мой профиль" },
      ],
    },
    {
      section: "Организация",
      items: [
        { href: "/admin/settings/organization", icon: "business", label: "Моя организация" },
        { href: "/admin/settings/modes", icon: "modes", label: "Режимы" },
        { href: "/admin/settings/users", icon: "people", label: "Пользователи" },
        { href: "/admin/settings/roles", icon: "admin_panel_settings", label: "Роли и права" },
        { href: "/admin/settings/departments", icon: "departments", label: "Отделы" },
      ],
    },
    ...(moduleItems.length > 0 ? [{
      section: "Модули",
      items: moduleItems,
    }] : []),
    {
      section: "Настройки",
      items: settingsItems,
    },
  ];

  return (
    <nav className="space-y-6">
      {NAV_ITEMS.map((section) => (
        <div key={section.section}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            {section.section}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = ICON_MAP[item.icon] || LayoutDashboard;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-purple-50 text-purple-700 shadow-sm" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-purple-600" : "text-gray-400")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Кнопка возврата */}
      {returnLink && (
        <div className="pt-4 border-t border-gray-200">
          <Link 
            href={returnLink.href} 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{returnLink.label}</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
