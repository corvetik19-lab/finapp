"use client";

import Link from "next/link";
import ModeSwitcher from "./ModeSwitcher";
import styles from "./Platform.module.css";

interface PlatformHeaderProps {
  user?: {
    email?: string;
    full_name?: string;
  };
  organization?: {
    name: string;
  };
  notificationCount?: number;
}

export default function PlatformHeader({
  user,
  organization,
  notificationCount = 0,
}: PlatformHeaderProps) {
  const userInitial = user?.full_name?.[0] || user?.email?.[0] || "U";

  return (
    <header className={styles.platformHeader}>
      <div className={styles.headerContainer}>
        {/* Logo */}
        <Link href="/finance/dashboard" className={styles.headerLogo}>
          <span className={`material-icons ${styles.headerLogoIcon}`}>
            account_balance
          </span>
          <span>FinApp Platform</span>
        </Link>

        {/* Mode Switcher */}
        <ModeSwitcher />

        <div className={styles.headerSpacer} />

        {/* Actions */}
        <div className={styles.headerActions}>
          {/* Organization Switcher */}
          {organization && (
            <div className={styles.orgSwitcher}>
              <button className={styles.orgButton}>
                <span className="material-icons">business</span>
                <span className={styles.orgName}>{organization.name}</span>
              </button>
            </div>
          )}

          {/* Notifications */}
          <button
            className={styles.notificationButton}
            aria-label="Уведомления"
          >
            <span className="material-icons">notifications</span>
            {notificationCount > 0 && (
              <span className={styles.notificationBadge}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <button className={styles.userMenuButton}>
            <div className={styles.userAvatar}>
              {userInitial.toUpperCase()}
            </div>
            {user?.full_name && (
              <span className={styles.userName}>{user.full_name}</span>
            )}
            <span className="material-icons">expand_more</span>
          </button>
        </div>
      </div>
    </header>
  );
}
