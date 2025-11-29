import { ReactNode } from "react";
import AdminSettingsNav from "@/components/settings/AdminSettingsNav";
import styles from "./settings-layout.module.css";

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.title}>Админ настройки</h1>
          <p className={styles.subtitle}>Управление платформой</p>
        </div>
        <AdminSettingsNav />
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
