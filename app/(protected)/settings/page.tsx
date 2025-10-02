import { createRSCClient } from "@/lib/supabase/helpers";
import styles from "@/components/settings/Settings.module.css";
import CategoriesManager, { type CategoryRecord } from "@/components/settings/CategoriesManager";

export default async function SettingsPage() {
  const supabase = await createRSCClient();

  const { data: cats = [] } = await supabase
    .from("categories")
    .select("id,name,kind,parent_id")
    .order("name", { ascending: true });

  const categories = (cats || []) as CategoryRecord[];

  return (
    <div>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Настройки</div>
      </div>

      <div className={styles.tabs}>
        <div className={`${styles.tab} ${styles.tabActive}`}>
          <span className="material-icons" aria-hidden>label</span>
          &nbsp;Категории
        </div>
        <div className={styles.tab}>
          <span className="material-icons" aria-hidden>admin_panel_settings</span>
          &nbsp;Роли
        </div>
        <div className={styles.tab}>
          <span className="material-icons" aria-hidden>backup</span>
          &nbsp;Резервные копии
        </div>
        <div className={styles.tab}>
          <span className="material-icons" aria-hidden>palette</span>
          &nbsp;Тема
        </div>
      </div>

      {/* Категории */}
      <CategoriesManager categories={categories} />
    </div>
  );
}
