"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowRightLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

type OperationType = "purchase" | "sale" | "conversion";

interface CurrencyOperation {
  id: string;
  date: string;
  operation_type: OperationType;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  commission: number;
  bank_name: string;
}

interface Props {
  operations: CurrencyOperation[];
  exchangeRates: Record<string, number>;
}

const typeLabels: Record<OperationType, string> = {
  purchase: "Покупка валюты",
  sale: "Продажа валюты",
  conversion: "Конвертация",
};

const formatMoney = (a: number, currency = "RUB") => 
  new Intl.NumberFormat("ru-RU", { style: "currency", currency, minimumFractionDigits: 2 }).format(a / 100);

const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function CurrencyOperationsPage({ operations, exchangeRates }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const totalPurchased = operations.filter(o => o.operation_type === "purchase").reduce((sum, o) => sum + o.to_amount, 0);
  const totalSold = operations.filter(o => o.operation_type === "sale").reduce((sum, o) => sum + o.from_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Валютные операции</h1>
          <p className="text-muted-foreground">Покупка, продажа и конвертация валюты</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Новая операция</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Валютная операция</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Тип операции</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Исходная валюта</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Валюта" /></SelectTrigger>
                    <SelectContent><SelectItem value="RUB">RUB</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="CNY">CNY</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Целевая валюта</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Валюта" /></SelectTrigger>
                    <SelectContent><SelectItem value="RUB">RUB</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="CNY">CNY</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Сумма</Label><Input type="number" /></div>
                <div className="space-y-2"><Label>Курс</Label><Input type="number" step="0.0001" /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
                <Button onClick={() => setIsOpen(false)}>Создать</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><DollarSign className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Операций</div><div className="text-2xl font-bold">{operations.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" />Куплено валюты</div><div className="text-2xl font-bold text-emerald-600">{formatMoney(totalPurchased, "USD")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" />Продано валюты</div><div className="text-2xl font-bold text-red-600">{formatMoney(totalSold, "USD")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Курс USD/RUB</div><div className="text-2xl font-bold">{exchangeRates?.USD_RUB?.toFixed(2) || "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" />История операций</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Тип</TableHead><TableHead>Из</TableHead><TableHead>В</TableHead><TableHead className="text-right">Курс</TableHead><TableHead>Банк</TableHead></TableRow></TableHeader>
            <TableBody>
              {operations.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{formatDate(o.date)}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[o.operation_type]}</Badge></TableCell>
                  <TableCell className="font-mono">{formatMoney(o.from_amount, o.from_currency)}</TableCell>
                  <TableCell className="font-mono">{formatMoney(o.to_amount, o.to_currency)}</TableCell>
                  <TableCell className="text-right">{o.exchange_rate.toFixed(4)}</TableCell>
                  <TableCell className="text-muted-foreground">{o.bank_name}</TableCell>
                </TableRow>
              ))}
              {operations.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Нет операций</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
