"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Factory, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface TendersModule {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  description: string;
}

const TENDERS_MODULES: TendersModule[] = [
  {
    key: "tenders",
    name: "Тендеры",
    icon: <FileText className="h-4 w-4" />,
    color: "#F59E0B",
    href: "/tenders/dashboard",
    description: "Реестр тендеров",
  },
  {
    key: "suppliers",
    name: "Поставщики",
    icon: <Factory className="h-4 w-4" />,
    color: "#3B82F6",
    href: "/tenders/suppliers",
    description: "Управление поставщиками",
  },
  {
    key: "accounting",
    name: "Бухгалтерия",
    icon: <Receipt className="h-4 w-4" />,
    color: "#10B981",
    href: "/tenders/accounting",
    description: "Документы и учёт",
  },
];

export function TendersModuleSwitcher() {
  const pathname = usePathname();

  // Показываем только если находимся в режиме Тендеры
  if (!pathname.startsWith("/tenders")) {
    return null;
  }

  // Определяем активный модуль
  const getActiveModule = () => {
    if (pathname.startsWith("/tenders/suppliers")) return "suppliers";
    if (pathname.startsWith("/tenders/accounting")) return "accounting";
    return "tenders";
  };

  const activeModule = getActiveModule();

  return (
    <div className="flex items-center gap-1 ml-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg border">
      {TENDERS_MODULES.map((module) => {
        const isActive = module.key === activeModule;

        return (
          <Link
            key={module.key}
            href={module.href}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              isActive
                ? "bg-white dark:bg-zinc-700 shadow-sm border"
                : "hover:bg-white/50 dark:hover:bg-zinc-700/50 text-gray-600 dark:text-gray-400"
            )}
            style={{
              color: isActive ? module.color : undefined,
              borderColor: isActive ? module.color : "transparent",
            }}
            title={module.description}
          >
            <span
              className="flex items-center justify-center"
              style={{ color: isActive ? module.color : undefined }}
            >
              {module.icon}
            </span>
            <span className="hidden sm:inline">{module.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
