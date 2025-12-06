import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { TendersListClient } from './tenders-list-client';
import { getTenderStages, getTenderTypes } from '@/lib/tenders/service';
import { createRSCClient } from '@/lib/supabase/helpers';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TendersListPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

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
  
  const companyId = profiles?.[0]?.company_id || null;

  if (!companyId) {
    return <div className="p-6"><p className="text-muted-foreground">Компания не найдена.</p></div>;
  }

  // Загружаем справочники для фильтров
  const [stagesResult, typesResult] = await Promise.all([
    getTenderStages(companyId),
    getTenderTypes(companyId),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Реестр тендеров</h1><p className="text-muted-foreground">Полный список и управление</p></div>
      <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <TendersListClient stages={stagesResult.data || []} types={typesResult.data || []} companyId={companyId} />
      </Suspense>
    </div>
  );
}
