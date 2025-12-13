import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentCompanyId } from '@/lib/platform/organization';
import { Users } from 'lucide-react';
import { WorkloadClient } from '@/components/team/workload/WorkloadClient';

export const dynamic = 'force-dynamic';

export default async function WorkloadPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <h2 className="text-lg font-medium">Компания не найдена</h2>
        <p>Выберите или создайте компанию в настройках.</p>
      </div>
    );
  }

  // Get employees
  const { data: employeesData } = await supabase
    .from('company_members')
    .select(`
      user_id,
      profiles!inner(id, full_name, email, avatar_url)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active');

  const employees = employeesData?.map(e => {
    const p = e.profiles as unknown as { id: string; full_name: string | null; email: string | null; avatar_url: string | null };
    return {
      id: p?.id || e.user_id,
      name: p?.full_name || p?.email || 'Неизвестный',
      email: p?.email || '',
      avatar_url: p?.avatar_url || undefined,
      capacity_hours: 40,
    };
  }) || [];

  // Get workload allocations
  const { data: allocations } = await supabase
    .from('workload_allocations')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Загрузка команды
        </h1>
        <p className="text-muted-foreground mt-1">
          Распределение задач и планирование мощностей
        </p>
      </div>

      {/* Workload Client */}
      <WorkloadClient
        companyId={companyId}
        userId={user.id}
        employees={employees}
        initialAllocations={allocations || []}
      />
    </div>
  );
}
