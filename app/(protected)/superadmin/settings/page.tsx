import { getEnabledModes } from "@/lib/platform/platform-settings";
import { ALL_MODES } from "@/lib/platform/modes-config";
import { GlobalSettingsTabs } from "@/components/superadmin/GlobalSettingsTabs";
import { getOrganizations } from '@/lib/admin/organizations';
import { getUsersWithOrganizations } from '@/lib/admin/users';
import { getRoleConfigs } from '@/lib/admin/roles';
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminSettingsPage() {
  const enabledModes = await getEnabledModes();
  const organizations = await getOrganizations();
  const users = await getUsersWithOrganizations();
  const roles = await getRoleConfigs();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Глобальные настройки
        </h1>
        <p className="text-gray-500 text-sm">
          Настройки, влияющие на всю платформу
        </p>
      </header>

      <GlobalSettingsTabs 
        enabledModes={enabledModes}
        allModes={ALL_MODES}
        organizations={organizations}
        users={users}
        roles={roles}
      />
    </div>
  );
}
