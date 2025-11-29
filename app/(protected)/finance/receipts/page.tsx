import { createRSCClient } from "@/lib/supabase/server";
import ReceiptsManager from "@/components/receipts/ReceiptsManager";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export const metadata = {
  title: 'Чеки | Финансы',
  description: 'Управление чеками и документами',
};

export default async function ReceiptsPage() {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  let query = supabase
    .from('attachments')
    .select('*')
    .order('created_at', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: attachments } = await query;

  return <ReceiptsManager initialReceipts={attachments || []} />;
}
