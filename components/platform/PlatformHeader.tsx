"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ModeSwitcher from "./ModeSwitcher";
import UserMenu from "./UserMenu";
import NotificationCenter from "./NotificationCenter";
import OrganizationSwitcher from "./OrganizationSwitcher";
import { stopImpersonating } from "@/lib/admin/organizations";
import styles from "./Platform.module.css";

interface PlatformHeaderProps {
  user?: {
    email?: string;
    full_name?: string;
  };
  organization?: {
    name: string;
    allowed_modes?: string[];
  };
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_plan: string;
  }>;
  notificationCount?: number;
  impersonating?: {
    userId: string;
    userName: string;
  } | null;
  isSuperAdmin?: boolean;
  isOrgAdmin?: boolean;
}

export default function PlatformHeader({
  user,
  organization,
  organizations = [],
  notificationCount = 0,
  impersonating,
  isSuperAdmin = false,
  isOrgAdmin = false,
}: PlatformHeaderProps) {
  const router = useRouter();

  const handleStopImpersonating = async () => {
    try {
      await stopImpersonating();
      router.refresh();
    } catch (error) {
      console.error('Error stopping impersonation:', error);
    }
  };

  return (
    <>
      {/* Impersonation Banner */}
      {impersonating && (
        <div className={styles.impersonationBanner}>
          <span className="material-icons">person</span>
          <span>Вы работаете под пользователем: <strong>{impersonating.userName}</strong></span>
          <button onClick={handleStopImpersonating} className={styles.impersonationExitButton}>
            <span className="material-icons">logout</span>
            Выйти
          </button>
        </div>
      )}
      <header className={`${styles.platformHeader} ${impersonating ? styles.withBanner : ''}`}>
      <div className={styles.headerContainer}>
        {/* Logo */}
        <Link href="/dashboard" className={styles.headerLogo}>
          <span className={`material-icons ${styles.headerLogoIcon}`}>
            account_balance
          </span>
          <span>FinApp</span>
        </Link>

        {/* Mode Switcher */}
        <ModeSwitcher allowedModes={organization?.allowed_modes} />

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
          {/* Quick Super Admin Access Button - Только для супер-админов */}
          {isSuperAdmin && (
            <Link href="/superadmin" className={styles.financeButton} title="Супер-админ">
              <span className="material-icons">admin_panel_settings</span>
              <span className={styles.financeButtonText}>Админ</span>
            </Link>
          )}

          {/* Organization Admin Button - Для админов организации (не супер-админов) */}
          {isOrgAdmin && !isSuperAdmin && (
            <Link href="/admin/settings" className={styles.adminButton} title="Администрирование">
              <span className="material-icons">settings_applications</span>
              <span className={styles.financeButtonText}>Управление</span>
            </Link>
          )}

          {/* Calendar - Hidden on mobile */}
          <button className={`${styles.iconButton} ${styles.hideOnMobile}`} aria-label="Календарь">
            <span className="material-icons">calendar_month</span>
          </button>

          {/* Settings - разные для супер-админа и обычных пользователей */}
          <Link 
            href={isSuperAdmin ? "/admin/settings" : "/settings"} 
            className={`${styles.iconButton} ${styles.hideOnMobile}`} 
            title={isSuperAdmin ? "Админ настройки" : "Настройки"}
          >
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
    </>
  );
}
