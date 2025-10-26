"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserProfileDropdown from "./UserProfileDropdown";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import TourWrapper from "@/components/onboarding/TourWrapper";
import Navigation from "./Navigation";
import styles from "./ProtectedShell.module.css";
import type { Permission } from "@/lib/auth/permissions";
import type { NavConfig as NavConfigType } from "@/lib/auth/filterNavigation";

type UserData = {
  email: string;
  fullName: string;
  avatar: string | null;
};


type ProtectedShellProps = {
  children: React.ReactNode;
  userData: UserData;
  userPermissions: Permission[];
  navConfig: NavConfigType[];
};

export default function ProtectedShell({ children, userData, navConfig: filteredNavConfig }: ProtectedShellProps) {
  const pathname = usePathname();
  const isAiChatPage = pathname === "/ai-chat";
  
  return (
    <TourWrapper>
      <NotificationProvider>
        <OnboardingTour />
        <div className={styles.root}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className="material-icons" aria-hidden>
              account_balance
            </span>
            <span>Finapp</span>
          </div>
          
          <Navigation navConfig={filteredNavConfig} />
        </aside>
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.greeting}>Привет, {userData.fullName || 'Пользователь'}!</span>
            </div>
            <div className={styles.headerCenter}>
              <div className={styles.searchBox}>
                <span className="material-icons" aria-hidden>search</span>
                <input 
                  type="search" 
                  placeholder="Поиск..." 
                  className={styles.searchInput}
                />
              </div>
            </div>
            <div className={styles.headerRight}>
              <button className={styles.iconButton} aria-label="Календарь">
                <span className="material-icons">calendar_month</span>
              </button>
              <NotificationBell />
              <UserProfileDropdown userData={userData} />
            </div>
          </header>
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
