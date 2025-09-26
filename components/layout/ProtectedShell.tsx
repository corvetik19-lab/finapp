"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ProtectedShell.module.css";

type NavItem = {
  label: string;
  href: string;
  icon: string; // material icon name
};

const nav: NavItem[] = [
  { label: "Дашборд", href: "/dashboard", icon: "insights" },
  { label: "Транзакции", href: "/transactions", icon: "list" },
  { label: "Планы", href: "/plans", icon: "flag" },
  { label: "Отчёты", href: "/reports", icon: "query_stats" },
  { label: "Настройки", href: "/settings", icon: "settings" },
  { label: "Кредиты", href: "/loans", icon: "account_balance" },
  { label: "Карты", href: "/cards", icon: "credit_card" },
  { label: "Долги", href: "/debts", icon: "account_balance_wallet" },
];

export default function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
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
        <div className={styles.bottom}>
          <Link href="/auth/signout" className={styles.signout}>
            <span className="material-icons" aria-hidden>
              logout
            </span>
            <span>Выйти</span>
          </Link>
        </div>
      </aside>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerRight}>
            {/* место под профиль/смену периода/поиск */}
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
