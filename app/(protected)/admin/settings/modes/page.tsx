import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { getEnabledModes } from "@/lib/platform/platform-settings";
import { ALL_MODES } from "@/lib/platform/modes-config";
import { OrgModesManager } from "@/components/admin/OrgModesManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrgModesPage() {
  const { data: { user } } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  
  if (!organization) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600">Организация не найдена</h1>
        <p className="text-gray-500">Вы не являетесь членом организации.</p>
      </div>
    );
  }

  // Получаем глобально включённые режимы (супер-админом)
  const globalEnabledModes = await getEnabledModes();
  
  // Текущие режимы организации
  const orgModes = organization.allowed_modes || [];

  return (
    <div className="space-y-6 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Режимы организации</h1>
        <p className="text-gray-500 mt-1">
          Управление доступными режимами для сотрудников вашей организации
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Доступные режимы
          </CardTitle>
          <CardDescription>
            Включите режимы, которые будут доступны сотрудникам вашей организации. 
            Вы можете выбирать только из режимов, включённых администратором платформы.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgModesManager 
            allModes={ALL_MODES}
            globalEnabledModes={globalEnabledModes}
            orgModes={orgModes}
            organizationId={organization.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
