import { createRSCClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TendersAdminDashboard } from '@/components/tenders/TendersAdminDashboard';

export const metadata = {
  title: 'Обзор тендеров | Админ',
  description: 'Панель управления тендерами для администратора организации'
};

export default async function TendersAdminPage() {
  const supabase = await createRSCClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  // Проверяем глобальную роль
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, global_role')
    .eq('id', user.id)
    .single();

  // Проверяем роль в компании
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const companyId = member?.company_id || profile?.company_id;
  
  if (!companyId) {
    redirect('/tenders/dashboard');
  }

  const isGlobalAdmin = profile?.global_role === 'admin' || profile?.global_role === 'super_admin';
  const isCompanyAdmin = member?.role === 'admin';
  
  if (!isGlobalAdmin && !isCompanyAdmin) {
    redirect('/tenders/list');
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <TendersAdminDashboard companyId={companyId} />
    </div>
  );
}
