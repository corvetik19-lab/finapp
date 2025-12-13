import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentUserPermissions, canViewAllTenders } from '@/lib/permissions/check-permissions';
import ConferencesClient from '@/components/team/conferences/ConferencesClient';

export const dynamic = 'force-dynamic';

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default async function ConferencesPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Получаем company_id
  const { data: profiles } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1);

  const companyId = profiles?.[0]?.company_id;

  if (!companyId) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <h2 className="text-lg font-medium">Компания не найдена</h2>
        <p>Выберите или создайте компанию в настройках.</p>
      </div>
    );
  }

  // Получаем профиль пользователя
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  const permissions = await getCurrentUserPermissions();
  const isAdmin = canViewAllTenders(permissions);

  // Получаем конференции
  const { data: conferences } = await supabase
    .from('conferences')
    .select('*')
    .eq('company_id', companyId)
    .order('scheduled_at', { ascending: true, nullsFirst: false });

  // Получаем сотрудников для приглашения
  const { data: employees } = await supabase
    .from('company_members')
    .select(`
      user_id,
      profiles!inner(id, full_name, avatar_url)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active');

  const employeesList = employees?.map(e => {
    const profile = e.profiles as unknown as { full_name: string; avatar_url: string | null } | null;
    return {
      id: e.user_id,
      full_name: profile?.full_name || 'Без имени',
      avatar_url: profile?.avatar_url || null,
    };
  }) || [];

  return (
    <Suspense fallback={<LoadingState />}>
      <ConferencesClient
        initialConferences={conferences || []}
        employees={employeesList}
        companyId={companyId}
        userId={user.id}
        userName={userProfile?.full_name || 'Пользователь'}
        isAdmin={isAdmin}
      />
    </Suspense>
  );
}
