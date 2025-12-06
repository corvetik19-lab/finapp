"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Building, RefreshCw, Play, CheckCircle, AlertTriangle, ArrowRight, Loader2, Calendar } from "lucide-react";

interface PaymentResult {
  success: boolean;
  totalCreated: number;
  details: {
    creditCards: {
      success: boolean;
      count: number;
      error: string | null;
    };
    loans: {
      success: boolean;
      count: number;
      error: string | null;
    };
  };
  message: string;
}

export default function AutoPaymentsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAutoPayments = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/cron/auto-payments", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при создании платежей");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><RefreshCw className="h-6 w-6" />Автоматические платежи</h1><p className="text-muted-foreground">Напоминания о платежах по кредитам и картам</p></div>

      <Card><CardHeader><CardTitle>Как это работает?</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex items-start gap-3"><CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" /><div><strong>Кредитные карты:</strong> платёж за 10 дней до срока при задолженности</div></div>
        <div className="flex items-start gap-3"><Building className="h-5 w-5 text-muted-foreground mt-0.5" /><div><strong>Кредиты:</strong> платёж за 10 дней до следующей даты</div></div>
        <div className="flex items-start gap-3"><Calendar className="h-5 w-5 text-muted-foreground mt-0.5" /><div><strong>Автозапуск:</strong> ежедневно в 12:00 МСК</div></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Ручной запуск</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground mb-4">Проверить и создать платежи прямо сейчас</p><Button onClick={handleRunAutoPayments} disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Проверка...</> : <><Play className="h-4 w-4 mr-2" />Запустить</>}</Button></CardContent></Card>

      {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {result && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2">{result.success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-yellow-500" />}{result.success ? "Успешно!" : "Выполнено с ошибками"}</CardTitle></CardHeader><CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{result.message}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border"><CreditCard className="h-5 w-5" /><div><strong>Кред. карты</strong><p className="text-sm">{result.details.creditCards.success ? `Создано: ${result.details.creditCards.count}` : <span className="text-destructive">{result.details.creditCards.error}</span>}</p></div></div>
            <div className="flex items-start gap-3 p-3 rounded-lg border"><Building className="h-5 w-5" /><div><strong>Кредиты</strong><p className="text-sm">{result.details.loans.success ? `Создано: ${result.details.loans.count}` : <span className="text-destructive">{result.details.loans.error}</span>}</p></div></div>
          </div>
          <Badge variant="outline" className="text-lg"><Calendar className="h-4 w-4 mr-2" />Всего создано: {result.totalCreated}</Badge>
        </CardContent></Card>
      )}

      <Card><CardHeader><CardTitle>Проверка настроек</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground mb-3">Убедитесь, что:</p><ol className="list-decimal list-inside text-sm space-y-1"><li>Применена миграция <code className="bg-muted px-1 rounded">20251005_auto_create_loan_payments.sql</code></li><li>У кредитов установлена дата платежа</li><li>У карт заполнена дата и есть задолженность</li><li>До даты платежа не более 10 дней</li></ol></CardContent></Card>

      <div className="flex gap-4"><Button variant="outline" asChild><a href="/payments"><ArrowRight className="h-4 w-4 mr-2" />Платежи</a></Button><Button variant="outline" asChild><a href="/loans"><ArrowRight className="h-4 w-4 mr-2" />Кредиты</a></Button></div>
    </div>
  );
}
