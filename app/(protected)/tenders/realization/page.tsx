import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getTenderStages } from '@/lib/tenders/service';
import { TenderRealizationClient } from './tender-realization-client';

export default async function TenderRealizationPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Получаем company_id пользователя
  const { data: profile } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const companyId = profile?.company_id || null;

  // Загружаем этапы реализации
  const { data: stages } = await getTenderStages(companyId);
  const realizationStages = stages?.filter((s) => s.category === 'realization') || [];

  return (
    <div className="h-full">
      <TenderRealizationClient 
        stages={realizationStages} 
        companyId={companyId}
      />
    </div>
  );
}
