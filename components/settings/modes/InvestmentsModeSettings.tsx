"use client";

import type { FinanceSettings } from "@/types/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface InvestmentsModeSettingsProps {
  settings?: FinanceSettings | null;
}

export default function InvestmentsModeSettings({ settings }: InvestmentsModeSettingsProps) {
  const plannedFeatures = ["Брокерские счета", "Типы активов", "Стратегии", "Портфель"];

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Настройки режима «Инвестиции»</h1><p className="text-muted-foreground">Параметры для управления инвестиционным портфелем</p></div>

      <Card><CardHeader><CardTitle>Режим в разработке</CardTitle></CardHeader><CardContent>
        <p className="text-muted-foreground mb-4">Настройки режима «Инвестиции» будут доступны после завершения разработки.</p>
        <div className="grid grid-cols-2 gap-3">
          {plannedFeatures.map((feature) => <div key={feature} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"><Clock className="h-4 w-4 text-yellow-500" /><span>{feature}</span></div>)}
        </div>
      </CardContent></Card>

      {settings && <Card><CardHeader><CardTitle>Текущее состояние</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Базовые настройки сохранены.</p></CardContent></Card>}
    </div>
  );
}
