import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SuperadminLayout as SuperadminLayoutWrapper } from '@/components/superadmin/superadmin-layout';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: { user } } = await getCachedUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Используем admin client для обхода RLS
  const supabase = createAdminClient();

  // Проверяем что пользователь - супер-админ
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.global_role !== 'super_admin') {
    redirect('/');
  }

  return (
    <SuperadminLayoutWrapper userName={profile?.full_name || user.email || undefined}>
      {children}
    </SuperadminLayoutWrapper>
  );
}
