import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import TourManager from "@/components/settings/TourManager";

export default async function TourSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <TourManager />;
}
