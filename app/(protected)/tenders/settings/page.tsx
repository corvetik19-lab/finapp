import { createRSCClient } from '@/lib/supabase/server';
import { TenderSettingsClient } from './tender-settings-client';

export default async function TenderSettingsPage() {
  const supabase = await createRSCClient();

  // Загружаем этапы
  const { data: stages } = await supabase
    .from('tender_stages')
    .select('*')
    .order('order_index', { ascending: true });

  return (
    <TenderSettingsClient 
      stages={stages || []} 
    />
  );
}
