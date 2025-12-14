"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Receipt,
  FileText,
  Users,
  Landmark,
  Globe,
  TrendingUp,
  BarChart3,
  Settings,
  Calculator,
  Calendar,
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
  adminOnly?: boolean
}

type NavSection = {
  title: string
  items: NavItem[]
}

const accountingNavigation: NavSection[] = [
  {
    title: "Обзор",
    items: [
      { title: "Дашборд", url: "/tenders/accounting", icon: Receipt },
      { title: "Документы", url: "/tenders/accounting/documents", icon: FileText },
    ],
  },
  {
    title: "Контрагенты",
    items: [
      { title: "Все контрагенты", url: "/tenders/accounting/counterparties", icon: Users },
    ],
  },
  {
    title: "Банк",
    items: [
      { title: "Банковские счета", url: "/tenders/accounting/bank-accounts", icon: Landmark },
      { title: "Банк-интеграции", url: "/tenders/accounting/bank-integrations", icon: Globe },
    ],
  },
  {
    title: "Налоги",
    items: [
      { title: "Налоги", url: "/tenders/accounting/taxes", icon: TrendingUp },
      { title: "Календарь налогов", url: "/tenders/accounting/taxes/calendar", icon: Calendar },
      { title: "Калькуляторы", url: "/tenders/accounting/taxes/calculators", icon: Calculator },
    ],
  },
  {
    title: "Отчётность",
    items: [
      { title: "КУДиР", url: "/tenders/accounting/kudir", icon: FileText },
      { title: "Отчёты", url: "/tenders/accounting/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Настройки",
    items: [
      { title: "Настройки", url: "/tenders/accounting/settings", icon: Settings, adminOnly: true },
    ],
  },
]

interface UserPermissions {
  isAdmin: boolean
  isSuperAdmin: boolean
  permissions: string[]
}

function hasAccessToItem(item: NavItem, userPermissions?: UserPermissions): boolean {
  if (!userPermissions) return true
  if (userPermissions.isAdmin || userPermissions.isSuperAdmin) return true
  if (item.adminOnly) return false
  return true
}

interface NavSectionComponentProps {
  section: NavSection
  userPermissions?: UserPermissions
}

function NavSectionComponent({ section, userPermissions }: NavSectionComponentProps) {
  const pathname = usePathname()
  
  const filteredItems = section.items.filter(item => hasAccessToItem(item, userPermissions))
  if (filteredItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {filteredItems.map((item) => {
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

interface AccountingSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userPermissions?: UserPermissions
}

export function AccountingSidebar({ userPermissions, ...props }: AccountingSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/tenders/accounting">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Receipt className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Бухгалтерия</span>
                  <span className="truncate text-xs text-muted-foreground">Документы и учёт</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {accountingNavigation.map((section) => (
          <NavSectionComponent 
            key={section.title} 
            section={section}
            userPermissions={userPermissions}
          />
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
