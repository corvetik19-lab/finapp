import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { getEnabledModes } from "@/lib/platform/platform-settings";
import { ALL_MODES } from "@/lib/platform/modes-config";
import { OrgModesManager } from "@/components/admin/OrgModesManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutGrid, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  // Проверяем является ли пользователь супер-админом
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single();
  
  const isSuperAdmin = profile?.global_role === "super_admin";

  // Получаем глобально включённые режимы (супер-админом)
  const globalEnabledModes = await getEnabledModes();
  
  // Текущие режимы организации
  const orgModes = organization.allowed_modes || [];

  return (
    <div className="space-y-6 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Режимы организации</h1>
        <p className="text-gray-500 mt-1">
          {isSuperAdmin 
            ? "Управление доступными режимами для организации"
            : "Просмотр доступных режимов организации"
          }
        </p>
      </header>

      {!isSuperAdmin && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Режимы организации устанавливаются администратором платформы при создании или настройке организации. 
            Для изменения режимов обратитесь к администратору.
          </AlertDescription>
        </Alert>
      )}

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
            isSuperAdmin={isSuperAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
