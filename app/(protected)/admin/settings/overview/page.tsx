import { redirect } from "next/navigation";
import Link from "next/link";
import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentOrganization } from "@/lib/platform/organization";
import styles from "./overview.module.css";

export default async function SettingsOverviewPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Обзор настроек</h1>
        <p className={styles.subtitle}>
          Управляйте организацией, пользователями, ролями и интеграциями
        </p>
      </div>

      <div className={styles.grid}>
        {/* Организация */}
        <Link href="/admin/settings/organization" className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.iconOrganization}`}>
            <span className="material-icons">business</span>
          </div>
          <h3>Организация</h3>
          <p>
            {organization?.name ? organization.name : "Не настроено"}
          </p>
          <span className={styles.cardLink}>Настроить →</span>
        </Link>

        {/* Пользователи */}
        <Link href="/admin/settings/users" className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.iconUsers}`}>
            <span className="material-icons">people</span>
          </div>
          <h3>Пользователи</h3>
          <p>Управление доступом и приглашениями</p>
          <span className={styles.cardLink}>Управлять →</span>
        </Link>

        {/* Роли */}
        <Link href="/admin/settings/roles" className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.iconRoles}`}>
            <span className="material-icons">admin_panel_settings</span>
          </div>
          <h3>Роли и права</h3>
          <p>Настройка прав доступа</p>
          <span className={styles.cardLink}>Настроить →</span>
        </Link>

        {/* Интеграции */}
        <Link href="/admin/settings/integrations" className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.iconIntegrations}`}>
            <span className="material-icons">extension</span>
          </div>
          <h3>Интеграции</h3>
          <p>Telegram, n8n и другие сервисы</p>
          <span className={styles.cardLink}>Подключить →</span>
        </Link>

        {/* API ключи */}
        <Link href="/admin/settings/api-keys" className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.iconModes}`}>
            <span className="material-icons">api</span>
          </div>
          <h3>API ключи</h3>
          <p>Управление ключами доступа к API</p>
          <span className={styles.cardLink}>Настроить →</span>
        </Link>

        {/* Настройки тендеров */}
        <Link href="/tenders/settings" className={styles.card}>
          <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}>
            <span className="material-icons">gavel</span>
          </div>
          <h3>Настройки тендеров</h3>
          <p>Этапы, типы, уведомления, автоматизация</p>
          <span className={styles.cardLink}>Настроить →</span>
        </Link>

        {/* Безопасность */}
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}>
            <span className="material-icons">security</span>
          </div>
          <h3 className={styles.cardTitle}>Безопасность</h3>
          <p className={styles.cardDesc}>
            Двухфакторная аутентификация, логи
          </p>
          <a href="/settings/security" className={styles.cardLink}>
            Настроить →
          </a>
        </div>
      </div>
    </div>
  );
}
