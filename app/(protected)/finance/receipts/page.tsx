import { createRSCClient } from "@/lib/supabase/server";
import ReceiptsManager from "@/components/receipts/ReceiptsManager";

export const metadata = {
  title: 'Чеки | Финансы',
  description: 'Управление чеками и документами',
};

export default async function ReceiptsPage() {
  const supabase = await createRSCClient();
  
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')
    .order('created_at', { ascending: false });

  return <ReceiptsManager initialReceipts={attachments || []} />;
}
