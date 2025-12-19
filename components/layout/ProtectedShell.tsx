"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import TourWrapper from "@/components/onboarding/TourWrapper";
import ModeSidebar from "@/components/platform/ModeSidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Wallet, FolderTree, PieChart, Receipt, CalendarDays, Bot } from "lucide-react";

type ActiveOrgInfo = {
  companyId: string;
  companyName: string;
  organizationName: string;
} | null;

type ProtectedShellProps = {
  children: React.ReactNode;
  activeOrganization?: ActiveOrgInfo;
};

export default function ProtectedShell({ children, activeOrganization }: ProtectedShellProps) {
  const pathname = usePathname();
  const isAiChatPage = pathname === "/ai-chat";
  const isAiStudioPage = pathname.startsWith("/ai-studio");
  const isTendersPage = pathname.startsWith("/tenders");
  const isInvestorsPage = pathname.startsWith("/investors");
  const isFinancePage = pathname.startsWith("/finance");
  const isAdminPage = pathname.startsWith("/admin");
  const isSuperadminPage = pathname.startsWith("/superadmin");
  const isSettingsPage = pathname.startsWith("/settings");
  const [isExiting, setIsExiting] = useState(false);
  
  // Страницы с собственным sidebar
  const hasOwnSidebar = isTendersPage || isInvestorsPage || isFinancePage || isAdminPage || isSuperadminPage || isSettingsPage || isAiChatPage || isAiStudioPage;

  const handleExitOrganization = async () => {
    if (isExiting) return;
    if (!confirm('Выйти из организации и вернуться к своим данным?')) return;

    setIsExiting(true);
    try {
      const res = await fetch('/api/organizations/exit-active', { method: 'POST' });
      if (res.ok) {
        // Перезагрузка текущей страницы
        window.location.reload();
      }
    } catch (error) {
      console.error('Error exiting organization:', error);
      setIsExiting(false);
    }
  };
  
  return (
    <TourWrapper>
      <NotificationProvider>
        <OnboardingTour />
        <div className={cn("min-h-screen pt-16", hasOwnSidebar ? "" : "md:pl-64")}>
          {!hasOwnSidebar && <ModeSidebar />}
          <div className="flex flex-col min-h-screen">
            {activeOrganization && (
              <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2"><span>🏢</span><span className="text-sm text-muted-foreground">Работаете от имени:</span><span className="font-medium">{activeOrganization.organizationName}</span></div>
                <Button variant="ghost" size="sm" onClick={handleExitOrganization} disabled={isExiting}>{isExiting ? '⏳' : <><LogOut className="h-4 w-4 mr-1" />Выйти</>}</Button>
              </div>
            )}
            <main className={cn("flex-1", isAiChatPage ? "overflow-hidden" : hasOwnSidebar ? "" : "p-4 md:p-6")}>{children}</main>
          </div>
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden" aria-label="Мобильная навигация">
            <div className="flex items-center justify-around py-2">
              <Link href="/mobile/budgets" className={cn("flex flex-col items-center gap-1 px-3 py-1 text-xs", pathname === '/mobile/budgets' ? "text-primary" : "text-muted-foreground")}><Wallet className="h-5 w-5" /><span>Бюджет</span></Link>
              <Link href="/mobile/categories" className={cn("flex flex-col items-center gap-1 px-3 py-1 text-xs", pathname === '/mobile/categories' ? "text-primary" : "text-muted-foreground")}><FolderTree className="h-5 w-5" /><span>Категории</span></Link>
              <Link href="/mobile/expenses" className={cn("flex flex-col items-center gap-1 px-3 py-1 text-xs", pathname === '/mobile/expenses' ? "text-primary" : "text-muted-foreground")}><PieChart className="h-5 w-5" /><span>Расходы</span></Link>
              <Link href="/mobile/receipts" className={cn("flex flex-col items-center gap-1 px-3 py-1 text-xs", pathname === '/mobile/receipts' ? "text-primary" : "text-muted-foreground")}><Receipt className="h-5 w-5" /><span>Чеки</span></Link>
              <Link href="/mobile/payments" className={cn("flex flex-col items-center gap-1 px-3 py-1 text-xs", pathname === '/mobile/payments' ? "text-primary" : "text-muted-foreground")}><CalendarDays className="h-5 w-5" /><span>Платежи</span></Link>
              <Link href="/ai-chat" className={cn("flex flex-col items-center gap-1 px-3 py-1 text-xs", pathname === '/ai-chat' ? "text-primary" : "text-muted-foreground")}><Bot className="h-5 w-5" /><span>AI</span></Link>
            </div>
          </nav>
        </div>
      </NotificationProvider>
    </TourWrapper>
  );
}
