import { Suspense } from "react";
import { getGuarantees, getGuaranteeStats } from "@/lib/investors/guarantees";
import { GuaranteesClient } from "./guarantees-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function GuaranteesPage() {
  const [guarantees, stats] = await Promise.all([
    getGuarantees(),
    getGuaranteeStats(),
  ]);

  return (
    <Suspense fallback={<GuaranteesSkeleton />}>
      <GuaranteesClient initialGuarantees={guarantees} stats={stats} />
    </Suspense>
  );
}

function GuaranteesSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
