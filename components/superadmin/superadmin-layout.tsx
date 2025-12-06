"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { SuperadminSidebar } from "./superadmin-sidebar"
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

// Карта URL -> заголовков для breadcrumbs
const breadcrumbTitles: Record<string, string> = {
  "/superadmin": "Обзор",
  "/superadmin/billing": "Биллинг",
  "/superadmin/organizations": "Организации",
  "/superadmin/users": "Пользователи",
  "/superadmin/plans": "Тарифы",
  "/superadmin/pricing": "Ценообразование",
  "/superadmin/payments": "Платежи",
  "/superadmin/reports": "Отчёты",
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

interface SuperadminLayoutProps {
  children: React.ReactNode
  userName?: string
}

export function SuperadminLayout({ children, userName }: SuperadminLayoutProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <SidebarProvider>
      <SuperadminSidebar userName={userName} className="top-16 h-[calc(100svh-4rem)]" />
      <SidebarInset>
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
        <main className="flex-1 overflow-auto px-4 py-2 bg-white">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
