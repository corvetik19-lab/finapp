"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SettingsNav.module.css";

const NAV_ITEMS = [
  {
    section: "Обзор",
    items: [
      { href: "/admin/settings/overview", icon: "dashboard", label: "Обзор" },
    ],
  },
  {
    section: "Управление",
    items: [
      { href: "/admin/settings/organization", icon: "business", label: "Организации" },
      { href: "/admin/settings/users", icon: "people", label: "Пользователи" },
      { href: "/admin/settings/roles", icon: "admin_panel_settings", label: "Роли и права" },
    ],
  },
  {
    section: "Биллинг",
    items: [
      { href: "/superadmin/billing", icon: "payments", label: "Биллинг" },
      { href: "/superadmin/pricing", icon: "sell", label: "Ценообразование" },
    ],
  },
  {
    section: "Интеграции",
    items: [
      { href: "/admin/settings/integrations", icon: "extension", label: "Интеграции" },
      { href: "/admin/settings/api-keys", icon: "api", label: "API ключи" },
    ],
  },
  {
    section: "Система",
    items: [
      { href: "/admin/settings/backup", icon: "backup", label: "Резервные копии" },
    ],
  },
];

export default function AdminSettingsNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((section) => (
        <div key={section.section} className={styles.section}>
          <h3 className={styles.sectionTitle}>{section.section}</h3>
          <div className={styles.items}>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.item} ${isActive ? styles.active : ""}`}
                >
                  <span className="material-icons">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Кнопка возврата к тендерам */}
      <div className={styles.backSection}>
        <Link href="/tenders/dashboard" className={styles.backLink}>
          <span className="material-icons">arrow_back</span>
          <span>Вернуться к тендерам</span>
        </Link>
      </div>
    </nav>
  );
}
