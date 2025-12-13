import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentCompanyId } from '@/lib/platform/organization';
import { Target } from 'lucide-react';
import { SprintsClient } from '@/components/team/sprints/SprintsClient';

export const dynamic = 'force-dynamic';

export default async function SprintsPage() {
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

  // Get sprints
  const { data: sprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Спринты
        </h1>
        <p className="text-muted-foreground mt-1">
          Agile планирование для тендеров
        </p>
      </div>

      {/* Sprints Client */}
      <SprintsClient
        companyId={companyId}
        userId={user.id}
        initialSprints={sprints || []}
      />
    </div>
  );
}
