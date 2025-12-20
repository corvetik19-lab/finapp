import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TendersAdminDashboard } from '@/components/tenders/TendersAdminDashboard';

export const metadata = {
  title: 'Обзор тендеров | Админ',
  description: 'Панель управления тендерами для администратора организации'
};

export default async function TendersAdminPage() {
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    redirect('/onboarding');
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
  
  if (!isAdmin) {
    redirect('/tenders/list');
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <TendersAdminDashboard companyId={profile.company_id} />
    </div>
  );
}
