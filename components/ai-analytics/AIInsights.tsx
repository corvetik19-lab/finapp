import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Lightbulb, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";

export type Insight = { id: string; type: "positive" | "warning" | "info"; title: string; text: string; };
export type AIInsightsProps = { insights: Insight[]; };

const insightIcons = { positive: Lightbulb, warning: AlertTriangle, info: TrendingUp };
const insightColors = { positive: "text-green-600 bg-green-50", warning: "text-yellow-600 bg-yellow-50", info: "text-blue-600 bg-blue-50" };

export default function AIInsights({ insights }: AIInsightsProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />AI Рекомендации</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const Icon = insightIcons[insight.type];
          return (
            <div key={insight.id} className="flex gap-3 p-3 rounded-lg border">
              <div className={cn("p-2 rounded-lg", insightColors[insight.type])}><Icon className="h-5 w-5" /></div>
              <div><div className="font-medium">{insight.title}</div><div className="text-sm text-muted-foreground">{insight.text}</div></div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
