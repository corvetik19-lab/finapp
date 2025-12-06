"use client";

import { useMemo, useState } from "react";
import CategoriesManager, { type CategoryRecord } from "@/components/settings/CategoriesManager";
import PlanSettingsManager, { type PlanPresetRecord, type PlanTypeRecord } from "@/components/settings/PlanSettingsManager";
import ProfileManager from "@/components/settings/ProfileManager";
import RolesManager, { type RoleRecord } from "@/components/settings/RolesManager";
import UsersManager, { type UserRecord, type RoleOption } from "@/components/settings/UsersManager";
import TelegramManager from "@/components/settings/TelegramManager";
import BackupManager from "@/components/settings/BackupManager";
import ApiKeysManager from "@/components/settings/ApiKeysManager";
import N8nManager from "./N8nManager";
import TourManager from "@/components/settings/TourManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Tag, Flag, Users, ShieldCheck, Send, HardDrive, Key, Settings2, Compass, LucideIcon } from "lucide-react";

const TAB_KEYS = ["profile", "categories", "plans", "users", "roles", "telegram", "backup", "api", "n8n", "tour"] as const;
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

const TAB_LABELS: Record<TabKey, { Icon: LucideIcon; label: string }> = {
  profile: { Icon: User, label: "Профиль" },
  categories: { Icon: Tag, label: "Категории" },
  plans: { Icon: Flag, label: "Планы" },
  users: { Icon: Users, label: "Пользователи" },
  roles: { Icon: ShieldCheck, label: "Роли" },
  telegram: { Icon: Send, label: "Telegram" },
  backup: { Icon: HardDrive, label: "Резервные копии" },
  api: { Icon: Key, label: "API Keys" },
  n8n: { Icon: Settings2, label: "n8n Автоматизация" },
  tour: { Icon: Compass, label: "Туры и подсказки" },
};

export default function SettingsShell({ profile, categories, planTypes, planPresets, users, roles, roleOptions }: SettingsShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

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

    if (activeTab === "telegram") {
      return <TelegramManager />;
    }

    if (activeTab === "backup") {
      return <BackupManager />;
    }

    if (activeTab === "api") {
      return <ApiKeysManager apiKeys={[]} />;
    }

    if (activeTab === "n8n") {
      return <N8nManager />;
    }

    if (activeTab === "tour") {
      return <TourManager />;
    }

    return (
      <Card><CardContent className="py-8 text-center"><h3 className="font-semibold mb-2">Раздел в разработке</h3><p className="text-muted-foreground">Здесь скоро появятся дополнительные настройки.</p></CardContent></Card>
    );
  }, [activeTab, profile, categories, planPresets, planTypes, users, roles, roleOptions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Настройки</h1></div>
      <div className="flex flex-wrap gap-2">
        {TAB_KEYS.map((tab) => {
          const { Icon, label } = TAB_LABELS[tab];
          return <Button key={tab} variant={activeTab === tab ? "default" : "outline"} size="sm" onClick={() => setActiveTab(tab)} className="gap-2"><Icon className="h-4 w-4" />{label}</Button>;
        })}
      </div>
      <div>{tabContent}</div>
    </div>
  );
}
