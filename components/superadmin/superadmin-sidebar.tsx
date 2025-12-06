"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  Building2,
  Users,
  Package,
  Tag,
  Receipt,
  BarChart3,
  Shield,
  ArrowLeft,
  Settings,
  UserCog,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Навигация для супер-админа
const superadminNavigation = [
  { title: "Обзор", url: "/superadmin", icon: LayoutDashboard },
  { title: "Биллинг", url: "/superadmin/billing", icon: CreditCard },
  { title: "Организации", url: "/superadmin/organizations", icon: Building2 },
  { title: "Пользователи", url: "/superadmin/users", icon: Users },
  { title: "Тарифы", url: "/superadmin/plans", icon: Package },
  { title: "Ценообразование", url: "/superadmin/pricing", icon: Tag },
  { title: "Платежи", url: "/superadmin/payments", icon: Receipt },
  { title: "Отчёты", url: "/superadmin/reports", icon: BarChart3 },
  { title: "Настройки платформы", url: "/superadmin/settings", icon: Settings },
  { title: "Мой профиль", url: "/settings/profile", icon: UserCog },
]

interface SuperadminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName?: string
}

export function SuperadminSidebar({ userName, ...props }: SuperadminSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/superadmin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Super Admin</span>
                  <span className="truncate text-xs text-muted-foreground">Панель управления</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {superadminNavigation.map((item) => {
                const isActive = pathname === item.url || 
                  (item.url !== "/superadmin" && pathname.startsWith(item.url + "/"))
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {userName && (
            <SidebarMenuItem>
              <SidebarMenuButton className="cursor-default" tooltip={userName}>
                <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="truncate text-xs text-muted-foreground">Супер-администратор</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Вернуться">
              <Link href="/tenders/dashboard">
                <ArrowLeft className="size-4" />
                <span>Вернуться к тендерам</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
