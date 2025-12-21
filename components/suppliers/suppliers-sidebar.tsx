"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Factory,
  List,
  Scale,
  BarChart3,
  MapPin,
  Copy,
  Settings,
  FileText,
  Star,
  Phone,
  Upload,
  Users,
  Link2,
  ShieldCheck,
  Kanban,
  Send,
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

const suppliersNavigation: NavSection[] = [
  {
    title: "Управление",
    items: [
      { title: "Все поставщики", url: "/tenders/suppliers", icon: Factory },
      { title: "Импорт CSV/XLSX", url: "/tenders/suppliers/import", icon: Upload },
      { title: "Категории", url: "/tenders/suppliers/categories", icon: List },
      { title: "Дубликаты", url: "/tenders/suppliers/duplicates", icon: Copy },
      { title: "Верификация", url: "/tenders/suppliers/verification", icon: ShieldCheck },
    ],
  },
  {
    title: "Тендеры",
    items: [
      { title: "Подбор под тендер", url: "/tenders/suppliers/matching", icon: Users },
      { title: "Kanban участников", url: "/tenders/suppliers/pipeline", icon: Kanban },
      { title: "Сравнение КП", url: "/tenders/suppliers/offers", icon: Scale },
    ],
  },
  {
    title: "Аналитика",
    items: [
      { title: "Дашборд", url: "/tenders/suppliers/dashboard", icon: BarChart3 },
      { title: "Сравнение цен", url: "/tenders/suppliers/prices", icon: Scale },
      { title: "Карта", url: "/tenders/suppliers/map", icon: MapPin },
    ],
  },
  {
    title: "Коммуникации",
    items: [
      { title: "Email кампании", url: "/tenders/suppliers/emails", icon: Send },
      { title: "История звонков", url: "/tenders/suppliers/calls", icon: Phone },
    ],
  },
  {
    title: "Документы",
    items: [
      { title: "Прайс-листы", url: "/tenders/suppliers/price-lists", icon: FileText },
      { title: "Договоры", url: "/tenders/suppliers/contracts", icon: FileText },
      { title: "Оценки и отзывы", url: "/tenders/suppliers/reviews", icon: Star },
    ],
  },
  {
    title: "Интеграции",
    items: [
      { title: "DaData обогащение", url: "/tenders/suppliers/integrations/dadata", icon: Link2 },
      { title: "1С синхронизация", url: "/tenders/suppliers/integrations/1c", icon: Link2 },
      { title: "ЭДО провайдеры", url: "/tenders/suppliers/integrations/edo", icon: Link2 },
      { title: "Zakupki.gov.ru", url: "/tenders/suppliers/integrations/zakupki", icon: Link2 },
    ],
  },
  {
    title: "Настройки",
    items: [
      { title: "Настройки", url: "/tenders/suppliers/settings", icon: Settings, adminOnly: true },
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

interface SuppliersSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userPermissions?: UserPermissions
}

export function SuppliersSidebar({ userPermissions, ...props }: SuppliersSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/tenders/suppliers">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Factory className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Поставщики</span>
                  <span className="truncate text-xs text-muted-foreground">Управление базой</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {suppliersNavigation.map((section) => (
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
