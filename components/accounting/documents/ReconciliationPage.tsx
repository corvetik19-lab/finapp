"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  FileText,
  CheckCircle,
  Send,
  Eye,
  Loader2,
  Download,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import {
  generateReconciliationAct,
  saveReconciliationAct,
  type ReconciliationAct,
} from "@/lib/accounting/documents/reconciliation-act";
import type { AccountingCounterparty } from "@/lib/accounting/types";

interface ReconciliationPageProps {
  acts: ReconciliationAct[];
  counterparties: AccountingCounterparty[];
}

function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  }).format(kopeks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Черновик", variant: "outline" },
    sent: { label: "Отправлен", variant: "secondary" },
    confirmed: { label: "Подтверждён", variant: "default" },
    disputed: { label: "Расхождения", variant: "destructive" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function ReconciliationPage({ acts, counterparties }: ReconciliationPageProps) {
  const { show } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewAct, setPreviewAct] = useState<ReconciliationAct | null>(null);
  
  const today = new Date();
  const firstDayOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const lastDayOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);
  
  const [formData, setFormData] = useState({
    counterpartyId: "",
    periodStart: firstDayOfQuarter.toISOString().split("T")[0],
    periodEnd: lastDayOfQuarter.toISOString().split("T")[0],
    openingDebit: "",
    openingCredit: "",
  });

  const handleGenerate = async () => {
    if (!formData.counterpartyId) {
      show("Выберите контрагента", { type: "error" });
      return;
    }
    
    setGenerating(true);
    try {
      const openingDebit = formData.openingDebit ? Math.round(parseFloat(formData.openingDebit) * 100) : 0;
      const openingCredit = formData.openingCredit ? Math.round(parseFloat(formData.openingCredit) * 100) : 0;
      
      const act = await generateReconciliationAct(
        formData.counterpartyId,
        formData.periodStart,
        formData.periodEnd,
        openingDebit,
        openingCredit
      );
      
      if (act) {
        setPreviewAct(act);
        setIsCreateOpen(false);
      } else {
        show("Ошибка генерации акта", { type: "error" });
      }
    } catch (error) {
      show("Ошибка при генерации", { type: "error" });
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!previewAct) return;
    
    try {
      const result = await saveReconciliationAct(previewAct);
      if (result.success) {
        show("Акт сверки сохранён", { type: "success" });
        setPreviewAct(null);
        window.location.reload();
      } else {
        show(result.error || "Ошибка сохранения", { type: "error" });
      }
    } catch (error) {
      show("Ошибка при сохранении", { type: "error" });
      console.error(error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Акты сверки
            </h1>
            <p className="text-muted-foreground">
              Сверка взаиморасчётов с контрагентами
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать акт
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать акт сверки</DialogTitle>
              <DialogDescription>
                Выберите контрагента и период для сверки
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Контрагент *</Label>
                <Select
                  value={formData.counterpartyId}
                  onValueChange={v => setFormData({ ...formData, counterpartyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите контрагента" />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties.map(cp => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.short_name || cp.name}
                        {cp.inn && <span className="text-muted-foreground ml-2">ИНН: {cp.inn}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Период с</Label>
                  <Input
                    type="date"
                    value={formData.periodStart}
                    onChange={e => setFormData({ ...formData, periodStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Период по</Label>
                  <Input
                    type="date"
                    value={formData.periodEnd}
                    onChange={e => setFormData({ ...formData, periodEnd: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Входящее сальдо (мы должны)</Label>
                  <Input
                    type="text"
                    value={formData.openingDebit}
                    onChange={e => setFormData({ ...formData, openingDebit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Входящее сальдо (нам должны)</Label>
                  <Input
                    type="text"
                    value={formData.openingCredit}
                    onChange={e => setFormData({ ...formData, openingCredit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  "Сформировать акт"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview Act */}
      {previewAct && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Предпросмотр акта сверки</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewAct(null)}>
                  Отмена
                </Button>
                <Button onClick={handleSave}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Сохранить
                </Button>
              </div>
            </div>
            <CardDescription>
              {previewAct.counterparty_name} • {formatDate(previewAct.period_start)} — {formatDate(previewAct.period_end)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Сальдо */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Входящее сальдо</p>
                <p className="font-medium">
                  {previewAct.opening_balance_credit > 0 
                    ? `Нам должны: ${formatMoney(previewAct.opening_balance_credit)}`
                    : previewAct.opening_balance_debit > 0
                    ? `Мы должны: ${formatMoney(previewAct.opening_balance_debit)}`
                    : "0.00 ₽"
                  }
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Обороты</p>
                <p className="font-medium">
                  Дебет: {formatMoney(previewAct.turnover_debit)} / Кредит: {formatMoney(previewAct.turnover_credit)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-primary">Исходящее сальдо</p>
                <p className="font-bold text-primary">
                  {previewAct.closing_balance_credit > 0 
                    ? `Нам должны: ${formatMoney(previewAct.closing_balance_credit)}`
                    : previewAct.closing_balance_debit > 0
                    ? `Мы должны: ${formatMoney(previewAct.closing_balance_debit)}`
                    : "0.00 ₽"
                  }
                </p>
              </div>
            </div>

            {/* Операции */}
            {previewAct.operations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Документ</TableHead>
                    <TableHead className="text-right">Дебет</TableHead>
                    <TableHead className="text-right">Кредит</TableHead>
                    <TableHead className="text-right">Сальдо</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewAct.operations.map((op, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{formatDate(op.date)}</TableCell>
                      <TableCell>{op.description}</TableCell>
                      <TableCell className="text-right">
                        {op.debit > 0 ? formatMoney(op.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {op.credit > 0 ? formatMoney(op.credit) : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${op.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMoney(Math.abs(op.balance))}
                        {op.balance >= 0 ? " (нам)" : " (мы)"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Нет операций за выбранный период
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* List of Acts */}
      <Card>
        <CardHeader>
          <CardTitle>Акты сверки</CardTitle>
          <CardDescription>
            Всего {acts.length} актов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead className="text-right">Сальдо</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acts.map(act => (
                  <TableRow key={act.id}>
                    <TableCell>{formatDate(act.created_at)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{act.counterparty_name}</p>
                        {act.counterparty_inn && (
                          <p className="text-xs text-muted-foreground">ИНН: {act.counterparty_inn}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(act.period_start)} — {formatDate(act.period_end)}
                    </TableCell>
                    <TableCell className="text-right">
                      {act.closing_balance_credit > 0 ? (
                        <span className="text-green-600 font-medium">
                          +{formatMoney(act.closing_balance_credit)}
                        </span>
                      ) : act.closing_balance_debit > 0 ? (
                        <span className="text-red-600 font-medium">
                          -{formatMoney(act.closing_balance_debit)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0.00 ₽</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(act.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет актов сверки</p>
              <p className="text-sm mt-2">
                Создайте первый акт сверки с контрагентом
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
