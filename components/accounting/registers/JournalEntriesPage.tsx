"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, RefreshCw, FileText, RotateCcw } from "lucide-react";
import { JournalEntry } from "@/lib/accounting/registers/types";
import { getJournalEntries } from "@/lib/accounting/registers/service";

interface JournalEntriesPageProps {
  initialEntries: JournalEntry[];
  initialStartDate: string;
  initialEndDate: string;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

export function JournalEntriesPage({
  initialEntries,
  initialStartDate,
  initialEndDate,
}: JournalEntriesPageProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const newEntries = await getJournalEntries({
        startDate,
        endDate,
      });
      setEntries(newEntries);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDebit = entries.reduce((sum, e) => sum + e.debit_amount, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Журнал проводок</h1>
          <p className="text-muted-foreground">
            Бухгалтерские проводки за период
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Новая проводка
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Создать проводку</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-2">
                  <Label>Сумма</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Дебет (счёт)</Label>
                  <Input placeholder="51" />
                </div>
                <div className="space-y-2">
                  <Label>Кредит (счёт)</Label>
                  <Input placeholder="62" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input placeholder="Содержание операции..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Создать
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Период:</span>
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px]"
            />
            <Button onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Всего проводок</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Оборот по дебету</div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(totalDebit)} ₽
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Оборот по кредиту</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatMoney(totalCredit)} ₽
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Проводки
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">№</TableHead>
                <TableHead className="w-[100px]">Дата</TableHead>
                <TableHead className="w-[80px]">Дебет</TableHead>
                <TableHead className="w-[80px]">Кредит</TableHead>
                <TableHead className="text-right w-[120px]">Сумма</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className={entry.is_reversed ? "opacity-50" : ""}>
                  <TableCell className="font-mono">{entry.entry_number}</TableCell>
                  <TableCell>{formatDate(entry.entry_date)}</TableCell>
                  <TableCell className="font-mono">
                    {(entry as JournalEntry & { debit_account?: { account_code: string } }).debit_account?.account_code || "—"}
                  </TableCell>
                  <TableCell className="font-mono">
                    {(entry as JournalEntry & { credit_account?: { account_code: string } }).credit_account?.account_code || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(entry.debit_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {entry.is_reversed && (
                        <Badge variant="destructive" className="text-xs">
                          СТОРНО
                        </Badge>
                      )}
                      <span className="truncate max-w-[300px]">
                        {entry.description || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {!entry.is_reversed && (
                      <Button variant="ghost" size="sm" title="Сторнировать">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет проводок за выбранный период</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
