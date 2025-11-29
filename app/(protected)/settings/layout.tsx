import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedUser, createRouteClient } from "@/lib/supabase/server";
import SettingsNav from "@/components/settings/SettingsNav";
import styles from "./settings-layout.module.css";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { data: { user } } = await getCachedUser();
  
  if (!user) {
    redirect("/login");
  }

  const supabase = await createRouteClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', user.id)
    .single();

  // Супер-админ перенаправляется на админские настройки
  if (profile?.global_role === 'super_admin') {
    redirect("/admin/settings");
  }

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
