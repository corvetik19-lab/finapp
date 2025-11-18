import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getTenderStages, getTenderTypes } from '@/lib/tenders/service';
import { TenderDepartmentClient } from './tender-department-client';

export default async function TenderDepartmentPage() {
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

  // Загружаем этапы тендерного отдела и типы (только из настроек компании)
  const { data: stages } = await getTenderStages(companyId);
  const { data: types } = await getTenderTypes(companyId);
  
  // Включаем этапы тендерного отдела и архивные этапы
  const allStages = stages?.filter((s) => s.category === 'tender_dept' || s.category === 'archive') || [];
  
  // Сортируем: архивные этапы сверху, затем обычные по order_index
  const departmentStages = allStages.sort((a, b) => {
    if (a.category === 'archive' && b.category !== 'archive') return -1;
    if (a.category !== 'archive' && b.category === 'archive') return 1;
    return (a.order_index || 0) - (b.order_index || 0);
  });

  return (
    <div className="h-full">
      <TenderDepartmentClient stages={departmentStages} types={types || []} />
    </div>
  );
}
