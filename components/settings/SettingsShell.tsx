"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CategoriesManager, { type CategoryRecord } from "@/components/settings/CategoriesManager";
import PlanSettingsManager, {
  type PlanPresetRecord,
  type PlanTypeRecord,
} from "@/components/settings/PlanSettingsManager";
import ProfileManager from "@/components/settings/ProfileManager";
import RolesManager, { type RoleRecord } from "@/components/settings/RolesManager";
import UsersManager, { type UserRecord, type RoleOption } from "@/components/settings/UsersManager";
import styles from "@/components/settings/Settings.module.css";

const TAB_KEYS = ["profile", "categories", "plans", "users", "roles", "notifications", "backup", "theme"] as const;
type TabKey = (typeof TAB_KEYS)[number];

type ProfileData = {
  email: string;
  fullName: string;
  phone: string;
  avatar: string | null;
  createdAt: string;
};

type SettingsShellProps = {
  profile: ProfileData;
  categories: CategoryRecord[];
  planTypes: PlanTypeRecord[];
  planPresets: PlanPresetRecord[];
  users: UserRecord[];
  roles: RoleRecord[];
  roleOptions: RoleOption[];
};

const TAB_LABELS: Record<TabKey, { icon: string; label: string }> = {
  profile: { icon: "person", label: "Профиль" },
  categories: { icon: "label", label: "Категории" },
  plans: { icon: "flag", label: "Планы" },
  users: { icon: "people", label: "Пользователи" },
  roles: { icon: "admin_panel_settings", label: "Роли" },
  notifications: { icon: "notifications", label: "Уведомления" },
  backup: { icon: "backup", label: "Резервные копии" },
  theme: { icon: "palette", label: "Тема" },
};

export default function SettingsShell({ profile, categories, planTypes, planPresets, users, roles, roleOptions }: SettingsShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const router = useRouter();

  const handleTabClick = (tab: TabKey) => {
    if (tab === "notifications") {
      router.push("/settings/notifications");
      return;
    }
    setActiveTab(tab);
  };

  const tabContent = useMemo(() => {
    if (activeTab === "profile") {
      return <ProfileManager profile={profile} />;
    }
    
    if (activeTab === "categories") {
      return <CategoriesManager categories={categories} />;
    }

    if (activeTab === "plans") {
      return <PlanSettingsManager planTypes={planTypes} planPresets={planPresets} />;
    }

    if (activeTab === "users") {
      return <UsersManager users={users} roles={roleOptions} />;
    }

    if (activeTab === "roles") {
      return <RolesManager roles={roles} />;
    }

    return (
      <div className={styles.placeholderCard}>
        <div className={styles.placeholderTitle}>Раздел в разработке</div>
        <p className={styles.placeholderText}>
          Здесь скоро появятся дополнительные настройки. Следите за обновлениями.
        </p>
      </div>
    );
  }, [activeTab, profile, categories, planPresets, planTypes, users, roles, roleOptions]);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Настройки</div>
      </div>

      <div className={styles.tabs}>
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => handleTabClick(tab)}
          >
            <span className="material-icons" aria-hidden>
              {TAB_LABELS[tab].icon}
            </span>
            &nbsp;{TAB_LABELS[tab].label}
          </button>
        ))}
      </div>

      <div className={styles.content}>{tabContent}</div>
    </div>
  );
}
