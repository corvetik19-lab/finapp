'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { TenderHeader } from '@/components/tenders/tender-header';
import { TenderDetailTabs } from '@/components/tenders/tender-detail-tabs';
import type { Tender, TenderType, TenderStageTemplate, TenderStage } from '@/lib/tenders/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface TenderDetailClientProps {
  tender: Tender;
  stages: TenderStage[];
  types?: TenderType[];
  templates?: TenderStageTemplate[];
  employees?: Array<{ id: string; full_name: string; role?: string }>;
}

const ARCHIVED_STAGE_NAMES = [
  'Не участвуем',
  'Не прошло проверку',
  'Не подано',
  'Проиграли',
  'Договор не заключен',
];

const normalizeStageName = (name?: string | null) => (name || '').trim().toLowerCase();

export function TenderDetailClient({ tender, stages, types = [], templates = [], employees = [] }: TenderDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRegistry = searchParams.get('from') === 'registry';

  const isArchivedStage = ARCHIVED_STAGE_NAMES
    .map(name => normalizeStageName(name))
    .includes(normalizeStageName(tender.stage?.name));

  const handleBack = () => {
    if (fromRegistry) {
      router.push('/tenders/list');
    } else {
      router.push('/tenders/department');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-1" />{fromRegistry ? 'Назад в реестр' : 'Назад к этапам'}</Button>
      {!isArchivedStage && <Card><CardContent className="pt-6"><TenderHeader tender={tender} /></CardContent></Card>}
      <TenderDetailTabs tender={tender} stages={stages} types={types} templates={templates} employees={employees} onUpdate={() => router.refresh()} />
    </div>
  );
}
