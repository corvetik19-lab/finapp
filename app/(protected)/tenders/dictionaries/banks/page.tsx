import { Suspense } from "react";
import { getBanks, getBanksStats } from "@/lib/dictionaries/banks-service";
import BanksPage from "@/components/dictionaries/BanksPage";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Банки | Справочники",
  description: "Справочник банков для банковских гарантий и платежей",
};

function LoadingFallback() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default async function BanksPageRoute() {
  const [banks, stats] = await Promise.all([getBanks(), getBanksStats()]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <BanksPage initialBanks={banks} stats={stats} />
    </Suspense>
  );
}
