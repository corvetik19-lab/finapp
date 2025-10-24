"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserProfileDropdown from "./UserProfileDropdown";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import TourWrapper from "@/components/onboarding/TourWrapper";
import styles from "./ProtectedShell.module.css";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
};

type NavConfig = NavItem | NavGroup;

type UserData = {
  email: string;
  fullName: string;
  avatar: string | null;
};

// Проверка является ли элемент группой
function isNavGroup(item: NavConfig): item is NavGroup {
  return 'items' in item;
}

const navConfig: NavConfig[] = [
  { label: "Дашборд", href: "/dashboard", icon: "insights" },
  { label: "Достижения", href: "/achievements", icon: "emoji_events" },
  
  {
    label: "Карты",
    icon: "credit_card",
    items: [
      { label: "Дебетовые карты", href: "/cards", icon: "payment" },
      { label: "Кредитные карты", href: "/credit-cards", icon: "credit_card" },
    ]
  },
  
  {
    label: "Финансы",
    icon: "account_balance_wallet",
    items: [
      { label: "Транзакции", href: "/transactions", icon: "list" },
      { label: "Кредиты", href: "/loans", icon: "account_balance" },
      { label: "Платежи", href: "/payments", icon: "receipt_long" },
      { label: "Бюджеты", href: "/budgets", icon: "pie_chart" },
    ]
  },
  
  {
    label: "Отчёты",
    icon: "assessment",
    items: [
      { label: "Отчёты", href: "/reports", icon: "query_stats" },
      { label: "Прогнозы", href: "/forecasts", icon: "trending_up" },
      { label: "Расширенная аналитика", href: "/analytics/advanced", icon: "analytics" },
    ]
  },
  
  {
    label: "AI",
    icon: "psychology",
    items: [
      { label: "AI Советник", href: "/ai-advisor", icon: "lightbulb" },
      { label: "AI Чат", href: "/ai-chat", icon: "smart_toy" },
      { label: "AI Аналитика", href: "/ai-analytics", icon: "psychology" },
    ]
  },
  
  {
    label: "Личное",
    icon: "folder",
    items: [
      { label: "Заметки", href: "/notes", icon: "sticky_note_2" },
      { label: "Планы", href: "/plans", icon: "flag" },
      { label: "Закладки", href: "/bookmarks", icon: "bookmark" },
      { label: "Промпты", href: "/prompts", icon: "lightbulb" },
    ]
  },
  
  { label: "Фитнес", href: "/fitness", icon: "fitness_center" },
  { label: "Уведомления", href: "/notifications", icon: "notifications_active" },
  { label: "Настройки", href: "/settings", icon: "settings" },
];

type ProtectedShellProps = {
  children: React.ReactNode;
  userData: UserData;
};

export default function ProtectedShell({ children, userData }: ProtectedShellProps) {
  const pathname = usePathname();
  const isAiChatPage = pathname === "/ai-chat";
  
  // Состояние для открытых групп
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  
  // Функция переключения группы
  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };
  
  // Проверка активности элемента
  const isItemActive = (href: string) => {
    if (pathname === href) {
      return true;
    } else if (pathname && pathname.startsWith(href + "/")) {
      if (href !== "/settings" && href !== "/notifications") {
        return true;
      }
    }
    return false;
  };
  
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
          
          <nav className={styles.nav} aria-label="Основная навигация">
            <div className={styles.menuTitle}>Главное меню</div>
            {navConfig.map((item, index) => {
              if (isNavGroup(item)) {
                // Группа с подпунктами
                const isOpen = openGroups.has(item.label);
                const hasActiveChild = item.items.some(child => isItemActive(child.href));
                
                return (
                  <div key={`group-${index}`} className={styles.navGroup}>
                    <button 
                      className={`${styles.navGroupButton} ${hasActiveChild ? styles.navGroupActive : ''}`}
                      onClick={() => toggleGroup(item.label)}
                    >
                      <span className="material-icons" aria-hidden>
                        {item.icon}
                      </span>
                      <span className={styles.navGroupLabel}>{item.label}</span>
                      <span className={`material-icons ${styles.navGroupArrow} ${isOpen ? styles.navGroupArrowOpen : ''}`}>
                        expand_more
                      </span>
                    </button>
                    
                    {isOpen && (
                      <div className={styles.navGroupItems}>
                        {item.items.map((child) => {
                          const active = isItemActive(child.href);
                          return (
                            <Link 
                              key={child.href} 
                              href={child.href} 
                              className={`${styles.navItem} ${active ? styles.active : ''}`}
                            >
                              <span className="material-icons" aria-hidden>
                                {child.icon}
                              </span>
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Обычный пункт меню
                const active = isItemActive(item.href);
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={`${styles.navItem} ${active ? styles.active : ''}`}
                  >
                    <span className="material-icons" aria-hidden>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              }
            })}
          </nav>
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
