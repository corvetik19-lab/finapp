"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserProfileDropdown from "./UserProfileDropdown";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import styles from "./ProtectedShell.module.css";

type NavItem = {
  label: string;
  href: string;
  icon: string; // material icon name
};

type UserData = {
  email: string;
  fullName: string;
  avatar: string | null;
};

const nav: NavItem[] = [
  { label: "Дашборд", href: "/dashboard", icon: "insights" },
  { label: "Транзакции", href: "/transactions", icon: "list" },
  { label: "Заметки", href: "/notes", icon: "sticky_note_2" },
  { label: "Бюджеты", href: "/budgets", icon: "pie_chart" },
  { label: "Платежи", href: "/payments", icon: "receipt_long" },
  { label: "Планы", href: "/plans", icon: "flag" },
  { label: "Фитнес", href: "/fitness", icon: "fitness_center" },
  { label: "Отчёты", href: "/reports", icon: "query_stats" },
  { label: "Экспорт", href: "/export", icon: "download" },
  { label: "AI Чат", href: "/ai-chat", icon: "smart_toy" },
  { label: "AI Аналитика", href: "/ai-analytics", icon: "psychology" },
  { label: "AI Советник", href: "/ai-advisor", icon: "psychology_alt" },
  { label: "Расширенная аналитика", href: "/analytics/advanced", icon: "analytics" },
  { label: "Прогнозы", href: "/forecasts", icon: "trending_up" },
  { label: "Уведомления", href: "/notifications", icon: "notifications_active" },
  { label: "Промпты", href: "/prompts", icon: "lightbulb" },
  { label: "Закладки", href: "/bookmarks", icon: "bookmark" },
  { label: "Дебетовые карты", href: "/cards", icon: "payment" },
  { label: "Кредитные карты", href: "/credit-cards", icon: "credit_card" },
  { label: "Настройки", href: "/settings", icon: "settings" },
  { label: "Резервные копии", href: "/settings/backup", icon: "backup" },
  { label: "API Keys", href: "/settings/api", icon: "key" },
  { label: "Кредиты", href: "/loans", icon: "account_balance" },
  { label: "Долги", href: "/debts", icon: "account_balance_wallet" },
];

type ProtectedShellProps = {
  children: React.ReactNode;
  userData: UserData;
};

export default function ProtectedShell({ children, userData }: ProtectedShellProps) {
  const pathname = usePathname();
  return (
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
            {nav.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} className={active ? styles.active : undefined}>
                  <span className="material-icons" aria-hidden>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.pageTitle}>Финансовый учёт</h1>
            </div>
            <div className={styles.headerRight}>
              <NotificationBell />
              <UserProfileDropdown userData={userData} />
            </div>
          </header>
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}
