"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, CheckCircle, AlertTriangle, TrendingUp
} from "lucide-react";
import type { Investment, InvestmentTransaction, ReturnScheduleItem } from "@/lib/investors/types";
import { INVESTMENT_STATUS_LABELS, INTEREST_TYPE_LABELS } from "@/lib/investors/types";
import { formatMoney } from "@/lib/investors/calculations";
import { updateInvestment, deleteInvestment, createTransaction } from "@/lib/investors/service";
import { useToast } from "@/components/toast/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  investment: Investment;
  transactions: InvestmentTransaction[];
  schedule: ReturnScheduleItem[];
}

export function InvestmentDetailsClient({ investment, transactions, schedule }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [returnForm, setReturnForm] = useState({
    principal: "",
    interest: "",
    date: new Date().toISOString().split("T")[0],
    documentNumber: "",
  });

  const [receiptForm, setReceiptForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    documentNumber: "",
  });

  // Расчёты
  const remainingPrincipal = investment.approved_amount - investment.returned_principal;
  const remainingInterest = investment.interest_amount - investment.returned_interest;
  const totalRemaining = remainingPrincipal + remainingInterest;
  const paidPercent = investment.total_return_amount > 0
    ? ((investment.returned_principal + investment.returned_interest) / investment.total_return_amount) * 100
    : 0;

  const today = new Date();
  const dueDate = new Date(investment.due_date);
  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  const isOverdue = daysLeft < 0 && investment.status !== "completed";

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary", requested: "outline", approved: "default", received: "default",
    in_progress: "default", returning: "outline", completed: "secondary", overdue: "destructive", cancelled: "secondary",
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      await updateInvestment(investment.id, { status: newStatus as Investment["status"] });
      show("Статус обновлён", { type: "success" });
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Удалить инвестицию?")) return;
    setLoading(true);
    try {
      await deleteInvestment(investment.id);
      show("Удалено", { type: "success" });
      router.push("/investors/investments");
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReceipt = async () => {
    if (!receiptForm.amount) return;
    setLoading(true);
    try {
      await createTransaction({
        investment_id: investment.id,
        transaction_type: "receipt",
        amount: Math.round(parseFloat(receiptForm.amount) * 100),
        transaction_date: receiptForm.date,
        document_number: receiptForm.documentNumber || undefined,
      });
      show("Поступление зарегистрировано", { type: "success" });
      setShowReceiptDialog(false);
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    const principal = returnForm.principal ? Math.round(parseFloat(returnForm.principal) * 100) : 0;
    const interest = returnForm.interest ? Math.round(parseFloat(returnForm.interest) * 100) : 0;
    if (principal === 0 && interest === 0) return;

    setLoading(true);
    try {
      if (principal > 0) {
        await createTransaction({
          investment_id: investment.id,
          transaction_type: "return_principal",
          amount: principal,
          transaction_date: returnForm.date,
          document_number: returnForm.documentNumber || undefined,
        });
      }
      if (interest > 0) {
        await createTransaction({
          investment_id: investment.id,
          transaction_type: "return_interest",
          amount: interest,
          transaction_date: returnForm.date,
          document_number: returnForm.documentNumber || undefined,
        });
      }
      show("Возврат зарегистрирован", { type: "success" });
      setShowReturnDialog(false);
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const transactionTypeLabels: Record<string, string> = {
    receipt: "Получение",
    return_principal: "Возврат долга",
    return_interest: "Возврат процентов",
    penalty: "Пеня",
    adjustment: "Корректировка",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/investors/investments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{investment.investment_number}</h1>
            <p className="text-muted-foreground">{investment.source?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariants[investment.status] || "secondary"} className="text-sm">
            {INVESTMENT_STATUS_LABELS[investment.status]}
          </Badge>
          {["draft", "cancelled"].includes(investment.status) && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {isOverdue && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-destructive">
              Просрочено на {Math.abs(daysLeft)} дней! К возврату: {formatMoney(totalRemaining)}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Сумма инвестиции</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(investment.approved_amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Проценты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatMoney(investment.interest_amount)}</div>
            <div className="text-xs text-muted-foreground">
              {investment.interest_rate}% {INTEREST_TYPE_LABELS[investment.interest_type]}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">К возврату</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(investment.total_return_amount)}</div>
          </CardContent>
        </Card>
        <Card className={cn(isOverdue ? "border-destructive" : daysLeft <= 7 ? "border-orange-500" : "")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Срок возврата</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date(investment.due_date).toLocaleDateString("ru-RU")}</div>
            <div className={cn("text-xs", isOverdue ? "text-destructive" : daysLeft <= 7 ? "text-orange-600" : "text-muted-foreground")}>
              {isOverdue ? `Просрочено ${Math.abs(daysLeft)} дн.` : `Осталось ${daysLeft} дн.`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Прогресс возврата</span>
            <span className="text-lg">{Math.round(paidPercent)}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={paidPercent} className="h-3" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
              <span>Возвращено основного долга:</span>
              <span className="font-bold">{formatMoney(investment.returned_principal)}</span>
            </div>
            <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
              <span>Возвращено процентов:</span>
              <span className="font-bold">{formatMoney(investment.returned_interest)}</span>
            </div>
            <div className="flex justify-between p-3 bg-primary/10 rounded-lg">
              <span>Остаток к возврату:</span>
              <span className="font-bold text-primary">{formatMoney(totalRemaining)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        {investment.status === "draft" && (
          <Button onClick={() => handleStatusChange("requested")} disabled={loading}>
            Отправить запрос
          </Button>
        )}
        {investment.status === "requested" && (
          <Button onClick={() => handleStatusChange("approved")} disabled={loading}>
            Одобрено
          </Button>
        )}
        {investment.status === "approved" && (
          <Button onClick={() => setShowReceiptDialog(true)} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Получение средств
          </Button>
        )}
        {["received", "in_progress", "returning"].includes(investment.status) && (
          <Button onClick={() => setShowReturnDialog(true)} disabled={loading}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Зарегистрировать возврат
          </Button>
        )}
        {totalRemaining <= 0 && investment.status !== "completed" && (
          <Button onClick={() => handleStatusChange("completed")} variant="outline" disabled={loading}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Завершить
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Детали</TabsTrigger>
          <TabsTrigger value="transactions">Операции ({transactions.length})</TabsTrigger>
          <TabsTrigger value="schedule">График ({schedule.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Дата договора:</span>
                  <span>{new Date(investment.investment_date).toLocaleDateString("ru-RU")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Срок:</span>
                  <span>{investment.period_days} дней</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ставка:</span>
                  <span>{investment.interest_rate}% ({INTEREST_TYPE_LABELS[investment.interest_type]})</span>
                </div>
              </div>
              <div className="space-y-3">
                {investment.tender && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Тендер:</span>
                    <span>{investment.tender.name}</span>
                  </div>
                )}
                {investment.purpose && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Назначение:</span>
                    <span>{investment.purpose}</span>
                  </div>
                )}
                {investment.notes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Примечания:</span>
                    <span>{investment.notes}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Документ</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Нет операций
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.transaction_date).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell>{transactionTypeLabels[tx.transaction_type] || tx.transaction_type}</TableCell>
                      <TableCell>{tx.document_number || "—"}</TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        tx.transaction_type === "receipt" ? "text-green-600" : "text-orange-600"
                      )}>
                        {tx.transaction_type === "receipt" ? "+" : "−"}{formatMoney(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Основной долг</TableHead>
                  <TableHead className="text-right">Проценты</TableHead>
                  <TableHead className="text-right">Всего</TableHead>
                  <TableHead className="text-right">Оплачено</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      График не создан
                    </TableCell>
                  </TableRow>
                ) : (
                  schedule.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.payment_number}</TableCell>
                      <TableCell>{new Date(item.scheduled_date).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.principal_amount)}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.interest_amount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(item.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.paid_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "paid" ? "default" : item.status === "overdue" ? "destructive" : "outline"}>
                          {item.status === "paid" ? "Оплачен" : item.status === "partial" ? "Частично" : item.status === "overdue" ? "Просрочен" : "Ожидает"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Получение средств</DialogTitle>
            <DialogDescription>Регистрация поступления инвестиции</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сумма (₽)</Label>
              <Input
                type="number"
                value={receiptForm.amount}
                onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                placeholder={(investment.approved_amount / 100).toString()}
              />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={receiptForm.date}
                onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Номер документа</Label>
              <Input
                value={receiptForm.documentNumber}
                onChange={(e) => setReceiptForm({ ...receiptForm, documentNumber: e.target.value })}
                placeholder="П/п №..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Отмена</Button>
            <Button onClick={handleReceipt} disabled={loading}>Подтвердить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Регистрация возврата</DialogTitle>
            <DialogDescription>
              Остаток: {formatMoney(remainingPrincipal)} + {formatMoney(remainingInterest)} процентов
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Основной долг (₽)</Label>
              <Input
                type="number"
                value={returnForm.principal}
                onChange={(e) => setReturnForm({ ...returnForm, principal: e.target.value })}
                placeholder={(remainingPrincipal / 100).toString()}
              />
            </div>
            <div className="space-y-2">
              <Label>Проценты (₽)</Label>
              <Input
                type="number"
                value={returnForm.interest}
                onChange={(e) => setReturnForm({ ...returnForm, interest: e.target.value })}
                placeholder={(remainingInterest / 100).toString()}
              />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={returnForm.date}
                onChange={(e) => setReturnForm({ ...returnForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Номер документа</Label>
              <Input
                value={returnForm.documentNumber}
                onChange={(e) => setReturnForm({ ...returnForm, documentNumber: e.target.value })}
                placeholder="П/п №..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>Отмена</Button>
            <Button onClick={handleReturn} disabled={loading}>Зарегистрировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
