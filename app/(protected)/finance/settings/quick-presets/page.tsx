import { Suspense } from "react";
import { QuickPresetsManager } from "@/components/quick-presets/QuickPresetsManager";

export const metadata = {
  title: "Быстрые транзакции — FinApp",
  description: "Управление быстрыми пресетами для мгновенного добавления транзакций",
};

export default function QuickPresetsPage() {
  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Быстрые транзакции</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Настройте пресеты для мгновенного добавления часто повторяющихся транзакций одним кликом.
      </p>
      <Suspense fallback={<div>Загрузка...</div>}>
        <QuickPresetsManager />
      </Suspense>
    </div>
  );
}
