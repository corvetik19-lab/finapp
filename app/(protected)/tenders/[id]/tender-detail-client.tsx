'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { TenderHeader } from '@/components/tenders/tender-header';
import { TenderDetailTabs } from '@/components/tenders/tender-detail-tabs';
import type { Tender, TenderType, TenderStageTemplate } from '@/lib/tenders/types';
import styles from './tender-detail.module.css';

interface TenderDetailClientProps {
  tender: Tender;
  stages?: never;
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

export function TenderDetailClient({ tender, types = [], templates = [], employees = [] }: TenderDetailClientProps) {
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
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
          >
            ← {fromRegistry ? 'Назад в реестр тендеров' : 'Назад к этапам'}
          </button>
        </div>

        {!isArchivedStage && (
          <div className={styles.card}>
            <TenderHeader tender={tender} />
          </div>
        )}

        <div className={styles.tabsWrapper}>
          <TenderDetailTabs
            tender={tender}
            types={types}
            templates={templates}
            employees={employees}
            onUpdate={() => router.refresh()}
          />
        </div>
      </div>
    </div>
  );
}
