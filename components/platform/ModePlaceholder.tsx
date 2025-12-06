"use client";

import { getModeConfig } from "@/lib/platform/mode-registry";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Star, Clock, CheckCircle, Bell, ArrowLeft, Wallet, TrendingUp, User, FileText, Settings, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  account_balance_wallet: Wallet,
  trending_up: TrendingUp,
  person: User,
  description: FileText,
  settings: Settings,
};

interface ModePlaceholderProps {
  modeKey: string;
}

export default function ModePlaceholder({ modeKey }: ModePlaceholderProps) {
  const mode = getModeConfig(modeKey);

  if (!mode) {
    return <div>Режим не найден</div>;
  }

  const features = [
    mode.features.ai && "AI-ассистент и умная аналитика",
    mode.features.analytics && "Детальная аналитика и отчёты",
    mode.features.exports && "Экспорт данных в различных форматах",
    mode.features.integrations && "Интеграции с внешними сервисами",
    mode.features.notifications && "Умные уведомления",
  ].filter(Boolean);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-lg w-full text-center">
        <CardContent className="pt-8 space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ background: `${mode.color}20` }}>
            {(() => { const Icon = ICON_MAP[mode.icon] || Settings; return <Icon className="h-12 w-12" style={{ color: mode.color }} />; })()}
          </div>
          <div><h1 className="text-2xl font-bold">{mode.name}</h1><p className="text-muted-foreground mt-2">{mode.description}</p></div>
          {mode.isPremium && <Badge className="gap-1"><Star className="h-3 w-3" />Premium функция</Badge>}
          <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Скоро появится</Badge>
          {features.length > 0 && (
            <div className="text-left"><h3 className="font-semibold mb-2">Планируемые возможности:</h3><ul className="space-y-2">{features.map((feature, index) => (<li key={index} className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" />{feature}</li>))}</ul></div>
          )}
          <div className="pt-4 border-t"><p className="text-sm text-muted-foreground mb-3">Хотите узнать первым?</p><Button><Bell className="h-4 w-4 mr-2" />Уведомить меня</Button></div>
          <Link href="/finance/dashboard" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Вернуться к финансам</Link>
        </CardContent>
      </Card>
    </div>
  );
}
