"use client";

import Link from "next/link";
import ModeSwitcher from "./ModeSwitcher";
import UserMenu from "./UserMenu";
import NotificationCenter from "./NotificationCenter";
import OrganizationSwitcher from "./OrganizationSwitcher";
import styles from "./Platform.module.css";

interface PlatformHeaderProps {
  user?: {
    email?: string;
    full_name?: string;
  };
  organization?: {
    name: string;
  };
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_plan: string;
  }>;
  notificationCount?: number;
}

export default function PlatformHeader({
  user,
  organization,
  organizations = [],
  notificationCount = 0,
}: PlatformHeaderProps) {
  return (
    <header className={styles.platformHeader}>
      <div className={styles.headerContainer}>
        {/* Logo */}
        <Link href="/dashboard" className={styles.headerLogo}>
          <span className={`material-icons ${styles.headerLogoIcon}`}>
            account_balance
          </span>
          <span>FinApp</span>
        </Link>

        {/* Mode Switcher */}
        <ModeSwitcher />

        {/* Greeting */}
        <div className={styles.headerGreeting}>
          Привет, {user?.full_name || 'Пользователь'}!
        </div>

        {/* Search */}
        <div className={styles.headerSearch}>
          <span className="material-icons">search</span>
          <input 
            type="search" 
            placeholder="Поиск..." 
            className={styles.searchInput}
          />
        </div>

        <div className={styles.headerSpacer} />

        {/* Actions */}
        <div className={styles.headerActions}>
          {/* Calendar - Hidden on mobile */}
          <button className={`${styles.iconButton} ${styles.hideOnMobile}`} aria-label="Календарь">
            <span className="material-icons">calendar_month</span>
          </button>

          {/* Global Settings - Hidden on mobile */}
          <Link href="/admin/settings" className={`${styles.iconButton} ${styles.hideOnMobile}`} title="Глобальные настройки">
            <span className="material-icons">settings</span>
          </Link>

          {/* Organization Switcher */}
          {organization && organizations.length > 0 && (
            <OrganizationSwitcher
              currentOrganization={{
                id: organization.name,
                name: organization.name,
                slug: organization.name,
                subscription_plan: 'free'
              }}
              organizations={organizations}
            />
          )}

          {/* Notifications - Hidden on mobile */}
          <div className={styles.hideOnMobile}>
            <NotificationCenter
              unreadCount={notificationCount}
            />
          </div>

          {/* User Menu - Hidden on mobile */}
          {user && (
            <div className={styles.hideOnMobile}>
              <UserMenu
                user={{
                  email: user.email || '',
                  full_name: user.full_name || '',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
