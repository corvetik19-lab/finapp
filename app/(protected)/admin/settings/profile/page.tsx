import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ProfileManager from "@/components/settings/ProfileManager";

export default async function ProfileSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileManager
      profile={{
        email: user.email || "",
        fullName: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || "",
        avatar: user.user_metadata?.avatar_url || "",
        createdAt: user.created_at || "",
      }}
    />
  );
}
