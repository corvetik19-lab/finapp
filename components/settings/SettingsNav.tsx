"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeft, LayoutDashboard, CreditCard, User, Building2, Building, Users, ShieldCheck, GitBranch, Puzzle, Key, Lock, Bell, HardDrive, HelpCircle } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface SettingsNavProps {
  isOrgAdmin?: boolean;
}

const NAV_ITEMS: { section: string; items: { href: string; Icon: LucideIcon; label: string }[] }[] = [
  { section: "Обзор", items: [
    { href: "/settings/overview", Icon: LayoutDashboard, label: "Обзор" },
    { href: "/settings/subscription", Icon: CreditCard, label: "Подписка" },
  ]},
  { section: "Личное", items: [
    { href: "/settings/profile", Icon: User, label: "Профиль" },
  ]},
  { section: "Управление", items: [
    { href: "/settings/organization", Icon: Building2, label: "Организация" },
    { href: "/settings/legal-entities", Icon: Building, label: "Юр. лица" },
    { href: "/settings/users", Icon: Users, label: "Пользователи" },
    { href: "/settings/roles", Icon: ShieldCheck, label: "Роли и права" },
    { href: "/settings/departments", Icon: GitBranch, label: "Отделы" },
  ]},
  { section: "Интеграции", items: [
    { href: "/settings/integrations", Icon: Puzzle, label: "Интеграции" },
    { href: "/settings/api-keys", Icon: Key, label: "API ключи" },
  ]},
  { section: "Система", items: [
    { href: "/settings/security", Icon: Lock, label: "Безопасность" },
    { href: "/settings/notifications", Icon: Bell, label: "Уведомления" },
    { href: "/settings/backup", Icon: HardDrive, label: "Резервные копии" },
  ]},
  { section: "Помощь", items: [
    { href: "/settings/tour", Icon: HelpCircle, label: "Туры и подсказки" },
  ]},
];

export default function SettingsNav({}: SettingsNavProps) {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-card border-r min-h-screen p-4 space-y-6">
      <div className="pb-4 border-b">
        <Link href="/tenders/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" /><span>Вернуться к тендерам</span></Link>
      </div>
      {NAV_ITEMS.map((section) => (
        <div key={section.section}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.section}</h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><item.Icon className="h-4 w-4" /><span>{item.label}</span></Link>;
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
