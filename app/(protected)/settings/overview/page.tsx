import { redirect } from "next/navigation";
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
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
            <span className="material-icons">business</span>
          </div>
          <h3 className={styles.cardTitle}>Организация</h3>
          <p className={styles.cardDesc}>
            {organization ? organization.name : "Не настроено"}
          </p>
          <a href="/settings/organization" className={styles.cardLink}>
            Настроить →
          </a>
        </div>

        {/* Пользователи */}
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            <span className="material-icons">people</span>
          </div>
          <h3 className={styles.cardTitle}>Пользователи</h3>
          <p className={styles.cardDesc}>
            Управление доступом и приглашениями
          </p>
          <a href="/settings/users" className={styles.cardLink}>
            Управлять →
          </a>
        </div>

        {/* Роли */}
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
            <span className="material-icons">admin_panel_settings</span>
          </div>
          <h3 className={styles.cardTitle}>Роли и права</h3>
          <p className={styles.cardDesc}>
            Настройка прав доступа
          </p>
          <a href="/settings/roles" className={styles.cardLink}>
            Настроить →
          </a>
        </div>

        {/* Интеграции */}
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}>
            <span className="material-icons">extension</span>
          </div>
          <h3 className={styles.cardTitle}>Интеграции</h3>
          <p className={styles.cardDesc}>
            Telegram, n8n и другие сервисы
          </p>
          <a href="/settings/integrations" className={styles.cardLink}>
            Подключить →
          </a>
        </div>

        {/* Режимы */}
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}>
            <span className="material-icons">tune</span>
          </div>
          <h3 className={styles.cardTitle}>Настройки режимов</h3>
          <p className={styles.cardDesc}>
            Финансы, Инвестиции, Личные
          </p>
          <a href="/settings/modes/finance" className={styles.cardLink}>
            Настроить →
          </a>
        </div>

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
