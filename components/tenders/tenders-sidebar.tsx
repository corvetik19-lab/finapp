"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  Package,
  Calendar,
  CheckSquare,
  List,
  Gavel,
  Truck,
  Users,
  BarChart3,
  FileText,
  Receipt,
  Building,
  Globe,
  ChevronRight,
  Wallet,
  TrendingUp,
  UserCircle,
  Shield,
  Scale,
  Landmark,
  Factory,
  Settings,
  type LucideIcon,
} from "lucide-react"
import type { UserPermissions } from "./tenders-layout"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Права для пунктов меню
type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  requiredPermission?: string // Требуемое право для отображения
  adminOnly?: boolean // Только для админов
}

type NavSection = {
  title: string
  items: NavItem[]
}

type NavCollapsibleSection = {
  title: string
  icon: LucideIcon
  items: NavItem[]
  requiredPermission?: string
  adminOnly?: boolean
}

// Навигация для тендеров с правами
const tendersNavigation = {
  main: [
    {
      title: "Обзор",
      items: [
        { title: "Дашборд", url: "/tenders/dashboard", icon: LayoutDashboard },
        { title: "Тендерный отдел", url: "/tenders/department", icon: Briefcase },
        { title: "Реализация", url: "/tenders/realization", icon: Package },
        { title: "Календарь", url: "/tenders/calendar", icon: Calendar },
      ],
    },
    {
      title: "Работа",
      items: [
        { title: "Задачи", url: "/tenders/tasks", icon: CheckSquare },
        { title: "Реестр тендеров", url: "/tenders/list", icon: List },
        { title: "Взыскание долгов", url: "/tenders/claims", icon: Gavel, adminOnly: true },
        { title: "Логистика", url: "/tenders/logistics", icon: Truck, adminOnly: true },
      ],
    },
  ] as NavSection[],
  reports: {
    title: "Отчёты",
    icon: BarChart3,
    adminOnly: true,
    items: [
      { title: "Сводный отчёт", url: "/tenders/reports/statistics", icon: BarChart3 },
      { title: "Тендерный отдел", url: "/tenders/reports/department", icon: FileText },
      { title: "Реализация", url: "/tenders/reports/realization", icon: Package },
      { title: "Оплаты от заказчиков", url: "/tenders/reports/payments", icon: Wallet },
      { title: "Расходы", url: "/tenders/reports/payouts", icon: Receipt },
      { title: "Дебиторка", url: "/tenders/reports/customer-line", icon: TrendingUp },
      { title: "Банковские гарантии", url: "/tenders/reports/support-line", icon: Shield },
      { title: "Показатели менеджеров", url: "/tenders/reports/manager-performance", icon: UserCircle },
    ],
  } as NavCollapsibleSection,
  dictionaries: {
    title: "Справочники",
    icon: Building,
    adminOnly: true,
    items: [
      { title: "Заказчики", url: "/tenders/dictionaries/customers", icon: Building },
      { title: "Поставщики", url: "/tenders/dictionaries/suppliers", icon: Factory },
      { title: "Площадки", url: "/tenders/dictionaries/platforms", icon: Globe },
      { title: "Банки", url: "/tenders/dictionaries/banks", icon: Landmark },
      { title: "Типы тендеров", url: "/tenders/dictionaries/types", icon: List },
      { title: "Юр. лица", url: "/tenders/dictionaries/legal-entities", icon: Scale },
    ],
  } as NavCollapsibleSection,
  other: [
    { title: "Сотрудники", url: "/tenders/employees", icon: Users, adminOnly: true },
    { title: "Настройки тендеров", url: "/tenders/settings", icon: Settings, adminOnly: true },
  ] as NavItem[],
}

// Проверка доступа к пункту меню
function hasAccessToItem(item: NavItem, userPermissions?: UserPermissions): boolean {
  if (!userPermissions) return true // Если нет данных - показываем всё
  
  // Админы видят всё
  if (userPermissions.isAdmin || userPermissions.isSuperAdmin) return true
  
  // Проверяем adminOnly
  if (item.adminOnly) return false
  
  // Проверяем конкретное право
  if (item.requiredPermission) {
    return userPermissions.permissions.includes(item.requiredPermission)
  }
  
  return true
}


interface NavSectionProps {
  title: string
  items: NavItem[]
  userPermissions?: UserPermissions
}

function NavSection({ title, items, userPermissions }: NavSectionProps) {
  const pathname = usePathname()
  
  // Фильтруем элементы по правам
  const filteredItems = items.filter(item => hasAccessToItem(item, userPermissions))
  
  // Если нет доступных элементов - не показываем секцию
  if (filteredItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
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

interface NavCollapsibleProps {
  title: string
  icon: LucideIcon
  items: NavItem[]
  userPermissions?: UserPermissions
  adminOnly?: boolean
}

function NavCollapsible({ title, icon: Icon, items, userPermissions, adminOnly }: NavCollapsibleProps) {
  const pathname = usePathname()
  
  // Проверяем доступ к секции
  if (adminOnly && userPermissions && !userPermissions.isAdmin && !userPermissions.isSuperAdmin) {
    return null
  }
  
  // Фильтруем элементы
  const filteredItems = items.filter(item => hasAccessToItem(item, userPermissions))
  if (filteredItems.length === 0) return null
  
  const isActive = filteredItems.some((item) => pathname === item.url || pathname.startsWith(item.url + "/"))

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={title} isActive={isActive}>
                <Icon className="size-4" />
                <span>{title}</span>
                <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {filteredItems.map((item) => {
                  const isItemActive = pathname === item.url || pathname.startsWith(item.url + "/")
                  return (
                    <SidebarMenuSubItem key={item.url}>
                      <SidebarMenuSubButton asChild isActive={isItemActive}>
                        <Link href={item.url}>
                          <item.icon className="size-3" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  )
}

interface TendersSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userPermissions?: UserPermissions
}

export function TendersSidebar({ userPermissions, ...props }: TendersSidebarProps) {
  // Проверяем есть ли секция "Прочее" для отображения
  const otherItems = tendersNavigation.other.filter(item => hasAccessToItem(item, userPermissions))
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/tenders/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Briefcase className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Тендеры</span>
                  <span className="truncate text-xs text-muted-foreground">CRM система</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation Sections */}
        {tendersNavigation.main.map((section) => (
          <NavSection 
            key={section.title} 
            title={section.title} 
            items={section.items} 
            userPermissions={userPermissions}
          />
        ))}

        {/* Reports - Collapsible */}
        <NavCollapsible
          title={tendersNavigation.reports.title}
          icon={tendersNavigation.reports.icon}
          items={tendersNavigation.reports.items}
          userPermissions={userPermissions}
          adminOnly={tendersNavigation.reports.adminOnly}
        />

        {/* Dictionaries - Collapsible */}
        <NavCollapsible
          title={tendersNavigation.dictionaries.title}
          icon={tendersNavigation.dictionaries.icon}
          items={tendersNavigation.dictionaries.items}
          userPermissions={userPermissions}
          adminOnly={tendersNavigation.dictionaries.adminOnly}
        />

        {/* Other Items */}
        {otherItems.length > 0 && (
          <NavSection 
            title="Прочее" 
            items={tendersNavigation.other} 
            userPermissions={userPermissions}
          />
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
