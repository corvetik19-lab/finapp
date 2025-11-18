import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ApiKeysManager from "@/components/settings/ApiKeysManager";

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Получаем API ключи организации
  const { data: apiKeys = [] } = await supabase
    .from("api_keys")
    .select("*")
    .order("created_at", { ascending: false });

  return <ApiKeysManager apiKeys={apiKeys || []} />;
}
