import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentOrganization } from "@/lib/platform/organization";
import OrganizationSettings from "@/components/settings/OrganizationSettings";

export default async function OrganizationSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div style={{ padding: "24px" }}>
        <h1>Организация не найдена</h1>
        <p>Вы не являетесь членом организации.</p>
      </div>
    );
  }

  return <OrganizationSettings organization={organization} />;
}
