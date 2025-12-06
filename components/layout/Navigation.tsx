"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/auth/permissions";
import { LayoutDashboard, Receipt, FileText, CreditCard, PiggyBank, Wallet, Settings, Bell, Target, TrendingUp, BarChart3, ChevronUp, ChevronDown, Users, Building, List, Flag, Mail, Webhook, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  receipt: Receipt,
  description: FileText,
  credit_card: CreditCard,
  savings: PiggyBank,
  account_balance_wallet: Wallet,
  settings: Settings,
  notifications: Bell,
  track_changes: Target,
  trending_up: TrendingUp,
  analytics: BarChart3,
  group: Users,
  business: Building,
  category: List,
  flag: Flag,
  email: Mail,
  webhook: Webhook,
};

type NavItem = {
  label: string;
  href: string;
  icon: string;
  requiredPermission?: Permission;
};

type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
  requiredPermission?: Permission;
};

type NavConfig = NavItem | NavGroup;

// Проверка является ли элемент группой
function isNavGroup(item: NavConfig): item is NavGroup {
  return 'items' in item;
}

type NavigationProps = {
  navConfig: NavConfig[];
};

export default function Navigation({ navConfig }: NavigationProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Функция переключения группы
  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  // Проверка активности элемента
  const isItemActive = (href: string) => {
    if (pathname === href) {
      return true;
    } else if (pathname && pathname.startsWith(href + "/")) {
      if (href !== "/settings" && href !== "/notifications") {
        return true;
      }
    }
    return false;
  };

  return (
    <nav className="space-y-1" aria-label="Основная навигация">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Главное меню</div>
      {navConfig.map((item, index) => {
        if (isNavGroup(item)) {
          // Группа с подпунктами
          const isOpen = openGroups.has(item.label);
          const hasActiveChild = item.items.some(child => isItemActive(child.href));
          
          return (
            <div key={`group-${index}`}>
              <Button 
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-3 py-2 h-auto text-sm",
                  hasActiveChild ? "bg-primary/10 text-primary" : "text-foreground"
                )}
                onClick={() => toggleGroup(item.label)}
              >
                {(() => { const Icon = ICON_MAP[item.icon] || Settings; return <Icon className="h-5 w-5" aria-hidden />; })()}
                <span className="flex-1 text-left">{item.label}</span>
                {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
              </Button>
              
              {isOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.items.map((child, childIndex) => (
                    <Link
                      key={`child-${index}-${childIndex}`}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                        isItemActive(child.href) ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                      )}
                    >
                      {(() => { const Icon = ICON_MAP[child.icon] || Settings; return <Icon className="h-5 w-5" aria-hidden />; })()}
                      <span>{child.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        } else {
          // Обычный пункт меню
          return (
            <Link
              key={`item-${index}`}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                isItemActive(item.href) ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              )}
            >
              {(() => { const Icon = ICON_MAP[item.icon] || Settings; return <Icon className="h-5 w-5" aria-hidden />; })()}
              <span>{item.label}</span>
            </Link>
          );
        }
      })}
    </nav>
  );
}
