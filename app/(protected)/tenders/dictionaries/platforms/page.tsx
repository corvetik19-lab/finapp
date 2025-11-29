import { Suspense } from "react";
import { getPlatforms, getPlatformsStats, getPlatformsTendersStats } from "@/lib/dictionaries/platforms-service";
import PlatformsPage from "@/components/dictionaries/PlatformsPage";

export const dynamic = "force-dynamic";

export default async function PlatformsPageRoute() {
  const [platforms, stats, tendersStats] = await Promise.all([
    getPlatforms(),
    getPlatformsStats(),
    getPlatformsTendersStats(),
  ]);

  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <PlatformsPage 
        initialPlatforms={platforms} 
        stats={stats} 
        tendersStats={tendersStats}
      />
    </Suspense>
  );
}
