import { Suspense } from "react";
import { TemplatesPageClient } from "./templates-client";

export const metadata = {
  title: "Шаблоны договоров | Инвесторы",
};

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Загрузка...</div>}>
      <TemplatesPageClient />
    </Suspense>
  );
}
