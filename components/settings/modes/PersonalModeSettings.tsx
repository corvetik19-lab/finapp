"use client";

import PlanSettingsManager from "../PlanSettingsManager";
import type { FinanceSettings } from "@/types/settings";
import type { PlanPresetRecord, PlanTypeRecord } from "../PlanSettingsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Settings, Flag } from "lucide-react";

interface PersonalModeSettingsProps {
  settings?: FinanceSettings | null;
  planTypes: PlanTypeRecord[];
  planPresets: PlanPresetRecord[];
}

export default function PersonalModeSettings({ settings, planTypes, planPresets }: PersonalModeSettingsProps) {
  const plannedFeatures = ["Личные цели", "Заметки", "Файлы"];
  
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Настройки режима «Личные»</h1><p className="text-muted-foreground">Параметры для личных целей и планов</p></div>

      <Tabs defaultValue="general">
        <TabsList><TabsTrigger value="general"><Settings className="h-4 w-4 mr-1" />Основные</TabsTrigger><TabsTrigger value="plans"><Flag className="h-4 w-4 mr-1" />Планы</TabsTrigger></TabsList>
        
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card><CardHeader><CardTitle>Режим в разработке</CardTitle></CardHeader><CardContent>
            <p className="text-muted-foreground mb-4">Настройки режима «Личные» будут доступны после завершения разработки.</p>
            <div className="grid grid-cols-3 gap-3">
              {plannedFeatures.map((feature) => <div key={feature} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"><Clock className="h-4 w-4 text-yellow-500" /><span>{feature}</span></div>)}
            </div>
          </CardContent></Card>
          {settings && <Card><CardHeader><CardTitle>Текущее состояние</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Базовые настройки сохранены.</p></CardContent></Card>}
        </TabsContent>
        
        <TabsContent value="plans" className="mt-4"><PlanSettingsManager planTypes={planTypes} planPresets={planPresets} /></TabsContent>
      </Tabs>
    </div>
  );
}
