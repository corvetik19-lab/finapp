"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ProtectedShell.module.css";
import type { Permission } from "@/lib/auth/permissions";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  requiredPermission?: Permission;
};

type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
  requiredPermission?: Permission;
};

type NavConfig = NavItem | NavGroup;

// Проверка является ли элемент группой
function isNavGroup(item: NavConfig): item is NavGroup {
  return 'items' in item;
}

type NavigationProps = {
  navConfig: NavConfig[];
};

export default function Navigation({ navConfig }: NavigationProps) {
  const pathname = usePathname();
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
                <span>{item.label}</span>
                <span className="material-icons" aria-hidden>
                  {isOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              
              {isOpen && (
                <div className={styles.navGroupItems}>
                  {item.items.map((child, childIndex) => (
                    <Link
                      key={`child-${index}-${childIndex}`}
                      href={child.href}
                      className={`${styles.navItem} ${isItemActive(child.href) ? styles.active : ''}`}
                    >
                      <span className="material-icons" aria-hidden>
                        {child.icon}
                      </span>
                      <span>{child.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        } else {
          // Обычный пункт меню
          return (
            <Link
              key={`item-${index}`}
              href={item.href}
              className={`${styles.navItem} ${isItemActive(item.href) ? styles.active : ''}`}
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
  );
}
