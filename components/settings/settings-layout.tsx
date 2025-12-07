"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { SettingsSidebar } from "./settings-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

const breadcrumbTitles: Record<string, string> = {
  "/settings": "Настройки",
  "/settings/overview": "Обзор",
  "/settings/subscription": "Подписка",
  "/settings/profile": "Профиль",
  "/settings/organization": "Организация",
  "/settings/legal-entities": "Юр. лица",
  "/settings/users": "Пользователи",
  "/settings/roles": "Роли и права",
  "/settings/departments": "Отделы",
  "/settings/integrations": "Интеграции",
  "/settings/api-keys": "API ключи",
  "/settings/security": "Безопасность",
  "/settings/notifications": "Уведомления",
  "/settings/backup": "Резервные копии",
  "/settings/tour": "Туры и подсказки",
  "/settings/modes": "Режимы",
  "/settings/modes/finance": "Финансы",
  "/settings/modes/investments": "Инвестиции",
  "/settings/modes/personal": "Личное",
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { title: string; href: string }[] = []

  let currentPath = ""
  for (const segment of segments) {
    currentPath += `/${segment}`
    const title = breadcrumbTitles[currentPath] || segment
    crumbs.push({ title, href: currentPath })
  }

  return crumbs
}

interface SettingsLayoutWrapperProps {
  children: React.ReactNode
}

export function SettingsLayoutWrapper({ children }: SettingsLayoutWrapperProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <SidebarProvider>
      <SettingsSidebar className="top-16 h-[calc(100svh-4rem)]" />
      <SidebarInset className="overflow-x-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.title}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-hidden bg-white">
          <div className="h-full overflow-y-auto overflow-x-hidden px-6 py-4">
            <div className="max-w-5xl">
              {children}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
