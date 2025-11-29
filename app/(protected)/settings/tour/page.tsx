import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import TourManager from "@/components/settings/TourManager";

export default async function TourSettingsPage() {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  return <TourManager />;
}
