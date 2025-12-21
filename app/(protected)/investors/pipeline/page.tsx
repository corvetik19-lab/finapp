import { Suspense } from "react";
import { getInvestments } from "@/lib/investors/service";
import { InvestmentsPipelineClient } from "./pipeline-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function InvestmentsPipelinePage() {
  const investments = await getInvestments();

  return (
    <Suspense fallback={<PipelineSkeleton />}>
      <InvestmentsPipelineClient initialInvestments={investments} />
    </Suspense>
  );
}

function PipelineSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    </div>
  );
}
