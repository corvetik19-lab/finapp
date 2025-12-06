"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TendersSidebar } from "./tenders-sidebar"
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
  "/tenders": "Тендеры",
  "/tenders/dashboard": "Дашборд",
  "/tenders/department": "Тендерный отдел",
  "/tenders/realization": "Реализация",
  "/tenders/calendar": "Календарь",
  "/tenders/tasks": "Задачи",
  "/tenders/list": "Реестр тендеров",
  "/tenders/claims": "Взыскание долгов",
  "/tenders/logistics": "Логистика",
  "/tenders/employees": "Сотрудники",
  "/tenders/settings": "Настройки",
  "/tenders/settings/subscription": "Подписка",
  // Reports
  "/tenders/reports": "Отчёты",
  "/tenders/reports/statistics": "Сводный отчёт",
  "/tenders/reports/department": "Тендерный отдел",
  "/tenders/reports/realization": "Реализация",
  "/tenders/reports/payments": "Оплаты от заказчиков",
  "/tenders/reports/payouts": "Расходы",
  "/tenders/reports/customer-line": "Дебиторка",
  "/tenders/reports/support-line": "Банковские гарантии",
  "/tenders/reports/manager-performance": "Показатели менеджеров",
  // Dictionaries
  "/tenders/dictionaries": "Справочники",
  "/tenders/dictionaries/customers": "Заказчики",
  "/tenders/dictionaries/platforms": "Площадки",
  "/tenders/dictionaries/types": "Типы тендеров",
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

interface TendersLayoutProps {
  children: React.ReactNode
}

export function TendersLayout({ children }: TendersLayoutProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <SidebarProvider>
      <TendersSidebar className="top-16 h-[calc(100svh-4rem)]" />
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
          <div className="h-full overflow-y-auto overflow-x-hidden px-4 py-2">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
