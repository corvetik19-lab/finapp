import { ReactNode } from "react";
import SettingsNav from "@/components/settings/SettingsNav";
import styles from "./settings-layout.module.css";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.title}>Настройки</h1>
          <p className={styles.subtitle}>Управление приложением и организацией</p>
        </div>
        <SettingsNav />
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
