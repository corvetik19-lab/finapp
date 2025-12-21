"use client";

import { OneCIntegration } from "@/components/suppliers/integrations/OneCIntegration";

export default function OneCIntegrationPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Интеграция с 1С</h1>
        <p className="text-muted-foreground">
          Синхронизация контрагентов между системой и 1С: Предприятие
        </p>
      </div>

      <OneCIntegration />
    </div>
  );
}
