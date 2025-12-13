import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentCompanyId } from '@/lib/platform/organization';
import { BarChart3 } from 'lucide-react';
import { AnalyticsClient } from '@/components/team/analytics/AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function TeamAnalyticsPage() {
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
    };
  }) || [];

  // Get performance metrics
  const { data: performanceData } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_type', 'month');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Рейтинг и аналитика
        </h1>
        <p className="text-muted-foreground mt-1">
          Производительность команды и индивидуальные показатели
        </p>
      </div>

      {/* Analytics Client */}
      <AnalyticsClient
        employees={employees}
        performanceData={performanceData || []}
      />
    </div>
  );
}
