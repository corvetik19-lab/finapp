"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TendersSidebar } from "./tenders-sidebar"
import { SuppliersSidebar } from "@/components/suppliers/suppliers-sidebar"
import { AccountingSidebar } from "@/components/accounting/accounting-sidebar"
import { InvestorsSidebar } from "@/components/investors/layout/InvestorsSidebar"
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
  "/tenders/dictionaries/legal-entities": "Юр. лица",
  "/tenders/dictionaries/banks": "Банки",
  "/tenders/dictionaries/suppliers": "Поставщики",
  // Suppliers
  "/tenders/suppliers": "Поставщики",
  "/tenders/suppliers/categories": "Категории",
  "/tenders/suppliers/calls": "История звонков",
  "/tenders/suppliers/settings": "Настройки телефонии",
  "/tenders/suppliers/compare": "Сравнение поставщиков",
  "/tenders/suppliers/dashboard": "Аналитика поставщиков",
  "/tenders/suppliers/map": "Карта поставщиков",
  "/tenders/suppliers/duplicates": "Дубликаты",
  // Accounting
  "/tenders/accounting": "Бухгалтерия",
  "/tenders/accounting/documents": "Документы",
  "/tenders/accounting/counterparties": "Контрагенты",
  "/tenders/accounting/bank-accounts": "Банковские счета",
  "/tenders/accounting/bank-integrations": "Банк-интеграции",
  "/tenders/accounting/taxes": "Налоги",
  "/tenders/accounting/taxes/calendar": "Календарь налогов",
  "/tenders/accounting/taxes/calculators": "Калькуляторы",
  "/tenders/accounting/kudir": "КУДиР",
  "/tenders/accounting/reports": "Отчёты",
  "/tenders/accounting/settings": "Настройки",
  // Investors
  "/investors": "Инвесторы",
  "/investors/sources": "Источники",
  "/investors/investments": "Инвестиции",
  "/investors/investments/new": "Новая инвестиция",
  "/investors/returns": "График возвратов",
  "/investors/reports": "Отчёты",
  "/investors/access": "Доступ инвесторов",
  "/investors/settings": "Настройки",
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

export interface UserPermissions {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  employeeId: string | null;
}

interface TendersLayoutProps {
  children: React.ReactNode
  userPermissions?: UserPermissions
}

export function TendersLayout({ children, userPermissions }: TendersLayoutProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  // Определяем какой sidebar показывать
  const isSuppliers = pathname.startsWith("/tenders/suppliers")
  const isAccounting = pathname.startsWith("/tenders/accounting")
  const isInvestors = pathname.startsWith("/investors")

  const renderSidebar = () => {
    if (isSuppliers) {
      return <SuppliersSidebar userPermissions={userPermissions} />
    }
    if (isAccounting) {
      return <AccountingSidebar userPermissions={userPermissions} />
    }
    if (isInvestors) {
      return <InvestorsSidebar className="top-16 h-[calc(100svh-4rem)]" />
    }
    return <TendersSidebar className="top-16 h-[calc(100svh-4rem)]" userPermissions={userPermissions} />
  }

  return (
    <SidebarProvider>
      {renderSidebar()}
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
