import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTenderById } from "@/lib/tenders/service";
import { TenderFinancingClient } from "./financing-client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TenderFinancingPage({ params }: Props) {
  const { id } = await params;
  const { data: tender } = await getTenderById(id);

  if (!tender) {
    notFound();
  }

  return (
    <Suspense fallback={<FinancingPageSkeleton />}>
      <TenderFinancingClient tender={tender} />
    </Suspense>
  );
}

function FinancingPageSkeleton() {
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
