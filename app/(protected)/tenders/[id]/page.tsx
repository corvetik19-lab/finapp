import { notFound, redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/server';
import { getTenderById, getTenderTypes } from '@/lib/tenders/service';
import { TenderDetailClient } from './tender-detail-client';

interface TenderPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenderPage({ params }: TenderPageProps) {
  // Проверка авторизации
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Получение тендера и справочников
  const { id } = await params;
  const tenderResult = await getTenderById(id);

  if (tenderResult.error || !tenderResult.data) {
    notFound();
  }

  const typesResult = await getTenderTypes(tenderResult.data.company_id);

  // Загружаем список сотрудников компании
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, role')
    .eq('company_id', tenderResult.data.company_id)
    .eq('status', 'active')
    .order('full_name');

  // Загружаем шаблоны этапов
  const { data: templates } = await supabase
    .from('tender_stage_templates')
    .select('*, items:tender_stage_template_items(*)')
    .or(`company_id.is.null,company_id.eq.${tenderResult.data.company_id}`)
    .eq('is_active', true)
    .order('name');

  // Загружаем этапы для истории
  const { data: stages } = await supabase
    .from('tender_stages')
    .select('*')
    .or(`company_id.eq.${tenderResult.data.company_id},company_id.is.null`)
    .order('order_index');

  return (
    <TenderDetailClient
      tender={tenderResult.data}
      types={typesResult.data || []}
      employees={employees || []}
      templates={templates || []}
      stages={stages || []}
    />
  );
}
