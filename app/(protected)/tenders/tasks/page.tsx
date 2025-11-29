import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getTasksData, getEmployees, getTendersForTasks } from '@/lib/tenders/tasks-service';
import TasksClient from '@/components/tenders/tasks/TasksClient';

export const dynamic = 'force-dynamic';

function LoadingState() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #e2e8f0',
        borderTopColor: '#667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  );
}

export default async function TenderTasksPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Получаем company_id пользователя
  const { data: profiles } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1);

  const profile = profiles?.[0];
  const companyId = profile?.company_id;

  if (!companyId) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
        <h2>Компания не найдена</h2>
        <p>Пожалуйста, выберите или создайте компанию в настройках.</p>
      </div>
    );
  }

  // Загружаем данные параллельно
  const [tasksData, employees, tenders] = await Promise.all([
    getTasksData(companyId),
    getEmployees(companyId),
    getTendersForTasks(companyId),
  ]);

  return (
    <Suspense fallback={<LoadingState />}>
      <TasksClient
        initialData={tasksData}
        employees={employees}
        tenders={tenders}
        companyId={companyId}
        userId={user.id}
      />
    </Suspense>
  );
}
