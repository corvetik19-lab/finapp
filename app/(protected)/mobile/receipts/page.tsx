import { createRSCClient } from "@/lib/supabase/server";
import MobileReceiptsManager from "@/components/mobile/MobileReceiptsManager";

export const metadata = {
  title: 'Чеки | Мобильная версия',
  description: 'Управление чеками на мобильном устройстве',
};

export default async function MobileReceiptsPage() {
  const supabase = await createRSCClient();
  
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')
    .order('created_at', { ascending: false });

  return <MobileReceiptsManager initialReceipts={attachments || []} />;
}
