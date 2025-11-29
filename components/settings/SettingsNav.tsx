"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SettingsNav.module.css";

interface SettingsNavProps {
  isOrgAdmin?: boolean;
}

const NAV_ITEMS = [
  {
    section: "Обзор",
    items: [
      { href: "/settings/overview", icon: "dashboard", label: "Обзор" },
      { href: "/settings/subscription", icon: "card_membership", label: "Подписка" },
    ],
  },
  {
    section: "Личное",
    items: [
      { href: "/settings/profile", icon: "person", label: "Профиль" },
    ],
  },
  {
    section: "Управление",
    items: [
      { href: "/settings/organization", icon: "business", label: "Организация" },
      { href: "/settings/legal-entities", icon: "domain", label: "Юр. лица" },
      { href: "/settings/users", icon: "people", label: "Пользователи" },
      { href: "/settings/roles", icon: "admin_panel_settings", label: "Роли и права" },
      { href: "/settings/departments", icon: "account_tree", label: "Отделы" },
    ],
  },
  {
    section: "Интеграции",
    items: [
      { href: "/settings/integrations", icon: "extension", label: "Интеграции" },
      { href: "/settings/api-keys", icon: "api", label: "API ключи" },
    ],
  },
  {
    section: "Система",
    items: [
      { href: "/settings/security", icon: "security", label: "Безопасность" },
      { href: "/settings/notifications", icon: "notifications", label: "Уведомления" },
      { href: "/settings/backup", icon: "backup", label: "Резервные копии" },
    ],
  },
  {
    section: "Помощь",
    items: [
      { href: "/settings/tour", icon: "help", label: "Туры и подсказки" },
    ],
  },
];

export default function SettingsNav({}: SettingsNavProps) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {/* Кнопка возврата - вверху */}
      <div className={styles.topSection}>
        <Link href="/tenders/dashboard" className={styles.backLink}>
          <span className="material-icons">arrow_back</span>
          <span>Вернуться к тендерам</span>
        </Link>
      </div>

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
