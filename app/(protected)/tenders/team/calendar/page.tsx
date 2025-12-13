import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentCompanyId } from '@/lib/platform/organization';
import { CalendarDays } from 'lucide-react';
import { CalendarClient } from '@/components/team/calendar/CalendarClient';

export const dynamic = 'force-dynamic';

export default async function TeamCalendarPage() {
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

  // Get calendar events
  const { data: events } = await supabase
    .from('team_calendar_events')
    .select('*')
    .eq('company_id', companyId)
    .order('start_at', { ascending: true });

  // Get sprints for sync
  const { data: sprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['active', 'planning', 'review'])
    .order('start_date', { ascending: true });

  // Get workload allocations for sync
  const { data: workloadAllocations } = await supabase
    .from('workload_allocations')
    .select('*')
    .eq('company_id', companyId)
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('start_date', { ascending: true });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Календарь занятости
        </h1>
        <p className="text-muted-foreground mt-1">
          Планирование времени команды (синхронизировано со спринтами и загрузкой)
        </p>
      </div>

      {/* Calendar Client */}
      <CalendarClient
        companyId={companyId}
        userId={user.id}
        initialEvents={events || []}
        sprints={sprints || []}
        workloadAllocations={workloadAllocations || []}
      />
    </div>
  );
}
