import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import InvestmentsModeSettings from "@/components/settings/modes/InvestmentsModeSettings";

export const dynamic = 'force-dynamic';

export default async function InvestmentsModeSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <InvestmentsModeSettings />;
}
