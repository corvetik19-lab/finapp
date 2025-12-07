"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  User,
  Building2,
  Users,
  Shield,
  Key,
  Plug,
  Bell,
  Database,
  HelpCircle,
  ArrowLeft,
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

const settingsNavigation = {
  main: [
    {
      title: "Обзор",
      items: [
        { title: "Обзор", url: "/settings/overview", icon: LayoutDashboard },
        { title: "Подписка", url: "/settings/subscription", icon: CreditCard },
      ],
    },
    {
      title: "Личное",
      items: [
        { title: "Профиль", url: "/settings/profile", icon: User },
      ],
    },
    {
      title: "Управление",
      items: [
        { title: "Организация", url: "/settings/organization", icon: Building2 },
        { title: "Пользователи", url: "/settings/users", icon: Users },
        { title: "Роли и права", url: "/settings/roles", icon: Shield },
        { title: "Отделы", url: "/settings/departments", icon: Users },
      ],
    },
    {
      title: "Интеграции",
      items: [
        { title: "Интеграции", url: "/settings/integrations", icon: Plug },
        { title: "API ключи", url: "/settings/api-keys", icon: Key },
      ],
    },
    {
      title: "Система",
      items: [
        { title: "Безопасность", url: "/settings/security", icon: Shield },
        { title: "Уведомления", url: "/settings/notifications", icon: Bell },
        { title: "Резервные копии", url: "/settings/backup", icon: Database },
      ],
    },
    {
      title: "Помощь",
      items: [
        { title: "Туры и подсказки", url: "/settings/tour", icon: HelpCircle },
      ],
    },
  ],
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

export function SettingsSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b p-4">
        <Link 
          href="/tenders/dashboard" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">Вернуться</span>
        </Link>
        <div className="mt-3 group-data-[collapsible=icon]:hidden">
          <h1 className="text-lg font-semibold">Настройки</h1>
          <p className="text-xs text-muted-foreground">Управление приложением</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto">
        {settingsNavigation.main.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
