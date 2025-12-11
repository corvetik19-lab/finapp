"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Wallet,
  PiggyBank,
  Receipt,
  FileBarChart,
  TrendingUp,
  Settings,
  ChevronRight,
  Banknote,
  Calendar,
  BarChart3,
  Sparkles,
  Tag,
  Package,
  Zap,
  MessageSquare,
  Lightbulb,
  LineChart,
  FileText,
  type LucideIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Навигация для финансов
const financeNavigation = {
  main: [
    {
      title: "Обзор",
      items: [
        { title: "Дашборд", url: "/finance/dashboard", icon: LayoutDashboard },
        { title: "Транзакции", url: "/finance/transactions", icon: ArrowLeftRight },
        { title: "Счета", url: "/finance/cards", icon: CreditCard },
      ],
    },
    {
      title: "Планирование",
      items: [
        { title: "Бюджеты", url: "/finance/budgets", icon: PiggyBank },
        { title: "Платежи", url: "/finance/payments", icon: Calendar },
      ],
    },
    {
      title: "Кредиты",
      items: [
        { title: "Кредиты", url: "/finance/loans", icon: Banknote },
        { title: "Кредитные карты", url: "/finance/credit-cards", icon: Wallet },
      ],
    },
  ],
  reports: {
    title: "Отчёты",
    icon: FileBarChart,
    items: [
      { title: "Обзор", url: "/finance/reports", icon: BarChart3 },
      { title: "Аналитика", url: "/finance/analytics/advanced", icon: TrendingUp },
      { title: "Прогнозы", url: "/finance/forecasts", icon: Sparkles },
      { title: "Свои отчёты", url: "/finance/reports/custom", icon: FileText },
    ],
  },
  tools: {
    title: "Инструменты",
    icon: Zap,
    items: [
      { title: "Чеки", url: "/finance/receipts", icon: Receipt },
    ],
  },
  ai: {
    title: "AI",
    icon: Sparkles,
    items: [
      { title: "AI Чат", url: "/ai-chat", icon: MessageSquare },
      { title: "AI Советник", url: "/ai-advisor", icon: Lightbulb },
      { title: "AI Аналитика", url: "/ai-analytics", icon: LineChart },
    ],
  },
  settings: {
    title: "Настройки",
    icon: Settings,
    items: [
      { title: "Общие", url: "/finance/settings", icon: Settings },
      { title: "Категории", url: "/finance/settings/categories", icon: Tag },
      { title: "Товары", url: "/finance/settings/products", icon: Package },
      { title: "Быстрые пресеты", url: "/finance/settings/presets", icon: Zap },
    ],
  },
}

interface NavSectionProps {
  title: string
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
}

function NavSection({ title, items }: NavSectionProps) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

interface NavCollapsibleProps {
  title: string
  icon: LucideIcon
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
}

function NavCollapsible({ title, icon: Icon, items }: NavCollapsibleProps) {
  const pathname = usePathname()
  const isActive = items.some((item) => pathname === item.url || pathname.startsWith(item.url + "/"))

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={title} isActive={isActive}>
                <Icon className="size-4" />
                <span>{title}</span>
                <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {items.map((item) => {
                  const isItemActive = pathname === item.url || pathname.startsWith(item.url + "/")
                  return (
                    <SidebarMenuSubItem key={item.url}>
                      <SidebarMenuSubButton asChild isActive={isItemActive}>
                        <Link href={item.url}>
                          <item.icon className="size-3" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function FinanceSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/finance/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-green-600 text-white">
                  <Wallet className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Финансы</span>
                  <span className="truncate text-xs text-muted-foreground">Личный учёт</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation Sections */}
        {financeNavigation.main.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} />
        ))}

        {/* Reports - Collapsible */}
        <NavCollapsible
          title={financeNavigation.reports.title}
          icon={financeNavigation.reports.icon}
          items={financeNavigation.reports.items}
        />

        {/* Tools - Collapsible */}
        <NavCollapsible
          title={financeNavigation.tools.title}
          icon={financeNavigation.tools.icon}
          items={financeNavigation.tools.items}
        />

        {/* AI - Collapsible */}
        <NavCollapsible
          title={financeNavigation.ai.title}
          icon={financeNavigation.ai.icon}
          items={financeNavigation.ai.items}
        />

        {/* Settings - Collapsible */}
        <NavCollapsible
          title={financeNavigation.settings.title}
          icon={financeNavigation.settings.icon}
          items={financeNavigation.settings.items}
        />
      </SidebarContent>

      <SidebarFooter />

      <SidebarRail />
    </Sidebar>
  )
}
