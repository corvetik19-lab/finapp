import { Suspense } from "react";
import { ReconciliationPageClient } from "./reconciliation-client";

export const metadata = {
  title: "Акты сверки | Инвесторы",
};

export default function ReconciliationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Загрузка...</div>}>
      <ReconciliationPageClient />
    </Suspense>
  );
}
