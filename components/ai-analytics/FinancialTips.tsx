import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export type Tip = { id: string; icon: string; title: string; text: string; };
export type FinancialTipsProps = { tips: Tip[]; };

export default function FinancialTips({ tips }: FinancialTipsProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Финансовые советы</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip) => (
          <div key={tip.id} className="flex gap-3 p-3 rounded-lg border">
            <div className="text-2xl">{tip.icon}</div>
            <div><div className="font-medium">{tip.title}</div><div className="text-sm text-muted-foreground">{tip.text}</div></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
