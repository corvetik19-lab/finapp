"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { FinanceSidebar } from "./finance-sidebar"
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
  "/finance": "Финансы",
  "/finance/dashboard": "Дашборд",
  "/finance/transactions": "Транзакции",
  "/finance/cards": "Счета",
  "/finance/budgets": "Бюджеты",
  "/finance/plans": "Цели",
  "/finance/payments": "Платежи",
  "/finance/loans": "Кредиты",
  "/finance/credit-cards": "Кредитные карты",
  "/finance/receipts": "Чеки",
  "/finance/reports": "Отчёты",
  "/finance/reports/custom": "Настраиваемый отчёт",
  "/finance/forecasts": "Прогнозы",
  "/finance/analytics": "Аналитика",
  "/finance/analytics/advanced": "Расширенная аналитика",
  "/finance/settings": "Настройки",
  "/finance/settings/categories": "Категории",
  "/finance/settings/products": "Товары",
  "/finance/settings/presets": "Быстрые пресеты",
  "/finance/ai-chat": "AI Чат",
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

interface FinanceLayoutProps {
  children: React.ReactNode
}

export function FinanceLayout({ children }: FinanceLayoutProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <SidebarProvider>
      <FinanceSidebar className="top-16 h-[calc(100svh-4rem)]" />
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
          <div className="h-full overflow-y-auto overflow-x-hidden px-4 py-4">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
