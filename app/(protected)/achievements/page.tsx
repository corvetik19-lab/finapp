import { Suspense } from 'react';
import AchievementsClient from './AchievementsClient';

export const dynamic = 'force-dynamic';

export default function AchievementsPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <AchievementsClient />
    </Suspense>
  );
}
