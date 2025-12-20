"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, AlertTriangle, CheckCircle, Banknote, Calculator } from "lucide-react";

interface CashLimitData {
  current_limit: number;
  current_balance: number;
  avg_daily_revenue: number;
  collection_days: number;
  last_calculation_date: string;
  order_number?: string;
  order_date?: string;
}

interface Props {
  data: CashLimitData;
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);
const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function CashLimitPage({ data }: Props) {
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isSetOpen, setIsSetOpen] = useState(false);

  const usagePercent = data.current_limit > 0 ? (data.current_balance / data.current_limit) * 100 : 0;
  const isOverLimit = data.current_balance > data.current_limit;
  const remaining = data.current_limit - data.current_balance;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Лимит остатка кассы</h1>
          <p className="text-muted-foreground">Контроль лимита наличных денежных средств</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
            <DialogTrigger asChild><Button variant="outline"><Calculator className="h-4 w-4 mr-2" />Рассчитать</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Расчёт лимита кассы</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <Alert><AlertDescription>Лимит = Выручка × Период / Дни инкассации</AlertDescription></Alert>
                <div className="space-y-2"><Label>Среднедневная выручка</Label><Input type="number" defaultValue={(data.avg_daily_revenue / 100).toFixed(2)} /></div>
                <div className="space-y-2"><Label>Расчётный период (дней)</Label><Input type="number" defaultValue="92" /></div>
                <div className="space-y-2"><Label>Периодичность инкассации (дней)</Label><Input type="number" defaultValue={data.collection_days} /></div>
                <div className="p-3 bg-muted rounded-lg"><div className="text-sm text-muted-foreground">Рассчитанный лимит</div><div className="text-2xl font-bold">{formatMoney(data.avg_daily_revenue * 92 / data.collection_days)} ₽</div></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCalcOpen(false)}>Закрыть</Button>
                  <Button onClick={() => setIsCalcOpen(false)}>Применить</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isSetOpen} onOpenChange={setIsSetOpen}>
            <DialogTrigger asChild><Button><Settings className="h-4 w-4 mr-2" />Установить лимит</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Установка лимита кассы</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Лимит остатка кассы</Label><Input type="number" defaultValue={(data.current_limit / 100).toFixed(2)} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>№ приказа</Label><Input placeholder="№" defaultValue={data.order_number} /></div>
                  <div className="space-y-2"><Label>Дата приказа</Label><Input type="date" /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSetOpen(false)}>Отмена</Button>
                  <Button onClick={() => setIsSetOpen(false)}>Сохранить</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isOverLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Превышен лимит остатка кассы! Необходимо сдать наличные в банк.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Banknote className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Установленный лимит</div><div className="text-2xl font-bold">{formatMoney(data.current_limit)} ₽</div></div></div></CardContent></Card>
        <Card className={isOverLimit ? "border-red-200 bg-red-50" : ""}><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Текущий остаток</div><div className={`text-2xl font-bold ${isOverLimit ? "text-red-600" : ""}`}>{formatMoney(data.current_balance)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1">{isOverLimit ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle className="h-3 w-3 text-emerald-500" />}{isOverLimit ? "Превышение" : "Свободно"}</div><div className={`text-2xl font-bold ${isOverLimit ? "text-red-600" : "text-emerald-600"}`}>{formatMoney(Math.abs(remaining))} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Использовано</div><div className="text-2xl font-bold">{usagePercent.toFixed(0)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Заполненность лимита</span><span className="text-sm font-medium">{formatMoney(data.current_balance)} / {formatMoney(data.current_limit)} ₽</span></div>
          <Progress value={Math.min(usagePercent, 100)} className={`h-4 ${isOverLimit ? "[&>div]:bg-red-500" : ""}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Параметры расчёта</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Среднедневная выручка</span><span className="font-mono">{formatMoney(data.avg_daily_revenue)} ₽</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Периодичность инкассации</span><span>{data.collection_days} дн.</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Дата последнего расчёта</span><span>{formatDate(data.last_calculation_date)}</span></div>
            </div>
            <div className="space-y-3">
              {data.order_number && <div className="flex justify-between"><span className="text-muted-foreground">№ приказа</span><span>{data.order_number}</span></div>}
              {data.order_date && <div className="flex justify-between"><span className="text-muted-foreground">Дата приказа</span><span>{formatDate(data.order_date)}</span></div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
