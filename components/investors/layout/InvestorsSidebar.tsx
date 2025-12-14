"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CalendarClock,
  BarChart3,
  Users,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { href: "/investors", label: "Дашборд", icon: LayoutDashboard },
  { href: "/investors/sources", label: "Источники", icon: Building2 },
  { href: "/investors/investments", label: "Инвестиции", icon: FileText },
  { href: "/investors/returns", label: "График возвратов", icon: CalendarClock },
  { href: "/investors/reports", label: "Отчёты", icon: BarChart3 },
  { href: "/investors/access", label: "Доступ инвесторов", icon: Users },
  { href: "/investors/settings", label: "Настройки", icon: Settings },
];

export function InvestorsSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/investors") return pathname === "/investors";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <span className="font-semibold text-lg">Инвесторы</span>
        </div>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Button
                key={item.href}
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  active && "bg-secondary font-medium"
                )}
                asChild
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Вернуться в панель
          </Link>
        </Button>
      </div>
    </aside>
  );
}
