"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, RefreshCw, CheckCircle, Circle } from "lucide-react";

type TourStatus = {
  dashboard: boolean;
  transactions: boolean;
  reports: boolean;
  plans: boolean;
  settings: boolean;
  loans: boolean;
  cards: boolean;
};

const TOUR_LABELS: Record<keyof TourStatus, string> = {
  dashboard: "Дашборд",
  transactions: "Транзакции",
  reports: "Отчёты",
  plans: "Планы и цели",
  settings: "Настройки",
  loans: "Кредиты",
  cards: "Кредитные карты",
};

const DEFAULT_TOUR_STATUS: TourStatus = {
  dashboard: false,
  transactions: false,
  reports: false,
  plans: false,
  settings: false,
  loans: false,
  cards: false,
};

export default function TourManager() {
  const [enabled, setEnabled] = useState(true);
  const [completedTours, setCompletedTours] = useState<TourStatus>(DEFAULT_TOUR_STATUS);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadTourSettings = async () => {
      try {
        const response = await fetch("/api/settings/tour");
        if (response.ok) {
          const data = await response.json();
          setEnabled(data.enabled ?? true);
          setCompletedTours(data.completedTours ?? DEFAULT_TOUR_STATUS);
        }
      } catch (error) {
        console.error("Error loading tour settings:", error);
      }
    };

    loadTourSettings();
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          completedTours,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      setMessage({ type: "success", text: "Настройки тура успешно сохранены" });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Не удалось сохранить настройки" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetAllTours = () => {
    const resetTours = Object.keys(DEFAULT_TOUR_STATUS).reduce((acc, key) => {
      acc[key as keyof TourStatus] = false;
      return acc;
    }, {} as TourStatus);

    setCompletedTours(resetTours);
    setMessage({ type: "success", text: "Прогресс туров сброшен" });
  };

  const toggleTour = (tourKey: keyof TourStatus) => {
    setCompletedTours((prev) => ({
      ...prev,
      [tourKey]: !prev[tourKey],
    }));
  };

  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Управление туром</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div><div className="font-medium">Включить туры</div><div className="text-sm text-muted-foreground">Интерактивные подсказки при входе на новые страницы</div></div>
          <Switch checked={enabled} onCheckedChange={async (v) => { setEnabled(v); try { await fetch("/api/settings/tour", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: v, completedTours }) }); setMessage({ type: "success", text: v ? "Туры включены" : "Туры отключены" }); } catch { setMessage({ type: "error", text: "Не удалось сохранить" }); } }} />
        </div>
        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={isSaving}><Save className="h-4 w-4 mr-2" />{isSaving ? "Сохранение..." : "Сохранить"}</Button>
          <Button variant="outline" onClick={resetAllTours}><RefreshCw className="h-4 w-4 mr-2" />Сбросить все</Button>
        </div>
        {message && <Alert variant={message.type === "error" ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert>}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Статус туров</CardTitle></CardHeader><CardContent className="space-y-2">
        {(Object.keys(TOUR_LABELS) as Array<keyof TourStatus>).map((tourKey) => (
          <div key={tourKey} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {completedTours[tourKey] ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              <div><div className="font-medium">{TOUR_LABELS[tourKey]}</div><div className="text-xs text-muted-foreground">{completedTours[tourKey] ? "Пройден" : "Не пройден"}</div></div>
            </div>
            <Button size="sm" variant="outline" onClick={() => toggleTour(tourKey)}>{completedTours[tourKey] ? "Показать" : "Пройден"}</Button>
          </div>
        ))}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>О турах</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Интерактивные туры</strong> помогают освоить приложение.</p>
        <p>При первом посещении разделов запускаются подсказки.</p>
        <ul className="list-disc list-inside"><li>Отключить туры полностью</li><li>Сбросить прогресс</li><li>Управлять отдельными турами</li></ul>
      </CardContent></Card>
    </div>
  );
}
