"use client";

import { EDOIntegration } from "@/components/suppliers/integrations/EDOIntegration";

export default function EDOIntegrationPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ЭДО провайдеры</h1>
        <p className="text-muted-foreground">
          Интеграция с системами электронного документооборота
        </p>
      </div>

      <EDOIntegration />
    </div>
  );
}
