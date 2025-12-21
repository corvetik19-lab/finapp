import { Suspense } from "react";
import { getInvestments, getSources } from "@/lib/investors/service";
import { InvestorAnalyticsClient } from "./analytics-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function InvestorAnalyticsPage() {
  const [investments, sources] = await Promise.all([
    getInvestments(),
    getSources(),
  ]);

  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <InvestorAnalyticsClient investments={investments} sources={sources} />
    </Suspense>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
