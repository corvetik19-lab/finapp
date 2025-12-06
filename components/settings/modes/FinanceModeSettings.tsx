"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Settings2, CheckCircle2, AlertTriangle, FolderTree, Wallet, PiggyBank, Target, BarChart3, Sparkles, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  kind: string;
  parent_id: string | null;
}

interface FinanceModeSettingsProps {
  settings: Record<string, unknown>;
  categories: Category[];
}

export default function FinanceModeSettings({ settings, categories }: FinanceModeSettingsProps) {
  const [currency, setCurrency] = useState((settings.currency as string) || "RUB");
  const [dateFormat, setDateFormat] = useState((settings.date_format as string) || "DD.MM.YYYY");
  const [firstDayOfWeek, setFirstDayOfWeek] = useState((settings.first_day_of_week as number) || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/modes/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          date_format: dateFormat,
          first_day_of_week: firstDayOfWeek,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка сохранения настроек");
      }

      setMessage({ type: "success", text: "Настройки успешно сохранены" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Произошла ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Settings2 className="h-6 w-6" />Настройки режима Финансы</h1><p className="text-sm text-muted-foreground">Параметры финансового учёта</p></div>

      <div className="grid gap-6">
        {/* Основные настройки */}
        <Card><CardHeader><CardTitle>Основные настройки</CardTitle></CardHeader><CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1"><Label>Валюта по умолчанию</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="RUB">₽ Российский рубль (RUB)</SelectItem><SelectItem value="USD">$ Доллар США (USD)</SelectItem><SelectItem value="EUR">€ Евро (EUR)</SelectItem><SelectItem value="GBP">£ Фунт стерлингов (GBP)</SelectItem><SelectItem value="CNY">¥ Китайский юань (CNY)</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Формат даты</Label><Select value={dateFormat} onValueChange={setDateFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DD.MM.YYYY">ДД.ММ.ГГГГ (31.12.2025)</SelectItem><SelectItem value="MM/DD/YYYY">ММ/ДД/ГГГГ (12/31/2025)</SelectItem><SelectItem value="YYYY-MM-DD">ГГГГ-ММ-ДД (2025-12-31)</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Первый день недели</Label><Select value={String(firstDayOfWeek)} onValueChange={v => setFirstDayOfWeek(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Воскресенье</SelectItem><SelectItem value="1">Понедельник</SelectItem></SelectContent></Select></div>
            {message && <Alert className={message.type === 'success' ? 'border-green-500' : 'border-destructive'}>{message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4" />}<AlertDescription>{message.text}</AlertDescription></Alert>}
            <Button type="submit" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : 'Сохранить изменения'}</Button>
          </form>
        </CardContent></Card>

        {/* Категории */}
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FolderTree className="h-5 w-5" />Категории</CardTitle><CardDescription>Всего: {categories.length}</CardDescription></CardHeader><CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{categories.slice(0, 6).map(cat => <div key={cat.id} className="flex items-center gap-2 p-2 border rounded"><FolderTree className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{cat.name}</span><Badge variant="outline" className="ml-auto text-xs">{cat.kind === 'income' ? 'Доход' : cat.kind === 'expense' ? 'Расход' : 'Перевод'}</Badge></div>)}</div>
          {categories.length > 6 && <p className="text-sm text-muted-foreground mt-2">И ещё {categories.length - 6} категорий...</p>}
        </CardContent></Card>

        {/* Функции */}
        <Card><CardHeader><CardTitle>Доступные функции</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2 border rounded"><Wallet className="h-4 w-4 text-green-500" /><span className="text-sm">Транзакции</span></div>
            <div className="flex items-center gap-2 p-2 border rounded"><PiggyBank className="h-4 w-4 text-green-500" /><span className="text-sm">Счета</span></div>
            <div className="flex items-center gap-2 p-2 border rounded"><Target className="h-4 w-4 text-green-500" /><span className="text-sm">Бюджеты</span></div>
            <div className="flex items-center gap-2 p-2 border rounded"><Target className="h-4 w-4 text-green-500" /><span className="text-sm">Планы</span></div>
            <div className="flex items-center gap-2 p-2 border rounded"><BarChart3 className="h-4 w-4 text-green-500" /><span className="text-sm">Отчёты</span></div>
            <div className="flex items-center gap-2 p-2 border rounded"><Sparkles className="h-4 w-4 text-green-500" /><span className="text-sm">AI Аналитика</span></div>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
