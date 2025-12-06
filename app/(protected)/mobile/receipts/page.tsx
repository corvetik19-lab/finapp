import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import MobileReceiptsManager from "@/components/mobile/MobileReceiptsManager";

export const metadata = {
  title: 'Чеки | Мобильная версия',
  description: 'Управление чеками на мобильном устройстве',
};

export default async function MobileReceiptsPage() {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  let query = supabase
    .from('attachments')
    .select('*')
    .order('created_at', { ascending: false });

  if (companyId) {
    // Показываем чеки текущей компании и старые записи без company_id (совместимость)
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  } else {
    // Без компании — показываем только записи без company_id
    query = query.or('company_id.is.null');
  }

  const { data: attachments } = await query;

  return <MobileReceiptsManager initialReceipts={attachments || []} />;
}
