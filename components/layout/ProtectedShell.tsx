"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationProvider } from "@/contexts/NotificationContext";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import TourWrapper from "@/components/onboarding/TourWrapper";
import ModeSidebar from "@/components/platform/ModeSidebar";
import styles from "./ProtectedShell.module.css";

type ProtectedShellProps = {
  children: React.ReactNode;
};

export default function ProtectedShell({ children }: ProtectedShellProps) {
  const pathname = usePathname();
  const isAiChatPage = pathname === "/ai-chat";
  
  return (
    <TourWrapper>
      <NotificationProvider>
        <OnboardingTour />
        <div className={styles.root}>
        {/* Mode-specific Sidebar - единственный sidebar */}
        <ModeSidebar />
        
        <div className={styles.content}>
          <main className={isAiChatPage ? styles.mainNoScroll : styles.main}>
            {children}
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <nav className={styles.bottomNav} aria-label="Мобильная навигация">
          <div className={styles.bottomNavItems}>
            <Link 
              href="/mobile/budgets" 
              className={`${styles.bottomNavItem} ${pathname === '/mobile/budgets' ? styles.active : ''}`}
            >
              <span className="material-icons" aria-hidden>account_balance_wallet</span>
              <span>Бюджет</span>
            </Link>
            <Link 
              href="/mobile/categories" 
              className={`${styles.bottomNavItem} ${pathname === '/mobile/categories' ? styles.active : ''}`}
            >
              <span className="material-icons" aria-hidden>category</span>
              <span>Категории</span>
            </Link>
            <Link 
              href="/mobile/expenses" 
              className={`${styles.bottomNavItem} ${pathname === '/mobile/expenses' ? styles.active : ''}`}
            >
              <span className="material-icons" aria-hidden>pie_chart</span>
              <span>Расходы</span>
            </Link>
            <Link 
              href="/mobile/receipts" 
              className={`${styles.bottomNavItem} ${pathname === '/mobile/receipts' ? styles.active : ''}`}
            >
              <span className="material-icons" aria-hidden>receipt</span>
              <span>Чеки</span>
            </Link>
            <Link 
              href="/mobile/payments" 
              className={`${styles.bottomNavItem} ${pathname === '/mobile/payments' ? styles.active : ''}`}
            >
              <span className="material-icons" aria-hidden>event</span>
              <span>Платежи</span>
            </Link>
            <Link 
              href="/ai-chat" 
              className={`${styles.bottomNavItem} ${pathname === '/ai-chat' ? styles.active : ''}`}
            >
              <span className="material-icons" aria-hidden>smart_toy</span>
              <span>AI</span>
            </Link>
          </div>
        </nav>
      </div>
    </NotificationProvider>
    </TourWrapper>
  );
}
