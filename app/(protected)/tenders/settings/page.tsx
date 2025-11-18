import { createRSCClient } from '@/lib/supabase/server';
import { TenderSettingsComplete } from './tender-settings-complete';

export default async function TenderSettingsPage() {
  const supabase = await createRSCClient();

  // Загружаем этапы
  const { data: stages } = await supabase
    .from('tender_stages')
    .select('*')
    .order('order_index', { ascending: true });

  // Загружаем типы тендеров
  const { data: types } = await supabase
    .from('tender_types')
    .select('*')
    .order('name', { ascending: true });

  return (
    <TenderSettingsComplete 
      initialStages={stages || []} 
      initialTypes={types || []} 
    />
  );
}
