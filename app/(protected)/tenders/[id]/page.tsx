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

  // Загружаем список сотрудников компании с ролями из role_data
  const { data: employeesRaw } = await supabase
    .from('employees')
    .select('id, full_name, role, position, role_data:roles!employees_role_id_fkey(name)')
    .eq('company_id', tenderResult.data.company_id)
    .eq('status', 'active')
    .order('full_name');
  
  // Форматируем employees с role_name из role_data
  const employees = (employeesRaw || []).map((emp) => {
    // role_data может быть массивом или объектом в зависимости от join
    const roleData = Array.isArray(emp.role_data) ? emp.role_data[0] : emp.role_data;
    return {
      id: emp.id,
      full_name: emp.full_name,
      role: emp.role,
      role_name: roleData?.name || emp.position || undefined
    };
  });

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
