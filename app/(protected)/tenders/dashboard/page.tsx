import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getDashboardData } from '@/lib/tenders/dashboard-service';
import DashboardNew from '@/components/tenders/dashboard/DashboardNew';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function TenderDashboardPage() {
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

  // Загружаем данные дашборда
  const dashboardData = await getDashboardData(companyId);

  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardNew
        initialData={dashboardData}
        companyId={companyId}
      />
    </Suspense>
  );
}
