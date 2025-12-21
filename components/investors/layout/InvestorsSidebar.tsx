"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  FileText,
  CalendarClock,
  BarChart3,
  Users,
  Settings,
  PiggyBank,
  Kanban,
  Shield,
  Calculator,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

type NavSection = {
  title: string
  items: NavItem[]
}

const investorsNavigation: NavSection[] = [
  {
    title: "Управление",
    items: [
      { title: "Дашборд", url: "/investors", icon: LayoutDashboard },
      { title: "Источники", url: "/investors/sources", icon: Building2 },
      { title: "Инвестиции", url: "/investors/investments", icon: FileText },
      { title: "Pipeline", url: "/investors/pipeline", icon: Kanban },
      { title: "Гарантии", url: "/investors/guarantees", icon: Shield },
    ],
  },
  {
    title: "Аналитика",
    items: [
      { title: "График возвратов", url: "/investors/returns", icon: CalendarClock },
      { title: "Аналитика", url: "/investors/analytics", icon: TrendingUp },
      { title: "Калькулятор", url: "/investors/calculator", icon: Calculator },
      { title: "Отчёты", url: "/investors/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Настройки",
    items: [
      { title: "Доступ инвесторов", url: "/investors/access", icon: Users },
      { title: "Настройки", url: "/investors/settings", icon: Settings },
    ],
  },
]

function NavSectionComponent({ section }: { section: NavSection }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => {
            const isActive = item.url === "/investors" 
              ? pathname === "/investors"
              : pathname === item.url || pathname.startsWith(item.url + "/")
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

export function InvestorsSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/investors">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                  <PiggyBank className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Инвесторы</span>
                  <span className="truncate text-xs text-muted-foreground">Управление финансированием</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {investorsNavigation.map((section) => (
          <NavSectionComponent 
            key={section.title} 
            section={section}
          />
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
