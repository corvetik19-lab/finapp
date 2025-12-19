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
};

// Навигация для админа организации (не супер-админа)
const NAV_ITEMS = [
  {
    section: "Обзор",
    items: [
      { href: "/admin/settings/overview", icon: "dashboard", label: "Обзор" },
    ],
  },
  {
    section: "Организация",
    items: [
      { href: "/admin/settings/organization", icon: "business", label: "Моя организация" },
      { href: "/admin/settings/modes", icon: "modes", label: "Режимы" },
      { href: "/admin/settings/users", icon: "people", label: "Пользователи" },
      { href: "/admin/settings/roles", icon: "admin_panel_settings", label: "Роли и права" },
    ],
  },
  {
    section: "Модули",
    items: [
      { href: "/tenders/settings", icon: "tenders", label: "Настройки тендеров" },
    ],
  },
  {
    section: "Настройки",
    items: [
      { href: "/admin/settings/integrations", icon: "extension", label: "Интеграции" },
      { href: "/admin/settings/notifications", icon: "notifications", label: "Уведомления" },
      { href: "/admin/settings/subscription", icon: "payments", label: "Подписка" },
    ],
  },
];

export default function AdminSettingsNav() {
  const pathname = usePathname();

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
      
      {/* Кнопка возврата к тендерам */}
      <div className="pt-4 border-t border-gray-200">
        <Link 
          href="/tenders/dashboard" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Вернуться к тендерам</span>
        </Link>
      </div>
    </nav>
  );
}
