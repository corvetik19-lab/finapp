"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, CheckCircle } from "lucide-react";

type Anomaly = { id: string; type: "expense" | "income"; category: string; amount: number; averageAmount: number; percentageChange: number; description: string; severity: "low" | "medium" | "high"; };
type Props = { anomalies: Anomaly[]; };

export default function AnomaliesDetection({ anomalies }: Props) {
  if (!anomalies || anomalies.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Детекция аномалий</CardTitle></CardHeader>
        <CardContent className="text-center py-8"><CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" /><p className="font-medium">Необычных трат не обнаружено</p><p className="text-sm text-muted-foreground">AI постоянно мониторит ваши финансы</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Обнаружены аномалии</CardTitle><Badge variant="secondary">{anomalies.length} {getAnomalyWord(anomalies.length)}</Badge></CardHeader>
      <CardContent className="space-y-4">
        {anomalies.map((anomaly) => (
          <div key={anomaly.id} className={cn("p-4 rounded-lg border", anomaly.severity === "high" ? "border-red-500 bg-red-50" : anomaly.severity === "medium" ? "border-yellow-500 bg-yellow-50" : "border-blue-300 bg-blue-50")}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2"><span className="text-xl">{getSeverityIcon(anomaly.severity)}</span><div><div className="font-medium">{anomaly.category}</div><div className="text-xs text-muted-foreground">{anomaly.type === "expense" ? "Расход" : "Доход"}</div></div></div>
              <div className="text-lg font-bold">{anomaly.percentageChange > 0 ? "+" : ""}{anomaly.percentageChange.toFixed(0)}%</div>
            </div>
            <p className="text-sm mb-3">{anomaly.description}</p>
            <div className="flex gap-4 text-sm"><div><span className="text-muted-foreground">Текущая:</span> <span className="font-medium">{anomaly.amount.toLocaleString('ru-RU')}₽</span></div><div><span className="text-muted-foreground">Средняя:</span> <span className="font-medium">{anomaly.averageAmount.toLocaleString('ru-RU')}₽</span></div></div>
            <div className="mt-2"><Badge variant={anomaly.severity === "high" ? "destructive" : anomaly.severity === "medium" ? "default" : "secondary"}>{getSeverityText(anomaly.severity)}</Badge></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "high":
      return "🚨";
    case "medium":
      return "⚠️";
    case "low":
      return "ℹ️";
    default:
      return "📊";
  }
}

function getSeverityText(severity: string): string {
  switch (severity) {
    case "high":
      return "Высокая важность";
    case "medium":
      return "Средняя важность";
    case "low":
      return "Низкая важность";
    default:
      return "Информация";
  }
}

function getAnomalyWord(count: number): string {
  if (count === 1) return "аномалия";
  if (count >= 2 && count <= 4) return "аномалии";
  return "аномалий";
}
