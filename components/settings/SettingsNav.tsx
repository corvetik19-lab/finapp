"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SettingsNav.module.css";

const NAV_ITEMS = [
  {
    section: "Личное",
    items: [
      { href: "/admin/settings/profile", icon: "person", label: "Профиль" },
    ],
  },
  {
    section: "Общие",
    items: [
      { href: "/admin/settings/organization", icon: "business", label: "Организация" },
      { href: "/admin/settings/users", icon: "people", label: "Пользователи" },
      { href: "/admin/settings/roles", icon: "admin_panel_settings", label: "Роли и права" },
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
      { href: "/admin/settings/security", icon: "security", label: "Безопасность" },
      { href: "/admin/settings/notifications", icon: "notifications", label: "Уведомления" },
      { href: "/admin/settings/backup", icon: "backup", label: "Резервные копии" },
    ],
  },
  {
    section: "Помощь",
    items: [
      { href: "/admin/settings/tour", icon: "help", label: "Туры и подсказки" },
    ],
  },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((section) => (
        <div key={section.section} className={styles.section}>
          <h3 className={styles.sectionTitle}>{section.section}</h3>
          <div className={styles.items}>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
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
    </nav>
  );
}
