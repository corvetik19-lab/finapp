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
  Banknote,
  ClipboardList,
  FileSignature,
  Scale,
  Warehouse,
  UserCheck,
  ArrowRightLeft,
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
    title: "Касса",
    items: [
      { title: "Кассовые ордера", url: "/tenders/accounting/cash-orders", icon: Banknote },
      { title: "Кассовая книга", url: "/tenders/accounting/cash-book", icon: ClipboardList },
    ],
  },
  {
    title: "Документооборот",
    items: [
      { title: "Авансовые отчёты", url: "/tenders/accounting/advance-reports", icon: ClipboardList },
      { title: "Доверенности", url: "/tenders/accounting/power-of-attorney", icon: FileSignature },
      { title: "Акты сверки", url: "/tenders/accounting/reconciliation-acts", icon: Scale },
    ],
  },
  {
    title: "Контрагенты",
    items: [
      { title: "Все контрагенты", url: "/tenders/accounting/counterparties", icon: Users },
    ],
  },
  {
    title: "Деньги",
    items: [
      { title: "Платёжный календарь", url: "/tenders/accounting/payment-calendar", icon: Calendar },
      { title: "Банковские счета", url: "/tenders/accounting/bank-accounts", icon: Landmark },
    ],
  },
  {
    title: "Банк-интеграции",
    items: [
      { title: "Подключения", url: "/tenders/accounting/bank/connections", icon: Globe },
      { title: "Выписки", url: "/tenders/accounting/bank/statements", icon: FileText },
      { title: "Транзакции", url: "/tenders/accounting/bank/transactions", icon: ArrowRightLeft },
      { title: "Правила", url: "/tenders/accounting/bank/rules", icon: Settings },
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
    title: "Регистры",
    items: [
      { title: "План счетов", url: "/tenders/accounting/chart-of-accounts", icon: ClipboardList },
      { title: "ОСВ", url: "/tenders/accounting/osv", icon: BarChart3 },
      { title: "Журнал проводок", url: "/tenders/accounting/journal", icon: FileText },
      { title: "Книга покупок", url: "/tenders/accounting/purchase-ledger", icon: FileText },
      { title: "Книга продаж", url: "/tenders/accounting/sales-ledger", icon: FileText },
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
    title: "Склад",
    items: [
      { title: "Склады", url: "/tenders/accounting/warehouse", icon: Warehouse },
      { title: "Номенклатура", url: "/tenders/accounting/warehouse/items", icon: ClipboardList },
      { title: "Остатки", url: "/tenders/accounting/warehouse/stock", icon: BarChart3 },
      { title: "Документы", url: "/tenders/accounting/warehouse/documents", icon: FileText },
    ],
  },
  {
    title: "Персонал",
    items: [
      { title: "Сотрудники", url: "/tenders/accounting/payroll/employees", icon: UserCheck },
      { title: "Должности", url: "/tenders/accounting/payroll/positions", icon: ClipboardList },
      { title: "Расчётные листки", url: "/tenders/accounting/payroll/payslips", icon: FileText },
      { title: "Расчётные периоды", url: "/tenders/accounting/payroll/periods", icon: Calendar },
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
