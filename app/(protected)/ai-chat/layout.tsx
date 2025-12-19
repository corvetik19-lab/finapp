"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { FinanceSidebar } from "@/components/finance/finance-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface AiChatLayoutProps {
  children: React.ReactNode
}

export default function AiChatLayout({ children }: AiChatLayoutProps) {
  return (
    <SidebarProvider>
      <FinanceSidebar className="top-16 h-[calc(100svh-4rem)]" />
      <SidebarInset className="flex flex-col h-[calc(100svh-4rem)]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-white dark:bg-zinc-950">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/finance/dashboard">Финансы</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>AI Чат</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-hidden bg-white dark:bg-zinc-950">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
