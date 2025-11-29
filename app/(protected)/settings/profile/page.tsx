import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import ProfileManager from "@/components/settings/ProfileManager";

export default async function ProfileSettingsPage() {
  const {
    data: { user },
  } = await getCachedUser();

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
