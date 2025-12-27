import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ProfileManager from "@/components/settings/ProfileManager";
import { UserSubscriptionsCard } from "@/components/settings/UserSubscriptionsCard";
import { getUserSubscriptions } from "@/lib/billing/user-subscription-service";

export default async function ProfileSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Загружаем подписки пользователя
  const allSubscriptions = await getUserSubscriptions({ user_id: user.id });
  const userSubscriptions = allSubscriptions.map(sub => ({
    id: sub.id,
    mode: sub.mode,
    status: sub.status,
    plan_name: sub.plan?.name || 'Без тарифа',
    billing_period: sub.billing_period,
    current_period_end: sub.current_period_end,
    amount: sub.amount,
    features: sub.plan?.features as string[] | undefined,
  }));

  return (
    <div className="space-y-6">
      <ProfileManager
        profile={{
          email: user.email || "",
          fullName: user.user_metadata?.full_name || "",
          phone: user.user_metadata?.phone || "",
          avatar: user.user_metadata?.avatar_url || "",
          createdAt: user.created_at || "",
        }}
      />
      
      {/* Показываем подписки если они есть */}
      {userSubscriptions.length > 0 && (
        <UserSubscriptionsCard subscriptions={userSubscriptions} />
      )}
    </div>
  );
}
