import { Suspense } from 'react';
import { TendersListClient } from './tenders-list-client';
import { getTenderStages, getTenderTypes } from '@/lib/tenders/service';
import styles from '../tenders.module.css';

export const dynamic = 'force-dynamic';

export default async function TendersListPage() {
  // Загружаем справочники для фильтров
  const [stagesResult, typesResult] = await Promise.all([
    getTenderStages(),
    getTenderTypes(),
  ]);

  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Реестр тендеров</h1>
        <p className={styles.pageDescription}>
          Полный список и управление тендерными заявками
        </p>
      </div>

      <Suspense
        fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '2rem' }}>⏳ Загрузка...</div>
          </div>
        }
      >
        <TendersListClient
          stages={stagesResult.data || []}
          types={typesResult.data || []}
        />
      </Suspense>
    </div>
  );
}
